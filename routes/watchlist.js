// /routes/watchlist.js
/**
 * @file Defines the API routes for managing the watchlist.
 * @module routes/watchlist
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling watchlist endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {

    /**
     * GET /
     * Fetches all watchlist items for a given account holder.
     */
    router.get('/', async (req, res) => {
        try {
            const holderId = req.query.holder;
            if (!holderId) {
                return res.status(400).json({ message: 'Account holder ID is required.' });
            }
            const items = await db.all('SELECT * FROM watchlist WHERE account_holder_id = ? ORDER BY ticker', [holderId]);
            res.json(items);
        } catch (error) {
            log(`[ERROR] Failed to fetch watchlist: ${error.message}`);
            res.status(500).json({ message: 'Error fetching watchlist.' });
        }
    });

    /**
     * POST /
     * Adds a new ticker to the watchlist for a given account holder.
     */
    router.post('/', async (req, res) => {
        const { account_holder_id, ticker } = req.body;
        if (!account_holder_id || !ticker || ticker.trim() === '') {
            return res.status(400).json({ message: 'Account holder and ticker are required.' });
        }
        try {
            const result = await db.run(
                'INSERT INTO watchlist (account_holder_id, ticker) VALUES (?, ?)',
                [account_holder_id, ticker.toUpperCase().trim()]
            );
            res.status(201).json({ id: result.lastID, account_holder_id, ticker });
        } catch (error) {
            log(`[ERROR] Failed to add to watchlist: ${error.message}`);
            if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(409).json({ message: 'This ticker is already in your watchlist.' });
            } else {
                res.status(500).json({ message: 'Error adding to watchlist.' });
            }
        }
    });

    /**
     * DELETE /:id
     * Removes a ticker from the watchlist.
     */
    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM watchlist WHERE id = ?', req.params.id);
            res.json({ message: 'Ticker removed from watchlist.' });
        } catch (error) {
            log(`[ERROR] Failed to delete from watchlist with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Error removing from watchlist.' });
        }
    });

    return router;
};