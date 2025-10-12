// services/cronJobs.js
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

/**
 * A simple utility to format a number as currency.
 * @param {number | null | undefined} num - The number to format.
 * @returns {string} The formatted currency string or '--' if input is invalid.
 */
const formatCurrency = (num) => (num ? `$${Number(num).toFixed(2)}` : '--');

/**
 * Backs up the production database to a timestamped file in the /backup directory.
 * This function only runs in the 'production' environment.
 * @returns {Promise<void>}
 */
async function backupDatabase() {
    // Ensure this only runs in the production environment
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Backup] Skipping backup in non-production environment.');
        return;
    }

    console.log('[Backup] Starting nightly database backup...');
    try {
        const dbPath = './production.db';
        const backupDir = './backup';

        // Ensure the backup directory exists
        await fs.mkdir(backupDir, { recursive: true });

        const timestamp = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        const backupFileName = `production-backup-${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFileName);

        await fs.copyFile(dbPath, backupPath);
        console.log(`[Backup] Successfully created backup: ${backupPath}`);
    } catch (error) {
        console.error('[Backup] CRITICAL ERROR: Nightly database backup failed:', error);
    }
}

/**
 * Captures the end-of-day (EOD) closing price for any tickers that were fully sold off during a given day.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {string} dateToProcess - The date to process in 'YYYY-MM-DD' format.
 * @returns {Promise<void>}
 */
async function captureEodPrices(db, dateToProcess) {
    console.log(`[EOD Process] Running for date: ${dateToProcess}`);
    try {
        const soldTickers = await db.all(`SELECT DISTINCT ticker FROM transactions WHERE transaction_date = ? AND transaction_type = 'SELL'`, dateToProcess);
        if (soldTickers.length === 0) {
            return;
        }
        for (const { ticker } of soldTickers) {
            const remaining = await db.get(`SELECT SUM(quantity_remaining) as total FROM transactions WHERE ticker = ?`, ticker);
            if (remaining && remaining.total < 0.00001) {
                const existingPrice = await db.get('SELECT id FROM historical_prices WHERE ticker = ? AND date = ?', [ticker, dateToProcess]);
                if (existingPrice) continue;
                console.log(`[EOD Process] Position for ${ticker} closed. Fetching closing price...`);
                const apiKey = process.env.FINNHUB_API_KEY;
                const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
                if (apiRes.ok) {
                    const data = await apiRes.json();
                    const closePrice = (data && data.c > 0) ? data.c : null;
                    if (closePrice) {
                        await db.run('INSERT INTO historical_prices (ticker, date, close_price) VALUES (?, ?, ?)', [ticker, dateToProcess, closePrice]);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[EOD Process] Error for ${dateToProcess}:`, error);
    }
}

/**
 * The main order watcher service. Fetches current prices for tickers with open orders/limits
 * and creates notifications for buy limit hits or automatically executes sell limit orders.
 * @param {import('sqlite').Database} db - The database connection object.
 * @returns {Promise<void>}
 */
async function runOrderWatcher(db) {
    console.log('[CRON] Running Order Watcher / Alert Generator...');
    try {
        const activeBuyOrders = await db.all("SELECT * FROM pending_orders WHERE status = 'ACTIVE' AND order_type = 'BUY_LIMIT'");
        const openPositionsWithLimits = await db.all("SELECT * FROM transactions WHERE transaction_type = 'BUY' AND quantity_remaining > 0.00001 AND (limit_price_up IS NOT NULL OR limit_price_down IS NOT NULL)");
        if (activeBuyOrders.length === 0 && openPositionsWithLimits.length === 0) { return; }
        const buyTickers = activeBuyOrders.map(order => order.ticker);
        const sellTickers = openPositionsWithLimits.map(pos => pos.ticker);
        const uniqueTickers = [...new Set([...buyTickers, ...sellTickers])];
        const currentPrices = {};
        const apiKey = process.env.FINNHUB_API_KEY;
        for (const ticker of uniqueTickers) {
            const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data && data.c > 0) currentPrices[ticker] = data.c;
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        // Check for buy limit orders that have been hit
        for (const order of activeBuyOrders) {
            const currentPrice = currentPrices[order.ticker];
            if (currentPrice && currentPrice <= order.limit_price) {
                const existingNotification = await db.get("SELECT id FROM notifications WHERE pending_order_id = ? AND status = 'UNREAD'", order.id);
                if (!existingNotification) {
                    const message = `Price target of ${formatCurrency(order.limit_price)} met for ${order.ticker}. Current price is ${formatCurrency(currentPrice)}.`;
                    await db.run("INSERT INTO notifications (account_holder_id, pending_order_id, message) VALUES (?, ?, ?)", [order.account_holder_id, order.id, message]);
                }
            }
        }
        // Check for sell limit orders (stop loss / take profit) that have been hit
        for (const position of openPositionsWithLimits) {
            const currentPrice = currentPrices[position.ticker];
            if (!currentPrice) continue;
            let executedPrice = null;
            let executionType = null;
            if (position.limit_price_down && currentPrice <= position.limit_price_down) {
                executedPrice = position.limit_price_down;
                executionType = 'Stop Loss';
            } else if (position.limit_price_up && currentPrice >= position.limit_price_up) {
                executedPrice = position.limit_price_up;
                executionType = 'Take Profit';
            }
            // If a limit was hit, execute the sale automatically
            if (executedPrice && executionType) {
                await db.exec('BEGIN TRANSACTION');
                const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
                await db.run(`INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [position.ticker, position.exchange, 'SELL', position.quantity_remaining, executedPrice, today, position.id, position.account_holder_id]);
                await db.run("UPDATE transactions SET quantity_remaining = 0, limit_price_up = NULL, limit_price_down = NULL WHERE id = ?", position.id);
                const message = `${executionType} order for ${position.quantity_remaining} shares of ${position.ticker} was automatically executed at ${formatCurrency(executedPrice)}.`;
                await db.run("INSERT INTO notifications (account_holder_id, message) VALUES (?, ?)", [position.account_holder_id, message]);
                await db.exec('COMMIT');
            }
        }
    } catch (error) {
        console.error('[CRON] Error in Order Watcher:', error);
        await db.exec('ROLLBACK');
    }
}

/**
 * Initializes and schedules all cron jobs for the application.
 * This function is called once on server startup.
 * @param {import('sqlite').Database} db - The database connection object.
 * @returns {void}
 */
function initializeAllCronJobs(db) {
    if (process.env.NODE_ENV !== 'test') {
        // Schedule EOD price capture for closed positions. Runs at 4:02 PM EST on weekdays.
        cron.schedule('2 16 * * 1-5', () => {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            captureEodPrices(db, today);
        }, { timezone: "America/New_York" });
        
        // Schedule the Order Watcher. Runs every 5 minutes during market hours (9 AM - 4 PM EST) on weekdays.
        cron.schedule('*/5 9-16 * * 1-5', () => runOrderWatcher(db), {
            timezone: "America/New_York"
        });

        // --- NEW: Schedule Nightly Database Backup ---
        // Runs at 2:00 AM EST every day.
        cron.schedule('0 2 * * *', () => {
            backupDatabase();
        }, {
            timezone: "America/New_York"
        });

        console.log("Cron jobs for EOD, Order Watcher, and Nightly Backups have been scheduled.");
    }
}

module.exports = { initializeAllCronJobs, captureEodPrices, runOrderWatcher, backupDatabase };