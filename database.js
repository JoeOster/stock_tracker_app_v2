// database.js - Stable Base Version
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setup() {
    const db = await open({
        filename: './tracker.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            exchange TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            transaction_date TEXT NOT NULL
        )
    `);

    return db;
}

module.exports = setup;