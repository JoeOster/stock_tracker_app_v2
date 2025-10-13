// tools/inject-data.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
// Correctly require database.js from the project root
const setupDatabase = require(path.resolve(__dirname, '..', 'database.js'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function inject() {
    // Get account holder and CSV info from command-line arguments
    const accountHolderIdArg = process.argv[2];
    const accountHolderNameArg = process.argv[3];
    const csvFileNameArg = process.argv[4];

    if (!csvFileNameArg) {
        console.error('Error: Please provide a CSV filename.');
        process.exit(1);
    }

    const db = await setupDatabase();
    // The CSV file is located relative to the project root, not the tools directory
    const csvFile = path.resolve(__dirname, '..', csvFileNameArg);
    let accountHolderId;

    try {
        if (!fs.existsSync(csvFile)) {
            throw new Error(`The specified CSV file was not found: ${csvFileNameArg}`);
        }

        // Use command-line args if provided, otherwise prompt interactively
        if (accountHolderIdArg && accountHolderNameArg) {
            accountHolderId = accountHolderIdArg;
            console.log(`\nUsing account holder '${accountHolderNameArg}' (ID: ${accountHolderId}) specified from command line.`);
            // Ensure the user exists
            const existingHolder = await db.get('SELECT id FROM account_holders WHERE id = ?', accountHolderId);
            if (!existingHolder) {
                console.log("Account holder not found. Creating...");
                await db.run('INSERT OR IGNORE INTO account_holders (id, name) VALUES (?, ?)', [accountHolderId, accountHolderNameArg]);
                console.log(`'${accountHolderNameArg}' created successfully.`);
            }
        } else {
            const accountHolders = await db.all('SELECT * FROM account_holders ORDER BY id');
            if (accountHolders.length > 0) {
                console.log('\n--- Select an Existing Account Holder ---');
                accountHolders.forEach(holder => {
                    console.log(`${holder.id}: ${holder.name}`);
                });
                console.log('N: Create a new account holder');
                const answer = await new Promise(resolve => rl.question('Choose an option: ', resolve));
                if (answer.toUpperCase() === 'N') {
                    accountHolderId = await createNewAccountHolder(db);
                } else {
                    const selectedHolder = accountHolders.find(h => h.id == answer);
                    if (selectedHolder) {
                        accountHolderId = selectedHolder.id;
                        console.log(`You selected '${selectedHolder.name}'.`);
                    } else {
                        throw new Error('Invalid selection.');
                    }
                }
            } else {
                console.log('\nNo account holders found. You will be prompted to create one.');
                accountHolderId = await createNewAccountHolder(db);
            }
        }

        await injectData(db, csvFile, accountHolderId);

    } catch (error) {
        console.error('An error occurred:', error.message);
        if (db) await db.exec('ROLLBACK');
    } finally {
        if (db) await db.close();
        rl.close();
    }
}

async function createNewAccountHolder(db) {
    const newName = await new Promise(resolve => rl.question('Enter the name for the new account holder: ', resolve));
    if (!newName.trim()) {
        throw new Error('Account holder name cannot be empty.');
    }
    const result = await db.run('INSERT INTO account_holders (name) VALUES (?)', newName.trim());
    console.log(`Account holder '${newName.trim()}' created successfully.`);
    return result.lastID;
}

async function injectData(db, csvFile, accountHolderId) {
    await db.exec('BEGIN TRANSACTION');
    console.log(`\nImporting data from ${path.basename(csvFile)}...`);
    const csvData = fs.readFileSync(csvFile, 'utf8');
    const rows = csvData.split('\n').slice(1).filter(Boolean); // Read lines, skip header, and remove empty lines

    rows.sort((a, b) => new Date(a.split(',')[0]) - new Date(b.split(',')[0]));

    let recordCount = 0;
    for (const row of rows) {
        if (!row) continue;
        const [date, ticker, exchange, type, quantityStr, priceStr] = row.split(',');
        const quantity = parseFloat(quantityStr);
        const price = parseFloat(priceStr);

        if (type.toUpperCase() === 'BUY') {
            await db.run(
                'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [date, ticker, exchange, type, quantity, price, accountHolderId, quantity, quantity]
            );
        } else if (type.toUpperCase() === 'SELL') {
            let sellQuantity = quantity;
            const openLots = await db.all(
                "SELECT * FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 ORDER BY transaction_date ASC",
                [ticker, accountHolderId]
            );

            if (openLots.length === 0) {
                console.warn(`\x1b[33m[WARNING] No open BUY lot found for SELL transaction of ${ticker} on ${date}. This SELL will be skipped.\x1b[0m`);
                continue;
            }

            for (const lot of openLots) {
                if (sellQuantity <= 0) break;
                
                const sellableQuantity = Math.min(sellQuantity, lot.quantity_remaining);

                await db.run(
                    'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [date, ticker, exchange, type, sellableQuantity, price, accountHolderId, lot.id]
                );

                await db.run(
                    'UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
                    [sellableQuantity, lot.id]
                );

                sellQuantity -= sellableQuantity;
            }
        }
        recordCount++;
    }
    
    await db.exec('COMMIT');
    console.log(`Successfully processed ${recordCount} records for account holder.`);
}

inject();