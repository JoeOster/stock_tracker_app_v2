const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

/**
 * Runs all pending database migrations.
 * @param {import('sqlite').Database} db - The database instance.
 * @param {function(...any): void} log - The logging function to use.
 */
async function runMigrations(db, log) {
  log('[Migrations] Starting migration check...');
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
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.sql'))
      .map((dirent) => dirent.name)
      .sort();

    log(
      `[Migrations] Found migration files: ${migrationFiles.join(', ') || 'None'}`
    );

    const appliedMigrations = await db.all('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map((m) => m.name);
    const pendingMigrations = migrationFiles.filter(
      (file) => !appliedMigrationNames.includes(file)
    );

    if (pendingMigrations.length === 0) {
      log(
        '[Migrations] No pending migrations found. Database schema is up-to-date.'
      );
      return;
    }

    log(
      `[Migrations] Pending migrations to apply: ${pendingMigrations.join(', ')}`
    );

    for (const migrationFile of pendingMigrations) {
      try {
        const filePath = path.join(migrationsDir, migrationFile);
        const sql = await fs.readFile(filePath, 'utf8');

        log(`[Migrations] Applying migration: ${migrationFile}...`);

        await db.exec('BEGIN TRANSACTION');
        await db.exec(sql);
        await db.run('INSERT INTO migrations (name) VALUES (?)', migrationFile);
        await db.exec('COMMIT');

        log(`[Migrations] Successfully applied ${migrationFile}.`);
      } catch (error) {
        await db.exec('ROLLBACK');
        console.error(
          `[Migrations] Failed to apply migration ${migrationFile}:`,
          error
        );
        throw error; // Re-throw error to stop startup if a migration fails
      }
    }
    log('[Migrations] All pending migrations applied successfully.');
  } catch (error) {
    console.error(
      `[Migrations] Could not read migrations directory or apply migrations: ${migrationsDir}`,
      error
    );
    throw error; // Re-throw error to potentially stop server startup
  }
}

/**
 * Initializes the database connection and runs migrations.
 * @returns {Promise<import('sqlite').Database>} The initialized database instance.
 */
async function initializeDatabase() {
  const log = process.env.NODE_ENV !== 'test' ? console.log : () => {};

  const isProduction = process.env.NODE_ENV === 'production';
  const dbFileName = isProduction ? 'prod-Stratlab.db' : 'dev-Stratlab.db';
  const dbPath = path.resolve(__dirname, dbFileName);

  log(`[Database] Connecting to database at: ${dbPath}`);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  log('[Database] Connection successful. Running migrations...');

  await runMigrations(db, log);

  log('[Database] Initialization complete.');
  return db;
}

/**
 * Retrieves all watchlist items for a given user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of watchlist items.
 */
async function getWatchlist(userId) {
  const db = await initializeDatabase();
  return db.all('SELECT * FROM watchlist WHERE user_id = ?', userId);
}

/**
 * Adds a new ticker to the user's watchlist.
 * @param {number} userId - The ID of the user.
 * @param {string} ticker - The ticker symbol to add.
 * @returns {Promise<void>} A promise that resolves when the item is added.
 */
async function addWatchlistItem(userId, ticker) {
  const db = await initializeDatabase();
  await db.run(
    'INSERT INTO watchlist (user_id, ticker) VALUES (?, ?)',
    userId,
    ticker
  );
}

/**
 * Removes a ticker from the user's watchlist.
 * @param {number} userId - The ID of the user.
 * @param {string} ticker - The ticker symbol to remove.
 * @returns {Promise<void>} A promise that resolves when the item is removed.
 */
async function removeWatchlistItem(userId, ticker) {
  const db = await initializeDatabase();
  await db.run(
    'DELETE FROM watchlist WHERE user_id = ? AND ticker = ?',
    userId,
    ticker
  );
}

module.exports = {
  initializeDatabase,
  getWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
};
