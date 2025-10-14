// routes/utility.js
const express = require('express');
const router = express.Router();
const { getPrices } = require('../services/priceService');

/**
 * Creates and returns an Express router for handling utility and miscellaneous endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {object} dependencies - An object containing additional functions.
 * @param {function(import('sqlite').Database, string): Promise<void>} dependencies.captureEodPrices - A function to capture end-of-day prices.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log, { captureEodPrices }) => {

    // Base path is /api/utility

    /**
     * GET /importer-templates
     * Serves the brokerage templates as a JSON object for the frontend.
     */
    router.get('/importer-templates', (req, res) => {
        try {
            const templates = require('../public/importer-templates.js');
            res.json(templates);
        } catch (error) {
            log(`[ERROR] Failed to load importer templates: ${error.message}`);
            res.status(500).json({ message: 'Could not load importer templates.' });
        }
    });

    // ... (keep all the other routes like /prices/batch, /snapshots, etc.)

    return router;
};

    /**
     * POST /prices/batch
     * Fetches current or historical prices for a batch of tickers.
     */
    router.post('/prices/batch', async (req, res) => {
        const { tickers, date } = req.body;
        if (!tickers || !Array.isArray(tickers)) {
            return res.status(400).json({ message: 'Invalid request body, expected a "tickers" array.' });
        }

        const prices = {};
        const tickersToFetch = [];

        for (const ticker of tickers) {
            const cachedPrice = await db.get('SELECT close_price FROM historical_prices WHERE ticker = ? AND date = ?', [ticker, date]);
            if (cachedPrice) {
                prices[ticker] = cachedPrice.close_price;
            } else {
                tickersToFetch.push(ticker);
            }
        }

        if (tickersToFetch.length > 0) {
            try {
                // Pass a high priority (e.g., 3) for user-facing requests
                const fetchedPrices = await getPrices(tickersToFetch, 3);
                // Unwrap the price from the service's cache object
                for (const ticker in fetchedPrices) {
                    prices[ticker] = fetchedPrices[ticker]?.price;
                }
            } catch (error) {
                log(`[ERROR] Error fetching batch prices from service: ${error.message}`);
                tickersToFetch.forEach(ticker => {
                    if (!prices[ticker]) {
                        prices[ticker] = null;
                    }
                });
            }
        }
        
        res.json(prices);
    });

    /**
     * POST /tasks/capture-eod/:date
     * Manually triggers the EOD price capture service for a specific date.
     */
    router.post('/tasks/capture-eod/:date', async (req, res) => {
        const { date } = req.params;
        if (captureEodPrices && typeof captureEodPrices === 'function') {
            captureEodPrices(db, date);
            res.status(202).json({ message: `EOD process for ${date} acknowledged.` });
        } else {
            log(`[ERROR] EOD capture function not available on manual trigger.`);
            res.status(500).json({ message: 'EOD capture function not available.'});
        }
    });
    
    /**
     * GET /snapshots
     * Fetches all account value snapshots, optionally filtered by an account holder.
     */
    router.get('/snapshots', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let snapshots;
            if (holderId === 'all') {
                snapshots = await db.all(`
                    SELECT snapshot_date, 'All Accounts' as exchange, SUM(value) as value 
                    FROM account_snapshots 
                    GROUP BY snapshot_date 
                    ORDER BY snapshot_date ASC
                `);
            } else if (holderId) {
                snapshots = await db.all('SELECT * FROM account_snapshots WHERE account_holder_id = ? ORDER BY snapshot_date ASC', [holderId]);
            } else {
                snapshots = await db.all('SELECT * FROM account_snapshots ORDER BY snapshot_date ASC');
            }
            res.json(snapshots);
        } catch (error) {
            log(`[ERROR] Failed to fetch snapshots: ${error.message}`);
            res.status(500).json({ message: "Error fetching snapshots" });
        }
    });

    /**
     * POST /snapshots
     * Creates or replaces an account value snapshot for a given exchange and date.
     */
    router.post('/snapshots', async (req, res) => {
        try {
            const { exchange, snapshot_date, value, account_holder_id } = req.body;
            if(!account_holder_id) {
                return res.status(400).json({message: "Account holder is required."});
            }
            await db.run(`INSERT OR REPLACE INTO account_snapshots (exchange, snapshot_date, value, account_holder_id) VALUES (?, ?, ?, ?)`, [exchange, snapshot_date, value, account_holder_id]);
            res.status(201).json({ message: 'Snapshot saved.' });
        } catch (error) {
            log(`[ERROR] Error saving snapshot: ${error.message}`);
            res.status(500).json({ message: 'Error saving snapshot.' });
        }
    });

    /**
     * DELETE /snapshots/:id
     * Deletes a specific account value snapshot by its ID.
     */
    router.delete('/snapshots/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM account_snapshots WHERE id = ?', req.params.id);
            res.json({ message: 'Snapshot deleted successfully' });
        } catch (error) {
            log(`[ERROR] Failed to delete snapshot with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Error deleting snapshot' });
        }
    });

    return router;
};