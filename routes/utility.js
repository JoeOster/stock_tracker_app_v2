// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/routes/utility.js
const express = require('express');
const router = express.Router();
const { getPrices } = require('../services/priceService');
const { brokerageTemplates } = require('../user-settings/importer-templates.js');

module.exports = (db, log, services) => {
    // The base path for these routes is '/api/utility'

    // --- REMOVED: GET /snapshots ---
    // --- REMOVED: POST /snapshots ---
    // --- REMOVED: DELETE /snapshots/:id ---


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