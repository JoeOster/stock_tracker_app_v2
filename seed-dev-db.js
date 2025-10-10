// This script resets the development database with simple, verifiable sample data.
const setupDatabase = require('./database');

async function seed() {
    console.log("Connecting to the development database...");
    const db = await setupDatabase();
    console.log("Connection successful. Seeding simple sample data...");

    try {
        await db.exec('BEGIN TRANSACTION');

        // 1. Clear existing data
        console.log("Clearing old data...");
        await db.run("DELETE FROM transactions");
        await db.run("DELETE FROM pending_orders");
        await db.run("DELETE FROM snapshots");
        // Clear all account holders except for the protected primary account (ID=1)
        await db.run("DELETE FROM account_holders WHERE id > 1");

        // 2. Insert New Account Holders as requested
        console.log("Inserting 'green' and 'blue' account holders...");
        const green = await db.run("INSERT INTO account_holders (name) VALUES ('green')");
        const blue = await db.run("INSERT INTO account_holders (name) VALUES ('blue')");
        const greenId = green.lastID;
        const blueId = blue.lastID;

        // 3. Insert Simple, Verifiable Transactions
        console.log("Inserting sample transactions with simple math...");
        // A simple BUY for 'green'
        await db.run("INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('GRN', 'Fidelity', 'BUY', 10, 100.00, '2025-09-10', 10, 10, ?)", greenId);
        
        // A BUY and SELL for 'blue' to test P&L (Profit = (60-50)*5 = $50)
        const blueBuy = await db.run("INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('BLU', 'E-Trade', 'BUY', 20, 50.00, '2025-09-15', 20, 20, ?)", blueId);
        await db.run("INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES ('BLU', 'E-Trade', 'SELL', 5, 60.00, '2025-10-01', ?, ?)", blueBuy.lastID, blueId);

        // 4. Insert Simple Pending Order
        console.log("Inserting sample pending order...");
        await db.run("INSERT INTO pending_orders (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date) VALUES (?, 'GRN', 'Fidelity', 'BUY_LIMIT', 90.00, 10, '2025-10-05')", greenId);

        // 5. Insert Simple Snapshots
        console.log("Inserting sample snapshots...");
        await db.run("INSERT INTO account_snapshots (exchange, snapshot_date, value, account_holder_id) VALUES ('E-Trade', '2025-09-01', 1000.00, ?)", blueId);
        await db.run("INSERT INTO account_snapshots (exchange, snapshot_date, value, account_holder_id) VALUES ('E-Trade', '2025-10-01', 1200.00, ?)", blueId);

        await db.exec('COMMIT');
        console.log("✅ Simple sample data has been successfully seeded!");

    } catch (error) {
        await db.exec('ROLLBACK');
        console.error("❌ Failed to seed database:", error);
    } finally {
        await db.close();
    }
}

seed();