// database.js - v3.0 - 2025-10-04 (With Migration System)

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

// --- MIGRATION RUNNER ---
async function runMigrations(db) {
    console.log("Checking for migrations...");
    await db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = await fs.readdir(migrationsDir);
    const appliedMigrations = await db.all('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map(m => m.name);

    const pendingMigrations = migrationFiles
        .filter(file => file.endsWith('.sql') && !appliedMigrationNames.includes(file))
        .sort();

    if (pendingMigrations.length === 0) {
        console.log("Database is up to date.");
        return;
    }

    for (const migrationFile of pendingMigrations) {
        try {
            console.log(`Applying migration: ${migrationFile}...`);
            const filePath = path.join(migrationsDir, migrationFile);
            const sql = await fs.readFile(filePath, 'utf8');
            
            await db.exec('BEGIN TRANSACTION');
            await db.exec(sql);
            await db.run('INSERT INTO migrations (name) VALUES (?)', migrationFile);
            await db.exec('COMMIT');
            
            console.log(`Successfully applied migration: ${migrationFile}`);
        } catch (error) {
            await db.exec('ROLLBACK');
            console.error(`Failed to apply migration ${migrationFile}:`, error);
            throw error; // Stop the server from starting if a migration fails
        }
    }
}


async function setup() {
    const db = await open({
        filename: './tracker.db',
        driver: sqlite3.Database
    });

    // Create base tables if they don't exist
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

    await db.exec(`
        CREATE TABLE IF NOT EXISTS account_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exchange TEXT NOT NULL,
            snapshot_date TEXT NOT NULL,
            value REAL NOT NULL,
            UNIQUE(exchange, snapshot_date)
        )
    `);
    
    // Run migrations to apply any new schema changes
    await runMigrations(db);

    return db;
}

module.exports = setup;