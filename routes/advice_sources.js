// routes/advice_sources.js
/**
 * @file Defines API routes for managing advice sources.
 * @module routes/advice_sources
 */
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling advice source endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => { // Added default logger

    /**
     * GET /
     * Fetches all advice sources for a specific account holder.
     * Expects `holder` query parameter.
     * (No changes needed here yet for backward compatibility with display)
     */
    router.get('/', async (req, res) => {
        // ... GET logic remains the same ...
        // @ts-ignore
        const holderId = req.query.holder;
        if (!holderId) {
            return res.status(400).json({ message: 'Account holder ID query parameter is required.' });
        }
        try {
            // Fetch sources specific to the account holder, ordered by name
            const sources = await db.all(
                'SELECT * FROM advice_sources WHERE account_holder_id = ? ORDER BY name COLLATE NOCASE',
                [holderId]
            );
            res.json(sources);
        } catch (error) {
            log(`[ERROR] Failed to fetch advice sources for holder ${holderId}: ${error.message}`);
            res.status(500).json({ message: 'Error fetching advice sources.' });
        }
    });

    /**
     * POST /
     * Creates a new advice source for a specific account holder.
     * Now uses contact_app_type and contact_app_handle.
     */
    router.post('/', async (req, res) => {
        // --- Updated destructuring ---
        const {
            account_holder_id, name, type, description, url,
            contact_person, contact_email, contact_phone,
            contact_app_type, contact_app_handle // New fields
        } = req.body;
        // --- End Update ---

        // Basic validation
        if (!account_holder_id || !name || !type || name.trim() === '' || type.trim() === '') {
            return res.status(400).json({ message: 'Account holder ID, name, and type are required.' });
        }

        try {
            // --- Updated INSERT query ---
            const result = await db.run(`
                INSERT INTO advice_sources (
                    account_holder_id, name, type, description, url,
                    contact_person, contact_email, contact_phone,
                    contact_app_type, contact_app_handle
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                account_holder_id, name.trim(), type.trim(), description || null, url || null,
                contact_person || null, contact_email || null, contact_phone || null,
                contact_app_type || null, contact_app_handle || null // Use new fields
            ]);
            // --- End Update ---

            // Respond with the newly created source including its ID
            res.status(201).json({
                id: result.lastID,
                account_holder_id, name, type, description, url,
                contact_person, contact_email, contact_phone,
                contact_app_type, contact_app_handle // Include new fields in response
            });
        } catch (error) {
            log(`[ERROR] Failed to add advice source: ${error.message}`);
            if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(409).json({ message: 'An advice source with this name and type already exists for this account holder.' });
            } else {
                res.status(500).json({ message: 'Error adding advice source.' });
            }
        }
    });

    /**
     * PUT /:id
     * Updates an existing advice source.
     * Now uses contact_app_type and contact_app_handle.
     */
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        // --- Updated destructuring ---
        const {
            name, type, description, url,
            contact_person, contact_email, contact_phone,
            contact_app_type, contact_app_handle // New fields
            // Note: account_holder_id is typically not changed via update
        } = req.body;
        // --- End Update ---

        if (!name || !type || name.trim() === '' || type.trim() === '') {
            return res.status(400).json({ message: 'Name and type are required.' });
        }

        try {
            // Check if the source exists before updating
            const existing = await db.get('SELECT id FROM advice_sources WHERE id = ?', [id]);
            if (!existing) {
                return res.status(404).json({ message: 'Advice source not found.' });
            }

            // --- Updated UPDATE query ---
            await db.run(`
                UPDATE advice_sources SET
                    name = ?, type = ?, description = ?, url = ?,
                    contact_person = ?, contact_email = ?, contact_phone = ?,
                    contact_app_type = ?, contact_app_handle = ?
                WHERE id = ?
            `, [
                name.trim(), type.trim(), description || null, url || null,
                contact_person || null, contact_email || null, contact_phone || null,
                contact_app_type || null, contact_app_handle || null, // Use new fields
                id
            ]);
            // --- End Update ---

            res.json({ message: 'Advice source updated successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to update advice source with ID ${id}: ${error.message}`);
             if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(409).json({ message: 'An advice source with this name and type already exists for this account holder.' });
            } else {
                res.status(500).json({ message: 'Error updating advice source.' });
            }
        }
    });

    /**
     * DELETE /:id
     * Deletes an advice source.
     * (No changes needed here)
     */
    router.delete('/:id', async (req, res) => {
        // ... DELETE logic remains the same ...
        // @ts-ignore
        const { id } = req.params;
        try {
            // Check if the source exists before deleting
             const existing = await db.get('SELECT id FROM advice_sources WHERE id = ?', [id]);
            if (!existing) {
                return res.status(404).json({ message: 'Advice source not found.' });
            }

            // Note: The FOREIGN KEY constraint `ON DELETE SET NULL` in `journal_entries`
            // and `transactions` will handle unlinking associated entries automatically.
            await db.run('DELETE FROM advice_sources WHERE id = ?', [id]);
            res.json({ message: 'Advice source deleted successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to delete advice source with ID ${id}: ${error.message}`);
            // Check if it's a foreign key constraint error (if not using ON DELETE SET NULL properly)
             if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                 res.status(400).json({ message: 'Cannot delete source as it is referenced by journal entries or transactions. Please handle related entries first.' });
             } else {
                res.status(500).json({ message: 'Error deleting advice source.' });
             }
        }
    });

    return router;
};
