// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/routes/utility.js
const express = require('express');
const router = express.Router();
const { getPrices } = require('../services/priceService');
const { brokerageTemplates } = require('../public/importer-templates.js');

module.exports = (db, log, services) => {
    // The base path for these routes is '/api/utility'

    /**
     * GET /snapshots
     * Fetches all account snapshots, optionally filtered by an account holder.
     */
    router.get('/snapshots', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let query = 'SELECT * FROM account_snapshots';
            const params = [];
            if (holderId && holderId !== 'all') {
                query += ' WHERE account_holder_id = ?';
                params.push(holderId);
            }
            query += ' ORDER BY snapshot_date DESC';
            const snapshots = await db.all(query, params);
            res.json(snapshots);
        } catch (error) {
            log(`[ERROR] Failed to fetch snapshots: ${error.message}`);
            res.status(500).json({ message: "Error fetching snapshots." });
        }
    });

    /**
     * POST /snapshots
     * Creates a new account value snapshot.
     */
    router.post('/snapshots', async (req, res) => {
        const { snapshot_date, exchange, value, account_holder_id } = req.body;
        if (!snapshot_date || !exchange || !value || !account_holder_id) {
            return res.status(400).json({ message: 'Missing required snapshot data.' });
        }
        try {
            await db.run(
                'INSERT INTO account_snapshots (snapshot_date, exchange, value, account_holder_id) VALUES (?, ?, ?, ?)',
                [snapshot_date, exchange, value, account_holder_id]
            );
            res.status(201).json({ message: 'Snapshot created successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to create snapshot: ${error.message}`);
             if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(409).json({ message: 'A snapshot for this exchange on this date already exists.' });
            } else {
                res.status(500).json({ message: 'Error creating snapshot.' });
            }
        }
    });

    /**
     * DELETE /snapshots/:id
     * Deletes an account value snapshot.
     */
    router.delete('/snapshots/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM account_snapshots WHERE id = ?', req.params.id);
            res.json({ message: 'Snapshot deleted successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to delete snapshot with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Error deleting snapshot.' });
        }
    });


    /**
     * POST /prices/batch
     * Fetches current or historical prices for a batch of tickers.
     */
    router.post('/prices/batch', async (req, res) => {
        const { tickers, date, allowLive } = req.body;
        if (!Array.isArray(tickers) || tickers.length === 0) {
            return res.status(400).json({ message: 'An array of tickers is required.' });
        }
        try {
            // Priority 5 is a neutral default.
            const priceData = await getPrices(tickers, 5);
            const prices = {};
            for(const ticker in priceData) {
                prices[ticker] = priceData[ticker].price;
            }
            res.json(prices);
        } catch (error) {
            log(`[ERROR] Price batch fetch failed: ${error.message}`);
            res.status(500).json({ message: 'Failed to fetch prices.' });
        }
    });

    /**
     * GET /importer-templates
     * Serves the brokerage templates to the frontend.
     */
    router.get('/importer-templates', (req, res) => {
        res.json({ brokerageTemplates });
    });


    return router;
};