// /routes/advice_sources.js
/**
 * @file Creates and returns an Express router for handling CRUD on advice_sources.
 * @module routes/advice_sources
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for advice sources.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
    // Base path for these routes is '/api/advice-sources'

    /**
     * @route GET /api/advice-sources/
     * @group AdviceSources - Operations for advice sources
     * @description Fetches all advice sources for a specific account holder.
     * @param {string} holder.query.required - The account holder ID.
     * @returns {Array<object>|object} 200 - An array of advice sources. 500 - Server error.
     */
    router.get('/', async (req, res) => {
        try {
            const holderId = req.query.holder;
            if (!holderId || holderId === 'all') {
                log('[WARN] Attempted to fetch advice sources without a specific holder ID.');
                return res.status(400).json({ message: "A specific account holder ID is required." });
            }
            
            // Fetch all sources for the holder
            const sources = await db.all(
                'SELECT * FROM advice_sources WHERE account_holder_id = ? ORDER BY name ASC',
                [holderId]
            );
            
            // --- MIGRATE: Parse 'details' JSON string back into an object ---
            const sourcesWithDetails = sources.map(source => {
                if (source.details) {
                    try {
                        source.details = JSON.parse(source.details);
                    } catch (e) {
                        log(`[ERROR] Failed to parse details JSON for source ID ${source.id}: ${e.message}`);
                        source.details = null; // Set to null if parsing fails
                    }
                }
                return source;
            });
            // --- END MIGRATE ---

            res.json(sourcesWithDetails);
        } catch (e) {
            log(`[ERROR] Failed to fetch advice sources: ${e.message}`);
            res.status(500).json({ message: "Error fetching advice sources." });
        }
    });

    /**
     * @typedef {object} AdviceSourcePostBody
     * @property {string|number} account_holder_id
     * @property {string} name
     * @property {string} type
     * @property {string|null} [description]
     * @property {string|null} [url]
     * @property {string|null} [image_path]
     * @property {object|null} [details] - JSON blob for dynamic fields (e.g., { "author": "..." })
     */

    /**
     * @route POST /api/advice-sources/
     * @group AdviceSources - Operations for advice sources
     * @description Adds a new advice source.
     * @param {AdviceSourcePostBody} req.body.required - The data for the new advice source.
     * @returns {object} 201 - The newly created advice source. 400/500 - Error message.
     */
    router.post('/', async (req, res) => {
        const {
            account_holder_id,
            name,
            type,
            description,
            url,
            image_path,
            details // New JSON details object
        } = req.body;

        if (!account_holder_id || !name || !type) {
            return res.status(400).json({ message: 'Account Holder, Name, and Type are required.' });
        }

        try {
            // --- MIGRATE: Stringify the 'details' object for storage ---
            const detailsJson = details ? JSON.stringify(details) : null;
            // --- END MIGRATE ---

            const createdAt = new Date().toISOString();
            
            // --- MIGRATE: Insert 'details' column, remove old contact_* columns ---
            const query = `
                INSERT INTO advice_sources (
                    account_holder_id, name, type, description, url, image_path, details, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await db.run(query, [
                account_holder_id,
                name,
                type,
                description || null,
                url || null,
                image_path || null,
                detailsJson, // Save the stringified JSON
                createdAt
            ]);
            // --- END MIGRATE ---

            const newSourceId = result.lastID;
            const newSource = await db.get('SELECT * FROM advice_sources WHERE id = ?', newSourceId);
            
            // Parse details back for the response
            if (newSource.details) {
                 newSource.details = JSON.parse(newSource.details);
            }

            res.status(201).json(newSource);
        } catch (e) {
            log(`[ERROR] Failed to add advice source: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while adding advice source.' });
        }
    });

    /**
     * @typedef {object} AdviceSourcePutBody
     * @property {string} name
     * @property {string} type
     * @property {string|null} [description]
     * @property {string|null} [url]
     * @property {string|null} [image_path]
     * @property {object|null} [details] - JSON blob for dynamic fields
     */

    /**
     * @route PUT /api/advice-sources/:id
     * @group AdviceSources - Operations for advice sources
     * @description Updates an existing advice source.
     * @param {string} id.path.required - The ID of the advice source to update.
     * @param {AdviceSourcePutBody} req.body.required - The data to update.
     * @returns {object} 200 - Success message. 400/404/500 - Error message.
     */
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const {
            name,
            type,
            description,
            url,
            image_path,
            details // New JSON details object
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: 'Name and Type are required.' });
        }

        try {
            // --- MIGRATE: Stringify the 'details' object for storage ---
            const detailsJson = details ? JSON.stringify(details) : null;
            // --- END MIGRATE ---

            // --- MIGRATE: Update 'details' column, remove old contact_* columns ---
            const query = `
                UPDATE advice_sources SET
                    name = ?,
                    type = ?,
                    description = ?,
                    url = ?,
                    image_path = ?,
                    details = ?
                WHERE id = ?
            `;
            const result = await db.run(query, [
                name,
                type,
                description || null,
                url || null,
                image_path || null,
                detailsJson, // Save the stringified JSON
                id
            ]);
            // --- END MIGRATE ---

            if (result.changes === 0) {
                return res.status(404).json({ message: 'Advice source not found.' });
            }

            res.json({ message: 'Advice source updated successfully.' });
        } catch (e) {
            log(`[ERROR] Failed to update advice source ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while updating advice source.' });
        }
    });

    /**
     * @route DELETE /api/advice-sources/:id
     * @group AdviceSources - Operations for advice sources
     * @description Deletes an advice source.
     * @param {string} id.path.required - The ID of the advice source to delete.
     * @returns {object} 200 - Success message. 404/500 - Error message.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // Check for linked journal entries or watchlist items
            const journalCount = await db.get('SELECT COUNT(*) as count FROM journal_entries WHERE advice_source_id = ?', id);
            const watchlistCount = await db.get('SELECT COUNT(*) as count FROM watchlist WHERE advice_source_id = ?', id);

            if (journalCount.count > 0 || watchlistCount.count > 0) {
                return res.status(400).json({ message: 'Cannot delete source: It has associated journal entries or trade ideas. Please reassign or delete them first.' });
            }
            
            // Check for linked transactions
            const txCount = await db.get('SELECT COUNT(*) as count FROM transactions WHERE advice_source_id = ?', id);
            if (txCount.count > 0) {
                 return res.status(400).json({ message: 'Cannot delete source: It has associated transactions. Please reassign or delete them first.' });
            }
            
            // Check for linked documents
            const docCount = await db.get('SELECT COUNT(*) as count FROM documents WHERE advice_source_id = ?', id);
            if (docCount.count > 0) {
                 return res.status(400).json({ message: 'Cannot delete source: It has associated documents. Please reassign or delete them first.' });
            }
            
            // Check for linked notes
            const noteCount = await db.get('SELECT COUNT(*) as count FROM source_notes WHERE advice_source_id = ?', id);
             if (noteCount.count > 0) {
                 return res.status(400).json({ message: 'Cannot delete source: It has associated notes. Please reassign or delete them first.' });
            }

            // If no links, proceed with deletion
            const result = await db.run('DELETE FROM advice_sources WHERE id = ?', id);
            if (result.changes === 0) {
                return res.status(404).json({ message: 'Advice source not found.' });
            }
            res.json({ message: 'Advice source deleted successfully.' });
        } catch (e) {
            log(`[ERROR] Failed to delete advice source ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while deleting advice source.' });
        }
    });

    return router;
};
