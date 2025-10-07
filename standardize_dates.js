// standardize_dates.js
// A one-time script to standardize all date formats in the database to YYYY-MM-DD.

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function standardizeDates() {
    console.log("Connecting to the database...");
    const db = await open({
        filename: './tracker.db',
        driver: sqlite3.Database
    });
    console.log("Connection successful.");

    try {
        console.log("Fetching all transactions to standardize dates...");
        const transactions = await db.all('SELECT id, transaction_date FROM transactions');
        
        let updatedCount = 0;
        const updateStmt = await db.prepare('UPDATE transactions SET transaction_date = ? WHERE id = ?');

        for (const tx of transactions) {
            try {
                // Attempt to parse the date, this is robust to many formats like MM/DD/YYYY
                const dateObj = new Date(tx.transaction_date);

                // Check if the date is valid. Invalid dates will result in NaN.
                if (isNaN(dateObj.getTime())) {
                    console.warn(`Could not parse invalid date for transaction ID ${tx.id}: "${tx.transaction_date}"`);
                    continue;
                }
                
                // Format the date to YYYY-MM-DD.
                // This logic correctly handles timezones to prevent the date from shifting.
                const timezoneOffset = dateObj.getTimezoneOffset() * 60000; //offset in milliseconds
                const localDate = new Date(dateObj.getTime() - timezoneOffset);
                const standardizedDate = localDate.toISOString().split('T')[0];

                // Only update if the format is actually different
                if (tx.transaction_date !== standardizedDate) {
                    await updateStmt.run(standardizedDate, tx.id);
                    updatedCount++;
                }
            } catch (e) {
                 console.error(`Error processing transaction ID ${tx.id}:`, e);
            }
        }

        await updateStmt.finalize();

        if (updatedCount > 0) {
            console.log(`Successfully standardized the date format for ${updatedCount} records.`);
        } else {
            console.log("All date formats are already standard. No records were updated.");
        }

    } catch (error) {
        console.error("An error occurred while standardizing dates:", error);
    } finally {
        await db.close();
        console.log("Database connection closed.");
    }
}

standardizeDates();
