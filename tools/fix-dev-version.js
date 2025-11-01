const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'development.db');

/**
 * Manually sets the user_version of the development database.
 */
async function setDevVersion() {
    let db;
    try {
        console.log(`[FIX] Connecting to development database at: ${dbPath}`);
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        console.log('[FIX] Getting current version...');
        const oldVersion = await db.get('PRAGMA user_version');
        console.log(`[FIX] Current user_version is: ${oldVersion.user_version}`);

        if (oldVersion.user_version >= 21) {
            console.log('[FIX] Version is already 21 or higher. No changes needed.');
        } else {
            console.log('[FIX] Setting user_version to 21...');
            await db.exec('PRAGMA user_version = 21');
            console.log('[FIX] Successfully set version to 21.');
        }
        
        await db.close();
        console.log('[FIX] Database connection closed.');

    } catch (err) {
        console.error(`[FIX FAILED] ${err.message}`);
        if (db) {
            await db.close();
        }
    }
}

setDevVersion();