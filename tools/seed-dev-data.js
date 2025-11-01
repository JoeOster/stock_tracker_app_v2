console.log('[SEEDER] Starting seed script...'); // Added this line to confirm execution

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Define the database path
const dbPath = path.resolve(__dirname, '..', 'development.db');

// --- Sample Data ---
const accountHolders = [
    { id: 1, name: 'Primary' }, // Will be ignored if it exists
    { id: 2, name: 'Secondary' } // Will be added
];

const exchanges = [
    { name: 'Fidelity' },
    { name: 'Robinhood' },
    { name: 'E-Trade' },
    { name: 'Other' } // Will be ignored if it exists
];

const adviceSources = [
    { id: 1, name: 'A. Z. Penn', type: 'Person', description: 'Swing trading book author' },
    { id: 2, name: 'MarketWatch', type: 'Website', url: 'https://www.marketwatch.com' },
    { id: 3, name: 'My Trading Buddy', type: 'Person', details: JSON.stringify({ contact_app_type: 'Signal', contact_app_handle: 'buddy.01' }) }
];

// Link sources to users (Primary gets all, Secondary gets one)
const sourceLinks = [
    { holder_id: 1, source_id: 1 },
    { holder_id: 1, source_id: 2 },
    { holder_id: 1, source_id: 3 },
    { holder_id: 2, source_id: 2 } // Secondary only gets MarketWatch
];

const transactions = [
    // --- Primary's Data (Holder 1) ---
    {
        account_holder_id: 1,
        ticker: 'AAPL',
        exchange: 'Fidelity',
        transaction_type: 'BUY',
        transaction_date: '2023-01-15T10:00:00Z',
        price: 150.00,
        quantity: 10,
        original_quantity: 10,
        quantity_remaining: 10,
        advice_source_id: 1,
        limit_price_up: 180.00,
        limit_price_down: 140.00
    },
    {
        account_holder_id: 1,
        ticker: 'MSFT',
        exchange: 'Fidelity',
        transaction_type: 'BUY',
        transaction_date: '2023-03-22T11:00:00Z',
        price: 275.50,
        quantity: 5,
        original_quantity: 5,
        quantity_remaining: 5,
        advice_source_id: 2
    },
    {
        account_holder_id: 1,
        ticker: 'GOOG',
        exchange: 'Robinhood',
        transaction_type: 'BUY',
        transaction_date: '2023-05-10T12:00:00Z',
        price: 110.20,
        quantity: 10,
        original_quantity: 10,
        quantity_remaining: 5, // Partially sold
        advice_source_id: 1
    },
    {
        // The SELL transaction
        account_holder_id: 1,
        ticker: 'GOOG',
        exchange: 'Robinhood',
        transaction_type: 'SELL',
        transaction_date: '2023-08-01T14:00:00Z',
        price: 130.00,
        quantity: 5,
        parent_buy_id: 3 // Links to the GOOG buy (id: 3)
    }
];

/**
 * Inserts sample data into the database.
 * @param {import('sqlite').Database} db - The database connection.
 */
async function insertData(db) {
    console.log('[SEEDER] Inserting data...');
    
    // --- MODIFIED: Use INSERT OR IGNORE to prevent crashes on duplicate data ---
    const holderStmt = await db.prepare('INSERT OR IGNORE INTO account_holders (id, name) VALUES (?, ?)');
    for (const holder of accountHolders) {
        await holderStmt.run(holder.id, holder.name);
    }
    await holderStmt.finalize();
    console.log(`[SEEDER] Account holders synced.`);

    const exchStmt = await db.prepare('INSERT OR IGNORE INTO exchanges (name) VALUES (?)');
    for (const ex of exchanges) {
        await exchStmt.run(ex.name);
    }
    await exchStmt.finalize();
    console.log(`[SEEDER] Exchanges synced.`);
    // --- END MODIFICATION ---

    const sourceStmt = await db.prepare('INSERT OR IGNORE INTO advice_sources (id, name, type, description, url, details) VALUES (?, ?, ?, ?, ?, ?)');
    for (const src of adviceSources) {
        await sourceStmt.run(src.id, src.name, src.type, src.description, src.url, src.details);
    }
    await sourceStmt.finalize();
    console.log(`[SEEDER] Inserted ${adviceSources.length} global advice sources.`);

    const linkStmt = await db.prepare('INSERT OR IGNORE INTO account_source_links (account_holder_id, advice_source_id) VALUES (?, ?)');
    for (const link of sourceLinks) {
        await linkStmt.run(link.holder_id, link.source_id);
    }
    await linkStmt.finalize();
    console.log(`[SEEDER] Inserted ${sourceLinks.length} account-source links.`);

    const txStmt = await db.prepare(`
        INSERT INTO transactions (
            account_holder_id, ticker, exchange, transaction_type, transaction_date, 
            price, quantity, original_quantity, quantity_remaining, 
            advice_source_id, limit_price_up, limit_price_down, parent_buy_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const tx of transactions) {
        await txStmt.run(
            tx.account_holder_id,
            tx.ticker,
            tx.exchange,
            tx.transaction_type,
            tx.transaction_date,
            tx.price,
            tx.quantity,
            tx.original_quantity,
            tx.quantity_remaining,
            tx.advice_source_id,
            tx.limit_price_up,
            tx.limit_price_down,
            tx.parent_buy_id
        );
    }
    await txStmt.finalize();
    console.log(`[SEEDER] Inserted ${transactions.length} transactions.`);

    console.log('[SEEDER] Data seeding complete!');
}

/**
 * Main function to open DB and run seeding.
 */
async function seedDatabase() {
    let db;
    try {
        console.log(`[SEEDER] Connecting to database at: ${dbPath}`);
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Check if DB is empty by checking transactions
        const check = await db.get('SELECT COUNT(*) as count FROM transactions');
        if (check.count > 0) {
            console.log('[SEEDER] Database already contains transactions. Seeding aborted.');
            await db.close();
            return;
        }

        console.log('[SEEDER] Database is empty. Proceeding with seeding...');
        await insertData(db);
        await db.close();
        console.log('[SEEDER] Database connection closed.');

    } catch (err) {
        console.error(`[SEEDER FATAL] Error seeding database: ${err.message}`);
        if (db) {
            await db.close();
        }
    }
}

seedDatabase();

