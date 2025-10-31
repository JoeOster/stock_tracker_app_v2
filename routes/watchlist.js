// /routes/watchlist.js
/**
 * @file Creates and returns an Express router for handling watchlist endpoints.
 * @module routes/watchlist
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for the watchlist.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
    // Base path for these routes is '/api/watchlist'

    /**
     * @route GET /api/watchlist/
     * @group Watchlist - Operations for the watchlist
     * @description Fetches all 'OPEN' watchlist items for a specific account holder.
     * @param {string} holder.query.required - The account holder ID.
     * @returns {Array<object>|object} 200 - An array of watchlist items. 500 - Server error.
     */
    router.get('/', async (req, res) => {
        try {
            const holderId = req.query.holder;
            if (!holderId || holderId === 'all') {
                log('[WARN] Attempted to fetch watchlist without a specific holder ID.');
                return res.status(400).json({ message: "A specific account holder ID is required." });
            }

            const items = await db.all(
                "SELECT * FROM watchlist WHERE account_holder_id = ? AND status = 'OPEN' ORDER BY created_at DESC",
                [holderId]
            );
            res.json(items);
        } catch (e) {
            log(`[ERROR] Failed to fetch watchlist: ${e.message}`);
            res.status(500).json({ message: 'Error fetching watchlist.' });
        }
    });

    /**
     * @typedef {object} WatchlistPostBody
     * @property {string|number} account_holder_id
     * @property {string} ticker
     * @property {string|number|null} [advice_source_id]
     * @property {string|number|null} [journal_entry_id] - New field
     * @property {number|null} [rec_entry_low]
     * @property {number|null} [rec_entry_high]
     * @property {number|null} [rec_tp1]
     * @property {number|null} [rec_tp2]
     * @property {number|null} [rec_stop_loss]
     */

    /**
     * @route POST /api/watchlist/
     * @group Watchlist - Operations for the watchlist
     * @description Adds a new item to the watchlist.
     * @param {WatchlistPostBody} req.body.required - The data for the new watchlist item.
     * @returns {object} 201 - The newly created item. 400/500 - Error message.
     */
    router.post('/', async (req, res) => {
        const {
            account_holder_id,
            ticker,
            advice_source_id,
            journal_entry_id, // New field
            rec_entry_low,
            rec_entry_high,
            rec_tp1,
            rec_tp2,
            rec_stop_loss
        } = req.body;

        if (!account_holder_id || !ticker) {
            return res.status(400).json({ message: 'Account Holder ID and Ticker are required.' });
        }
        
        // --- FIX: Validation updated ---
        // A trade idea MUST have an advice_source_id.
        // It can OPTIONALLY have a journal_entry_id.
        if (!advice_source_id) {
             return res.status(400).json({ message: 'A trade idea must be linked to an advice source.' });
        }
        // --- END FIX ---

        try {
            const createdAt = new Date().toISOString();
            
            // --- MIGRATE: Add journal_entry_id to the INSERT statement ---
            const query = `
                INSERT INTO watchlist (
                    account_holder_id, ticker, advice_source_id, journal_entry_id,
                    rec_entry_low, rec_entry_high, rec_tp1, rec_tp2, rec_stop_loss,
                    status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await db.run(query, [
                account_holder_id,
                ticker.toUpperCase(),
                advice_source_id || null,
                journal_entry_id || null, // Save new field
                rec_entry_low || null,
                rec_entry_high || null,
                rec_tp1 || null,
                rec_tp2 || null,
                rec_stop_loss || null,
                'OPEN', // Default status
                createdAt
            ]);
            // --- END MIGRATE ---

            const newItemId = result.lastID;
            const newItem = await db.get('SELECT * FROM watchlist WHERE id = ?', newItemId);
            res.status(201).json(newItem);
        } catch (e) {
            log(`[ERROR] Failed to add watchlist item: ${e.message}\n${e.stack}`);
            if (e.message.includes('UNIQUE constraint failed')) {
                res.status(409).json({ message: 'This ticker is already on the watchlist for this source/journal entry.' });
            } else {
                res.status(500).json({ message: 'Server error while adding watchlist item.' });
            }
        }
    });

    /**
     * @route DELETE /api/watchlist/:id
     * @group Watchlist - Operations for the watchlist
     * @description Deletes (archives) a watchlist item by setting its status to 'CLOSED'.
     * @param {string} id.path.required - The ID of the watchlist item to delete.
     * @returns {object} 200 - Success message. 404/500 - Error message.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // We don't delete, we archive by setting status to 'CLOSED'
            const result = await db.run(
                "UPDATE watchlist SET status = 'CLOSED' WHERE id = ?",
                [id]
            );

            if (result.changes === 0) {
                return res.status(404).json({ message: 'Watchlist item not found.' });
            }
            res.json({ message: 'Watchlist item archived successfully.' });
        } catch (e) {
            log(`[ERROR] Failed to delete/archive watchlist item ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while deleting watchlist item.' });
        }
    });

    return router;
};