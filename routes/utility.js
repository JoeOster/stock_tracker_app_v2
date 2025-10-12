// routes/utility.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * Creates and returns an Express router for handling utility and miscellaneous endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {object} dependencies - An object containing additional functions.
 * @param {function(import('sqlite').Database, string): Promise<void>} dependencies.captureEodPrices - A function to capture end-of-day prices.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, { captureEodPrices }) => {

    // Base path is /api/utility

    /**
     * POST /prices/batch
     * Fetches current or historical prices for a batch of tickers. It prioritizes fetching
     * from a local cache (`historical_prices`) before querying the live API.
     */
    router.post('/prices/batch', async (req, res) => {
        const { tickers, date } = req.body;
        if (!tickers || !Array.isArray(tickers)) {
            return res.status(400).json({ message: 'Invalid request body, expected a "tickers" array.' });
        }
        const prices = {};
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) return res.status(500).json({ message: "API key not configured on server." });

        for (const ticker of tickers) {
            try {
                // First, check for a cached historical price for the given date
                const cachedPrice = await db.get('SELECT close_price FROM historical_prices WHERE ticker = ? AND date = ?', [ticker, date]);
                if (cachedPrice) {
                    prices[ticker] = cachedPrice.close_price;
                    continue; // Move to the next ticker
                }

                // If no cached price, fetch from the live API
                const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
                if (apiRes.ok) {
                    const data = await apiRes.json();
                    if (data && data.c > 0) {
                        prices[ticker] = data.c;
                    } else {
                        prices[ticker] = 'invalid';
                        console.warn(`[Price Fetch Warning] Ticker '${ticker}' returned a null or zero price. It may be an invalid symbol.`);
                    }
                } else {
                    prices[ticker] = null;
                }
                // Brief pause to respect API rate limits
                await new Promise(resolve => setTimeout(resolve, 150));
            } catch (error) {
                console.error(`Error fetching price for ${ticker} in batch:`, error);
                prices[ticker] = null;
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
        // The captureEodPrices function is now passed in and available in the closure
        if (captureEodPrices && typeof captureEodPrices === 'function') {
            captureEodPrices(db, date);
            res.status(202).json({ message: `EOD process for ${date} acknowledged.` });
        } else {
            res.status(500).json({ message: 'EOD capture function not available.'});
        }
    });
    
    /**
     * GET /snapshots
     * Fetches all account value snapshots, optionally filtered by an account holder.
     * If 'all' is specified, it aggregates values across all holders by date.
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
            console.error("Failed to fetch snapshots:", error);
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
            console.error('Error saving snapshot:', error);
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
            console.error('Failed to delete snapshot:', error);
            res.status(500).json({ message: 'Error deleting snapshot' });
        }
    });

    return router;
};