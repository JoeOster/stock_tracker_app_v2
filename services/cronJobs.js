// /services/cronJobs.js
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { getPrices } = require('./priceService');

const formatCurrency = (num) => (num ? `$${Number(num).toFixed(2)}` : '--');

async function backupDatabase() {
    // ... (function content is unchanged)
}

async function captureEodPrices(db, dateToProcess) {
    // ... (function content is unchanged)
}

async function runOrderWatcher(db) {
    // ... (function content is unchanged)
}

function setupCronJobs(db) {
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

module.exports = { setupCronJobs, captureEodPrices, runOrderWatcher, backupDatabase };