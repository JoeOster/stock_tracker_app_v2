// /routes/documents.js
/**
 * @file Defines API routes for managing linked documents.
 * @module routes/documents
 */
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling document endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {

    /**
     * POST /
     * Creates a new document link, associated with either a journal entry OR an advice source.
     * Requires EITHER journal_entry_id OR advice_source_id.
     */
    router.post('/', async (req, res) => {
        const {
            journal_entry_id, // Nullable
            advice_source_id, // Nullable
            title,            // Optional
            document_type,    // Optional
            external_link,    // Required
            description       // Optional
            // account_holder_id might be needed if security rules change, but FKs handle ownership currently
        } = req.body;

        // --- Validation ---
        if (!external_link || external_link.trim() === '') {
            return res.status(400).json({ message: 'External link is required.' });
        }
        // Ensure at least one, but not both, foreign keys are provided
        const journalIdProvided = journal_entry_id !== null && journal_entry_id !== undefined;
        const sourceIdProvided = advice_source_id !== null && advice_source_id !== undefined;

        if (!journalIdProvided && !sourceIdProvided) {
            return res.status(400).json({ message: 'Document must be linked to either a Journal Entry ID or an Advice Source ID.' });
        }
        if (journalIdProvided && sourceIdProvided) {
            return res.status(400).json({ message: 'Document cannot be linked to both a Journal Entry ID and an Advice Source ID simultaneously.' });
        }
        // Basic URL validation (optional, can be stricter)
        if (!external_link.startsWith('http://') && !external_link.startsWith('https://')) {
            // Allow flexibility for now, maybe add stricter check later if needed
            // return res.status(400).json({ message: 'Please provide a valid URL starting with http:// or https://.' });
        }
        // --- End Validation ---

        try {
            const result = await db.run(`
                INSERT INTO documents (
                    journal_entry_id, advice_source_id, title, document_type,
                    external_link, description
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                journal_entry_id || null, // Ensure NULL is inserted if not provided
                advice_source_id || null, // Ensure NULL is inserted if not provided
                title || null,
                document_type || null,
                external_link.trim(),
                description || null
            ]);

            const newDocument = await db.get('SELECT * FROM documents WHERE id = ?', result.lastID);
            res.status(201).json(newDocument); // Respond with the created document

        } catch (error) {
            log(`[ERROR] Failed to add document: ${error.message}`);
            // Check for specific foreign key constraint errors
            if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                 if (journalIdProvided) {
                    return res.status(404).json({ message: `Journal Entry with ID ${journal_entry_id} not found.` });
                 } else if (sourceIdProvided) {
                     return res.status(404).json({ message: `Advice Source with ID ${advice_source_id} not found.` });
                 }
            }
            res.status(500).json({ message: 'Error adding document.' });
        }
    });

    /**
     * DELETE /:id
     * Deletes a document link.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        // Optional: Check ownership based on linked journal/source and account holder if auth is added

        try {
            const result = await db.run('DELETE FROM documents WHERE id = ?', [id]);

            if (result.changes === 0) {
                return res.status(404).json({ message: 'Document not found.' });
            }

            res.json({ message: 'Document deleted successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to delete document with ID ${id}: ${error.message}`);
            res.status(500).json({ message: 'Error deleting document.' });
        }
    });

    // Potential future endpoints:
    // GET /?journal_entry_id=X  (Fetch docs for a journal entry) - Covered by /api/sources/:id/details currently
    // GET /?advice_source_id=Y  (Fetch docs for a source) - Covered by /api/sources/:id/details currently
    // PUT /:id                 (Update document details)

    return router;
};

