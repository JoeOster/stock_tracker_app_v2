// fix_db.js
// A one-time script to verify and update the database schema and then fix old records.

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function fixDatabase() {
    console.log("Connecting to the database...");
    const db = await open({
        filename: './tracker.db',
        driver: sqlite3.Database
    });
    console.log("Connection successful.");

    try {
        // STEP 1: Verify and, if necessary, repair the database schema directly.
        console.log("Verifying database schema...");
        const tableInfo = await db.all("PRAGMA table_info(transactions);");
        const columnNames = tableInfo.map(col => col.name);

        if (!columnNames.includes('parent_buy_id')) {
            console.log("Adding missing column: parent_buy_id...");
            await db.exec(`ALTER TABLE transactions ADD COLUMN parent_buy_id INTEGER;`);
            console.log("Column 'parent_buy_id' added.");
        }

        if (!columnNames.includes('original_quantity')) {
            console.log("Adding missing column: original_quantity...");
            await db.exec(`ALTER TABLE transactions ADD COLUMN original_quantity REAL;`);
            console.log("Column 'original_quantity' added.");
        }

        if (!columnNames.includes('quantity_remaining')) {
            console.log("Adding missing column: quantity_remaining...");
            await db.exec(`ALTER TABLE transactions ADD COLUMN quantity_remaining REAL;`);
            console.log("Column 'quantity_remaining' added.");
        }

        console.log("Database schema is now up to date.");
        
        // STEP 2: Now that columns are guaranteed to exist, fix the old data.
        console.log("Finding and updating old BUY transactions...");
        
        const result = await db.run(`
            UPDATE transactions 
            SET 
                original_quantity = quantity, 
                quantity_remaining = quantity 
            WHERE 
                transaction_type = 'BUY' AND original_quantity IS NULL;
        `);

        if (result.changes > 0) {
            console.log(`Successfully updated ${result.changes} historical BUY records.`);
            console.log("Your database is now fully compatible with the new tracking system.");
        } else {
            console.log("No old records needed fixing.");
        }

    } catch (error) {
        console.error("An error occurred while fixing the database:", error);
    } finally {
        await db.close();
        console.log("Database connection closed.");
    }
}

fixDatabase();

