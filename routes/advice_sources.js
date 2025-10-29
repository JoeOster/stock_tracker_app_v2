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
 * @param {function(string): void} [log=console.log] - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {

    /**
     * GET /
     * Fetches all advice sources for a specific account holder.
     * Expects `holder` query parameter.
     * @route GET /api/advice-sources
     * @group Advice Sources - Operations about advice sources
     * @param {string} holder.query.required - Account holder ID.
     * @returns {Array<object>} 200 - An array of advice source objects.
     * @returns {Error} 400 - Missing holder query parameter.
     * @returns {Error} 500 - Server error.
     */
    router.get('/', async (req, res) => {
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
     * Now uses contact_app_type, contact_app_handle, and image_path.
     * @route POST /api/advice-sources
     * @group Advice Sources - Operations about advice sources
     * @param {AdviceSourcePostBody.model} AdviceSourcePostBody.body.required - The advice source data.
     * @returns {object} 201 - The newly created advice source object.
     * @returns {Error} 400 - Missing required fields.
     * @returns {Error} 409 - Source with the same name and type already exists.
     * @returns {Error} 500 - Server error.
     */
    router.post('/', async (req, res) => {
        /**
         * @typedef {object} AdviceSourcePostBody
         * @property {string|number} account_holder_id
         * @property {string} name
         * @property {string} type
         * @property {string|null} [description]
         * @property {string|null} [url]
         * @property {string|null} [contact_person]
         * @property {string|null} [contact_email]
         * @property {string|null} [contact_phone]
         * @property {string|null} [contact_app_type]
         * @property {string|null} [contact_app_handle]
         * @property {string|null} [image_path]
         */

        /** @type {AdviceSourcePostBody} */
        const {
            account_holder_id, name, type, description, url,
            contact_person, contact_email, contact_phone,
            contact_app_type, contact_app_handle, image_path
        } = req.body;

        // Basic validation
        if (!account_holder_id || !name || !type || name.trim() === '' || type.trim() === '') {
            return res.status(400).json({ message: 'Account holder ID, name, and type are required.' });
        }

        try {
            const result = await db.run(`
                INSERT INTO advice_sources (
                    account_holder_id, name, type, description, url,
                    contact_person, contact_email, contact_phone,
                    contact_app_type, contact_app_handle, image_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                account_holder_id, name.trim(), type.trim(), description || null, url || null,
                contact_person || null, contact_email || null, contact_phone || null,
                contact_app_type || null, contact_app_handle || null,
                image_path || null // <-- Added image_path
            ]);

            // Respond with the newly created source including its ID and all fields
            res.status(201).json({
                id: result.lastID,
                account_holder_id, name: name.trim(), type: type.trim(), description: description || null, url: url || null,
                contact_person: contact_person || null, contact_email: contact_email || null, contact_phone: contact_phone || null,
                contact_app_type: contact_app_type || null, contact_app_handle: contact_app_handle || null,
                image_path: image_path || null // <-- Added image_path
            });
        } catch (error) {
            log(`[ERROR] Failed to add advice source: ${error.message}`);
            // @ts-ignore
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
     * Now uses contact_app_type, contact_app_handle, and image_path.
     * @route PUT /api/advice-sources/{id}
     * @group Advice Sources - Operations about advice sources
     * @param {string} id.path.required - The ID of the advice source.
     * @param {AdviceSourcePutBody.model} AdviceSourcePutBody.body.required - The updated advice source data.
     * @returns {object} 200 - Success message.
     * @returns {Error} 400 - Missing required fields.
     * @returns {Error} 404 - Source not found.
     * @returns {Error} 409 - Source with the same name and type already exists.
     * @returns {Error} 500 - Server error.
     */
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
         /**
         * @typedef {object} AdviceSourcePutBody
         * @property {string} name
         * @property {string} type
         * @property {string|null} [description]
         * @property {string|null} [url]
         * @property {string|null} [contact_person]
         * @property {string|null} [contact_email]
         * @property {string|null} [contact_phone]
         * @property {string|null} [contact_app_type]
         * @property {string|null} [contact_app_handle]
         * @property {string|null} [image_path]
         */

        /** @type {AdviceSourcePutBody} */
        const {
            name, type, description, url,
            contact_person, contact_email, contact_phone,
            contact_app_type, contact_app_handle, image_path
            // Note: account_holder_id is typically not changed via update
        } = req.body;

        if (!name || !type || name.trim() === '' || type.trim() === '') {
            return res.status(400).json({ message: 'Name and type are required.' });
        }

        try {
            // Check if the source exists before updating
            const existing = await db.get('SELECT id FROM advice_sources WHERE id = ?', [id]);
            if (!existing) {
                return res.status(404).json({ message: 'Advice source not found.' });
            }

            await db.run(`
                UPDATE advice_sources SET
                    name = ?, type = ?, description = ?, url = ?,
                    contact_person = ?, contact_email = ?, contact_phone = ?,
                    contact_app_type = ?, contact_app_handle = ?, image_path = ?
                WHERE id = ?
            `, [
                name.trim(), type.trim(), description || null, url || null,
                contact_person || null, contact_email || null, contact_phone || null,
                contact_app_type || null, contact_app_handle || null,
                image_path || null, // <-- Added image_path
                id
            ]);

            res.json({ message: 'Advice source updated successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to update advice source with ID ${id}: ${error.message}`);
            // @ts-ignore
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
     * @route DELETE /api/advice-sources/{id}
     * @group Advice Sources - Operations about advice sources
     * @param {string} id.path.required - The ID of the advice source.
     * @returns {object} 200 - Success message.
     * @returns {Error} 404 - Source not found.
     * @returns {Error} 400 - Source is in use (if FOREIGN KEY constraint prevents delete).
     * @returns {Error} 500 - Server error.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // Check if the source exists before deleting
             const existing = await db.get('SELECT id FROM advice_sources WHERE id = ?', [id]);
            if (!existing) {
                return res.status(404).json({ message: 'Advice source not found.' });
            }

            // Note: FOREIGN KEY constraints handle unlinking in other tables
            await db.run('DELETE FROM advice_sources WHERE id = ?', [id]);
            res.json({ message: 'Advice source deleted successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to delete advice source with ID ${id}: ${error.message}`);
            // @ts-ignore
             if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                 res.status(400).json({ message: 'Cannot delete source as it is referenced by other records. Please handle related entries first.' });
             } else {
                res.status(500).json({ message: 'Error deleting advice source.' });
             }
        }
    });

    return router;
};