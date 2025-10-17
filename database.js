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
    await db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');

    try {
        const dirEntries = await fs.readdir(migrationsDir, { withFileTypes: true });
        const migrationFiles = dirEntries
            .filter(dirent => dirent.isFile() && dirent.name.endsWith('.sql'))
            .map(dirent => dirent.name)
            .sort();

        const appliedMigrations = await db.all('SELECT name FROM migrations');
        const appliedMigrationNames = appliedMigrations.map(m => m.name);
        const pendingMigrations = migrationFiles.filter(file => !appliedMigrationNames.includes(file));

        if (pendingMigrations.length === 0) {
            return;
        }

        for (const migrationFile of pendingMigrations) {
            try {
                const filePath = path.join(migrationsDir, migrationFile);
                const sql = await fs.readFile(filePath, 'utf8');
                
                await db.exec('BEGIN TRANSACTION');
                await db.exec(sql);
                await db.run('INSERT INTO migrations (name) VALUES (?)', migrationFile);
                await db.exec('COMMIT');
            } catch (error) {
                await db.exec('ROLLBACK');
                console.error(`Failed to apply migration ${migrationFile}:`, error);
                throw error;
            }
        }
    } catch (error) {
        console.error(`Could not read migrations directory: ${migrationsDir}`, error);
        throw error;
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