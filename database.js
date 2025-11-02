// /database.js
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
  // --- MODIFICATION: Conditional Logger ---
  // This logger will only print messages if the environment is NOT 'test'.
  const log = process.env.NODE_ENV !== 'test' ? console.log : () => {};
  // --- END MODIFICATION ---

  let dbPath;
  if (process.env.DATABASE_PATH) {
    dbPath = process.env.DATABASE_PATH;
  } else if (process.env.NODE_ENV === 'production') {
    dbPath = './production.db';
  } else if (process.env.NODE_ENV === 'test') {
    dbPath = './test.db'; // Used by tests
  } else {
    // Default to development.db if not specified and not production/test
    dbPath = './development.db';
  }

  log(`[Database] Connecting to database at: ${path.resolve(dbPath)}`);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  log('[Database] Connection successful. Running migrations...');

  await runMigrations(db, log); // Run migrations after connection, passing the conditional logger

  log('[Database] Initialization complete.');
  return db;
}

module.exports = { initializeDatabase };
