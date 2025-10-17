// /database.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

/**
 * Runs all pending database migrations.
 * @param {import('sqlite').Database} db - The database instance.
 */
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
            throw error;
        }
    }
}

/**
 * Initializes the database connection and runs migrations.
 * @returns {Promise<import('sqlite').Database>} The initialized database instance.
 */
async function initializeDatabase() {
    let dbPath;
    if (process.env.DATABASE_PATH) {
        dbPath = process.env.DATABASE_PATH;
    } else if (process.env.NODE_ENV === 'production') {
        dbPath = './production.db';
    } else if (process.env.NODE_ENV === 'test') {
        dbPath = './test.db';
    } else {
        dbPath = './development.db';
    }

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await runMigrations(db);

    return db;
}

module.exports = { initializeDatabase };