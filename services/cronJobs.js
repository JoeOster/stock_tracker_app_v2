// services/cronJobs.js
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { getPrices } = require('./priceService'); // Use the new centralized price service

const formatCurrency = (num) => (num ? `$${Number(num).toFixed(2)}` : '--');
async function backupDatabase() {
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Backup] Skipping backup in non-production environment.');
        return;
    }
    console.log('[Backup] Starting nightly database backup...');
    try {
        const dbPath = './production.db';
        const backupDir = './backup';
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
                // Use a low priority (e.g., 8) for this background task
                const priceData = await getPrices([ticker], 8);
                const closePrice = priceData[ticker]?.price; // Unwrap the price object
                if (typeof closePrice === 'number') {
                    await db.run('INSERT INTO historical_prices (ticker, date, close_price) VALUES (?, ?, ?)', [ticker, dateToProcess, closePrice]);
                }
            }
        }
    } catch (error) {
        console.error(`[EOD Process] Error for ${dateToProcess}:`, error);
    }
}

async function runOrderWatcher(db) {
    console.log('[CRON] Running Order Watcher / Alert Generator...');
    try {
        const activeBuyOrders = await db.all("SELECT * FROM pending_orders WHERE status = 'ACTIVE' AND order_type = 'BUY_LIMIT'");
        const openPositionsWithLimits = await db.all("SELECT * FROM transactions WHERE transaction_type = 'BUY' AND quantity_remaining > 0.00001 AND (limit_price_up IS NOT NULL OR limit_price_down IS NOT NULL)");
        if (activeBuyOrders.length === 0 && openPositionsWithLimits.length === 0) { return; }
        const buyTickers = activeBuyOrders.map(order => order.ticker);
        const sellTickers = openPositionsWithLimits.map(pos => pos.ticker);
        const uniqueTickers = [...new Set([...buyTickers, ...sellTickers])];
        // Use a low priority (e.g., 7) for the watcher
        const currentPrices = await getPrices(uniqueTickers, 7);
        for (const order of activeBuyOrders) {
            const currentPrice = currentPrices[order.ticker]?.price; // Unwrap the price object
            if (typeof currentPrice === 'number' && currentPrice <= order.limit_price) {
                const existingNotification = await db.get("SELECT id FROM notifications WHERE pending_order_id = ? AND status = 'UNREAD'", order.id);
                if (!existingNotification) {
                    const message = `Price target of ${formatCurrency(order.limit_price)} met for ${order.ticker}. Current price is ${formatCurrency(currentPrice)}.`;
                    await db.run("INSERT INTO notifications (account_holder_id, pending_order_id, message) VALUES (?, ?, ?)", [order.account_holder_id, order.id, message]);
                }
            }
        }
        for (const position of openPositionsWithLimits) {
            const currentPrice = currentPrices[position.ticker]?.price; // Unwrap the price object
            if (typeof currentPrice !== 'number') continue;
            let executedPrice = null;
            let executionType = null;
            if (position.limit_price_down && currentPrice <= position.limit_price_down) {
                executedPrice = position.limit_price_down;
                executionType = 'Stop Loss';
            } else if (position.limit_price_up && currentPrice >= position.limit_price_up) {
                executedPrice = position.limit_price_up;
                executionType = 'Take Profit';
            }
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

function initializeAllCronJobs(db) {
    if (process.env.NODE_ENV !== 'test') {
        cron.schedule('2 16 * * 1-5', () => {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            captureEodPrices(db, today);
        }, { timezone: "America/New_York" });
        cron.schedule('*/5 9-16 * * 1-5', () => runOrderWatcher(db), {
            timezone: "America/New_York"
        });
        cron.schedule('0 2 * * *', () => {
            backupDatabase();
        }, {
            timezone: "America/New_York"
        });
        console.log("Cron jobs for EOD, Order Watcher, and Nightly Backups have been scheduled.");
    }
}

module.exports = { initializeAllCronJobs, captureEodPrices, runOrderWatcher, backupDatabase };