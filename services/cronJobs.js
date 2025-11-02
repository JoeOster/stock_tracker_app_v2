// /services/cronJobs.js
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { getPrices } = require('./priceService'); // Use the centralized price service

// Helper to format currency
const formatCurrency = (num) => {
    if (num === null || num === undefined || isNaN(num)) { return '--'; }
    // Basic formatting, consider using Intl.NumberFormat for more robustness if needed
    return `$${Number(num).toFixed(2)}`;
};


/**
 * Backs up the production database.
 * @param {import('sqlite').Database} db - The database instance.
 * @param {function(string): void} log - Logging function.
 */
async function backupDatabase(db, log) {
    // ... (this function is correct) ...
    // Determine database path based on environment
    const dbPath = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'production' ? './production.db' : './development.db');

    // Determine backup directory based on environment
    let backupDir;
    if (process.env.NODE_ENV === 'production') {
        // Linux/Pi path (Ensure this path exists or script creates it)
        backupDir = '/home/pi/portfolio_manager_bu/v3/prod'; // Example path, adjust if needed
    } else {
        // Windows development path
        backupDir = 'C:\\portfolio_manager_bu\\v3\\dev'; // Ensure this matches your dev backup script
    }

    try {
        await fs.mkdir(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `${timestamp}_backup.db`);
        await fs.copyFile(dbPath, backupFile);
        log(`[Cron Backup] Database backed up successfully to ${backupFile}`);

        // Optional: Clean up old backups (e.g., keep last 7 days)
        const files = await fs.readdir(backupDir);
        const dbBackups = files
            .filter(f => f.endsWith('_backup.db'))
            .sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

        if (dbBackups.length > 7) {
            const filesToDelete = dbBackups.slice(7);
            for (const fileToDelete of filesToDelete) {
                await fs.unlink(path.join(backupDir, fileToDelete));
                log(`[Cron Backup] Deleted old backup: ${fileToDelete}`);
            }
        }

    } catch (error) {
        console.error(`[Cron Backup] Failed to backup database to ${backupDir}: ${error.message}`);
    }
}

/**
 * --- MODIFIED (Task 1.1) ---
 * Captures the end-of-day prices for all *currently held* tickers
 * if historical price is missing for that day.
 * @param {import('sqlite').Database} db - The database instance.
 * @param {string} dateToProcess - The date to process in YYYY-MM-DD format.
 * @param {function(string): void} log - Logging function.
 */
async function captureEodPrices(db, dateToProcess, log) { // <-- ADDED log
    try {
        // --- THIS QUERY IS NOW UPDATED ---
        // Find all unique tickers from open 'BUY' lots
        // for which we don't already have a historical price recorded for that ticker on that date.
        const tickersNeedingEod = await db.all(`
            SELECT ticker
            FROM transactions
            WHERE transaction_type = 'BUY'
              AND COALESCE(quantity_remaining, 0) > 0.00001
              AND NOT EXISTS (
                  SELECT 1 FROM historical_prices hp
                  WHERE hp.ticker = transactions.ticker AND hp.date = DATE(?)
              )
            GROUP BY ticker
        `, [dateToProcess]);
        // --- END QUERY UPDATE ---

        const tickers = tickersNeedingEod.map(row => row.ticker);

        if (tickers.length === 0) {
            log(`[Cron EOD] No new EOD prices needed for held tickers on ${dateToProcess}.`); // <-- FIX
            return;
        }

        log(`[Cron EOD] Fetching EOD prices for held tickers on ${dateToProcess}: ${tickers.join(', ')}`); // <-- FIX

        // Use getPrices - priority 3 (high) for EOD capture
        const priceData = await getPrices(tickers, 3);

        for (const ticker of tickers) {
            const priceInfo = priceData[ticker];
            if (priceInfo && typeof priceInfo.price === 'number') {
                await db.run(
                    'INSERT OR IGNORE INTO historical_prices (ticker, date, close_price) VALUES (?, ?, ?)',
                    [ticker, dateToProcess, priceInfo.price]
                );
                log(`[Cron EOD] Saved EOD price for ${ticker} on ${dateToProcess}: ${priceInfo.price}`); // <-- FIX
            } else {
                log(`[Cron EOD] Could not retrieve EOD price for ${ticker} on ${dateToProcess}.`); // <-- FIX (changed from console.warn)
            }
        }
    } catch (error) {
        console.error(`[Cron EOD] Error capturing EOD prices for ${dateToProcess}: ${error.message}`);
    }
}
// --- END MODIFICATION ---


/**
 * Watches for pending order limits and journal entry targets/stops, creating notifications.
 * @param {import('sqlite').Database} db - The database instance.
 * @param {function(string): void} log - Logging function.
 */
async function runWatcher(db, log) { // Renamed from runOrderWatcher
    try {
        log('[Cron Watcher] Starting watcher cycle...');
        // --- Fetch Active Items ---
        const activeBuyOrders = await db.all("SELECT * FROM pending_orders WHERE status = 'ACTIVE' AND order_type = 'BUY_LIMIT'");
        // Fetch journal entries with targets OR stops
        const openJournalEntries = await db.all("SELECT * FROM journal_entries WHERE status = 'OPEN' AND (target_price IS NOT NULL OR stop_loss_price IS NOT NULL)");

        // --- Gather Unique Tickers ---
        const tickersToWatch = [...new Set([
            ...activeBuyOrders.map(o => o.ticker),
            ...openJournalEntries.map(j => j.ticker) // Added journal tickers
        ])];

        if (tickersToWatch.length === 0) {
             log('[Cron Watcher] No active orders or journal entries with targets/stops to watch.');
             return;
        }

        log(`[Cron Watcher] Watching tickers: ${tickersToWatch.join(', ')}`);

        // --- Fetch Current Prices ---
        const priceData = await getPrices(tickersToWatch, 7); // Moderate priority

        // --- Process Pending Buy Orders ---
        for (const order of activeBuyOrders) {
            const currentPriceInfo = priceData[order.ticker];
            if (!currentPriceInfo || typeof currentPriceInfo.price !== 'number') continue;

            const currentPrice = currentPriceInfo.price;
            if (currentPrice <= order.limit_price) {
                const existingNotification = await db.get(
                    "SELECT id FROM notifications WHERE pending_order_id = ? AND status = 'UNREAD'", // Check specific order ID
                    [order.id]
                );
                if (!existingNotification) {
                    const message = `BUY_LIMIT target of ${formatCurrency(order.limit_price)} met for ${order.ticker}. Current price is ${formatCurrency(currentPrice)}.`;
                    await db.run(
                        "INSERT INTO notifications (account_holder_id, pending_order_id, message) VALUES (?, ?, ?)",
                        [order.account_holder_id, order.id, message]
                    );
                    log(`[Cron Watcher] Notification created for BUY_LIMIT order ID ${order.id} (${order.ticker})`);
                }
            }
        }

        // --- Process Open Journal Entries ---
        for (const entry of openJournalEntries) {
            const currentPriceInfo = priceData[entry.ticker];
            if (!currentPriceInfo || typeof currentPriceInfo.price !== 'number') continue;

            const currentPrice = currentPriceInfo.price;
            let targetMet = null; // null, 'target', 'stop'
            let hitPrice = null; // Store the price that was hit

            // Check if target price is hit (adjust logic if SELL entries are added later)
            if (entry.target_price && currentPrice >= entry.target_price) {
                targetMet = 'target';
                hitPrice = entry.target_price;
            }
            // Check if stop loss is hit (check only if target wasn't already met)
            else if (entry.stop_loss_price && currentPrice <= entry.stop_loss_price) {
                targetMet = 'stop';
                hitPrice = entry.stop_loss_price;
            }

            if (targetMet) {
                // Target met, check if notification already exists for this journal entry ID
                const existingNotification = await db.get(
                    "SELECT id FROM notifications WHERE journal_entry_id = ? AND status = 'UNREAD'", // Check specific journal entry ID
                    [entry.id]
                );

                if (!existingNotification) {
                    let message = '';
                    if (targetMet === 'target') {
                        message = `Journal Target Price of ${formatCurrency(hitPrice)} met for ${entry.ticker}. Current price is ${formatCurrency(currentPrice)}.`;
                    } else { // targetMet === 'stop'
                        message = `Journal Stop Loss Price of ${formatCurrency(hitPrice)} hit for ${entry.ticker}. Current price is ${formatCurrency(currentPrice)}.`;
                    }
                    // Insert notification using the new journal_entry_id column
                    await db.run(
                        "INSERT INTO notifications (account_holder_id, journal_entry_id, message) VALUES (?, ?, ?)", // Added journal_entry_id
                        [entry.account_holder_id, entry.id, message]
                    );
                     log(`[Cron Watcher] Notification created for Journal Entry ID ${entry.id} (${entry.ticker} hit ${targetMet})`);
                }
            }
        }
        log('[Cron Watcher] Watcher cycle finished.');

    } catch (error) {
        // Use console.error for errors
        console.error(`[Cron Error] runWatcher failed: ${error.message}\n${error.stack}`);
    }
}

/**
 * Initializes all cron jobs for the application.
 * @param {import('sqlite').Database} db - The database instance.
 * @param {function(string): void} log - Logging function.
 */
function setupCronJobs(db, log) {
    // Only schedule jobs if NOT in test environment
    if (process.env.NODE_ENV !== 'test') {

        // --- EOD Price Capture for Sold Stocks ---
        cron.schedule('2 16 * * 1-5', () => { // M-F at 4:02 PM ET
            log('[Cron EOD] Triggered EOD price capture.');
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            captureEodPrices(db, today, log); // <-- ADDED log
        }, { timezone: "America/New_York" });

        // --- Order and Journal Watcher ---
        cron.schedule('*/5 9-19 * * 1-5', () => { // M-F, every 5 mins, 9am-7:55pm ET
            log('[Cron Watcher] Triggered watcher.');
            runWatcher(db, log); // Pass db and log
        }, {
            timezone: "America/New_York"
        });

        // --- Nightly Database Backup ---
        cron.schedule('0 2 * * *', () => { // Daily at 2:00 AM ET
             log('[Cron Backup] Triggered nightly backup.');
             backupDatabase(db, log); // Pass db and log
        }, {
            timezone: "America/New_York"
        });

        log("Cron jobs scheduled: EOD Price Capture, Order/Journal Watcher, Nightly Backups.");
    } else {
        log("Cron jobs skipped in test environment.");
    }
}

// Update exports
module.exports = { setupCronJobs, captureEodPrices, runWatcher, backupDatabase };