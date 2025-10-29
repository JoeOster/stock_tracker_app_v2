// /routes/watchlist.js
/**
 * @file Defines the API routes for managing the watchlist (Recommended Trades).
 * @module routes/watchlist
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling watchlist endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} [log=console.log] - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {

    /**
     * GET /
     * Fetches all watchlist items for a given account holder.
     * Includes the recommended entry range and targets.
     * @route GET /api/watchlist
     * @group Watchlist - Operations for recommended trades watchlist
     * @param {string} holder.query.required - Account holder ID.
     * @returns {Array<object>} 200 - An array of watchlist item objects.
     * @returns {Error} 400 - Missing holder query parameter.
     * @returns {Error} 500 - Server error.
     */
    router.get('/', async (req, res) => {
        try {
            // @ts-ignore
            const holderId = req.query.holder;
            if (!holderId) {
                return res.status(400).json({ message: 'Account holder ID is required.' });
            }
            const items = await db.all(
                'SELECT * FROM watchlist WHERE account_holder_id = ? ORDER BY ticker',
                [holderId]
            );
            res.json(items);
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to fetch watchlist: ${error.message}`);
            res.status(500).json({ message: 'Error fetching watchlist.' });
        }
    });

    /**
     * POST /
     * Adds a new ticker to the watchlist for a given account holder.
     * Now accepts an optional advice_source_id and all guideline fields.
     * @route POST /api/watchlist
     * @group Watchlist - Operations for recommended trades watchlist
     * @param {WatchlistPostBody.model} WatchlistPostBody.body.required - Watchlist item data.
     * @returns {object} 201 - The newly created watchlist item object.
     * @returns {Error} 400 - Missing required fields or invalid data.
     * @returns {Error} 409 - Ticker already exists in watchlist.
     * @returns {Error} 500 - Server error.
     */
    router.post('/', async (req, res) => {
        /**
         * @typedef {object} WatchlistPostBody
         * @property {string|number} account_holder_id
         * @property {string} ticker
         * @property {string|number|null} [advice_source_id]
         * @property {number|null} [rec_entry_low]
         * @property {number|null} [rec_entry_high]
         * @property {number|null} [rec_tp1] // <-- New
         * @property {number|null} [rec_tp2] // <-- New
         * @property {number|null} [rec_stop_loss] // <-- New
         */

        /** @type {WatchlistPostBody} */
        const {
            account_holder_id, ticker, advice_source_id,
            rec_entry_low, rec_entry_high,
            rec_tp1, rec_tp2, rec_stop_loss // <-- New
        } = req.body;

        if (!account_holder_id || !ticker || ticker.trim() === '') {
            return res.status(400).json({ message: 'Account holder and ticker are required.' });
        }

        // Optional validation for range
        if (rec_entry_low !== null && rec_entry_high !== null && rec_entry_low > rec_entry_high) {
             return res.status(400).json({ message: 'Recommended Entry Low cannot be greater than Entry High.' });
        }

        try {
            const result = await db.run(
                'INSERT INTO watchlist (account_holder_id, ticker, advice_source_id, rec_entry_low, rec_entry_high, rec_tp1, rec_tp2, rec_stop_loss) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    account_holder_id,
                    ticker.toUpperCase().trim(),
                    advice_source_id || null,
                    rec_entry_low ?? null,
                    rec_entry_high ?? null,
                    rec_tp1 ?? null, // <-- New
                    rec_tp2 ?? null, // <-- New
                    rec_stop_loss ?? null // <-- New
                ]
            );

            const newEntry = await db.get('SELECT * FROM watchlist WHERE id = ?', result.lastID);
            res.status(201).json(newEntry); // Return the full new entry
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to add to watchlist: ${error.message}`);
            // @ts-ignore
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
     * @route DELETE /api/watchlist/{id}
     * @group Watchlist - Operations for recommended trades watchlist
     * @param {string} id.path.required - The ID of the watchlist item.
     * @returns {object} 200 - Success message.
     * @returns {Error} 500 - Server error.
     */
    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM watchlist WHERE id = ?', req.params.id);
            res.json({ message: 'Ticker removed from watchlist.' });
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to delete from watchlist with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Error removing from watchlist.' });
        }
    });

    return router;
};