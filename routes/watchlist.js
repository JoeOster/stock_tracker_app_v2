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
     * @route GET /api/watchlist/
     * @group Watchlist - Operations for recommended trades watchlist
     * @description Fetches all watchlist items for a given account holder.
     * @param {string} holder.query.required - Account holder ID.
     * @returns {Array<object>|object} 200 - An array of watchlist item objects. 400 - An object with an error message if the holder ID is missing. 500 - An object with an error message if the fetch fails.
     */
    router.get('/', async (req, res) => {
        try {
            // @ts-ignore
            const holderId = req.query.holder;
            if (!holderId) {
                return res.status(400).json({ message: 'Account holder ID is required.' });
            }
            // Select all columns to include new guideline fields
            const items = await db.all(
                'SELECT * FROM watchlist WHERE account_holder_id = ? ORDER BY ticker',
                [holderId]
            );
            res.json(items);
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to fetch watchlist: ${error.message}`);
            // @ts-ignore
            res.status(500).json({ message: `Error fetching watchlist: ${error.message}` });
        }
    });

    /**
     * @typedef {object} WatchlistPostBody
     * @property {string|number} account_holder_id
     * @property {string} ticker
     * @property {string|number|null} [advice_source_id]
     * @property {number|null} [rec_entry_low]
     * @property {number|null} [rec_entry_high]
     * @property {number|null} [rec_tp1]
     * @property {number|null} [rec_tp2]
     * @property {number|null} [rec_stop_loss]
     */

    /**
     * @route POST /api/watchlist/
     * @group Watchlist - Operations for recommended trades watchlist
     * @description Adds a new ticker to the watchlist for a given account holder.
     * @param {WatchlistPostBody} req.body.required - Watchlist item data.
     * @returns {object} 201 - The newly created watchlist item object. 400 - An object with an error message for invalid data. 409 - An object with an error message if the ticker already exists. 500 - An object with an error message if the insert fails.
     */
    router.post('/', async (req, res) => {
        /** @type {WatchlistPostBody} */
        const {
            account_holder_id, ticker, advice_source_id,
            rec_entry_low, rec_entry_high,
            rec_tp1, rec_tp2, rec_stop_loss
        } = req.body;

        if (!account_holder_id || !ticker || ticker.trim() === '') {
            return res.status(400).json({ message: 'Account holder and ticker are required.' });
        }

        // Optional validation for range
        // @ts-ignore
        if (rec_entry_low !== null && rec_entry_high !== null && rec_entry_low > rec_entry_high) {
             return res.status(400).json({ message: 'Recommended Entry Low cannot be greater than Entry High.' });
        }

        try {
            const result = await db.run(
                `INSERT INTO watchlist (
                    account_holder_id, ticker, advice_source_id, 
                    rec_entry_low, rec_entry_high, rec_tp1, rec_tp2, rec_stop_loss
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    account_holder_id,
                    ticker.toUpperCase().trim(),
                    advice_source_id || null,
                    // @ts-ignore
                    rec_entry_low ?? null,
                    // @ts-ignore
                    rec_entry_high ?? null,
                    // @ts-ignore
                    rec_tp1 ?? null,
                    // @ts-ignore
                    rec_tp2 ?? null,
                    // @ts-ignore
                    rec_stop_loss ?? null
                ]
            );

            // Fetch the newly created row to return all fields
            const newEntry = await db.get('SELECT * FROM watchlist WHERE id = ?', result.lastID);
            res.status(201).json(newEntry);
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to add to watchlist: ${error.message}`);
            // @ts-ignore
            if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(409).json({ message: 'This ticker is already in your watchlist.' });
            } else {
                // @ts-ignore
                res.status(500).json({ message: `Error adding to watchlist: ${error.message}` });
            }
        }
    });

    /**
     * @route DELETE /api/watchlist/:id
     * @group Watchlist - Operations for recommended trades watchlist
     * @description Removes a ticker from the watchlist.
     * @param {string} id.path.required - The ID of the watchlist item.
     * @returns {object} 200 - An object with a success message. 500 - An object with an error message if the delete fails.
     */
    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM watchlist WHERE id = ?', req.params.id);
            res.json({ message: 'Ticker removed from watchlist.' });
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to delete from watchlist with ID ${req.params.id}: ${error.message}`);
            // @ts-ignore
            res.status(500).json({ message: `Error removing from watchlist: ${error.message}` });
        }
    });

    return router;
};