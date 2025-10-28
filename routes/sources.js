// /routes/sources.js
// Version Updated (Add PUT endpoint for source notes)
/**
 * @file Defines API routes for managing advice sources and their details.
 * @module routes/sources
 */
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling advice source detail endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {

    /**
     * GET /:id/details
     * Fetches details for a specific advice source, including linked journal entries,
     * watchlist items, documents, and source notes.
     * Expects `holder` query parameter for context/permissions.
     */
    router.get('/:id/details', async (req, res) => {
        // ... (implementation remains the same) ...
        const sourceId = req.params.id;
        const holderId = req.query.holder;

        if (!sourceId || !holderId || holderId === 'all') {
            return res.status(400).json({ message: 'Source ID and a specific Account Holder ID query parameter are required.' });
        }

        try {
            const [source, journalEntries, watchlistItems, documents, sourceNotes] = await Promise.all([
                db.get('SELECT * FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]),
                db.all('SELECT * FROM journal_entries WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY entry_date DESC', [sourceId, holderId]),
                db.all('SELECT * FROM watchlist WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY ticker', [sourceId, holderId]),
                db.all('SELECT * FROM documents WHERE advice_source_id = ? ORDER BY created_at DESC', [sourceId]),
                db.all('SELECT * FROM source_notes WHERE advice_source_id = ? ORDER BY created_at DESC', [sourceId])
            ]);

            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            res.json({
                source,
                journalEntries,
                watchlistItems,
                documents,
                sourceNotes
            });
        } catch (error) {
            log(`[ERROR] Failed to fetch details for source ${sourceId}: ${error.message}`);
            res.status(500).json({ message: 'Error fetching source details.' });
        }
    });

    /**
     * POST /:id/notes
     * Creates a new note linked to a specific advice source.
     * Expects `holderId` (for validation) and `noteContent` in the request body.
     */
    router.post('/:id/notes', async (req, res) => {
        // ... (implementation remains the same) ...
        const sourceId = req.params.id;
        const { holderId, noteContent } = req.body;

        if (!sourceId || !holderId || !noteContent || noteContent.trim() === '') {
            return res.status(400).json({ message: 'Source ID, Account Holder ID, and Note Content are required.' });
        }

        try {
            const source = await db.get('SELECT id FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]);
            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            const result = await db.run(
                'INSERT INTO source_notes (advice_source_id, note_content) VALUES (?, ?)',
                [sourceId, noteContent.trim()]
            );

            const newNote = await db.get('SELECT * FROM source_notes WHERE id = ?', result.lastID);
            res.status(201).json(newNote);

        } catch (error) {
            log(`[ERROR] Failed to add note for source ${sourceId}: ${error.message}`);
            res.status(500).json({ message: 'Error adding source note.' });
        }
    });

    /**
     * PUT /:id/notes/:noteId
     * Updates a specific note linked to an advice source.
     * Expects `holderId` (for validation) and `noteContent` in the request body.
     */
    router.put('/:id/notes/:noteId', async (req, res) => {
        const sourceId = req.params.id;
        const noteId = req.params.noteId;
        const { holderId, noteContent } = req.body; // Expect holderId for validation

        if (!sourceId || !noteId || !holderId || !noteContent || noteContent.trim() === '') {
            return res.status(400).json({ message: 'Source ID, Note ID, Account Holder ID, and Note Content are required.' });
        }

        try {
            // Validate that the source exists and belongs to the holder
            const source = await db.get('SELECT id FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]);
            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            // Update the note, ensuring it belongs to the correct source
            // Also update the updated_at timestamp
            const result = await db.run(
                'UPDATE source_notes SET note_content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND advice_source_id = ?',
                [noteContent.trim(), noteId, sourceId]
            );

            if (result.changes === 0) {
                 // Note didn't exist or didn't belong to this source
                 return res.status(404).json({ message: 'Note not found for this source.' });
            }

             // Fetch the updated note to return it
            const updatedNote = await db.get('SELECT * FROM source_notes WHERE id = ?', noteId);
            res.status(200).json(updatedNote); // Return the updated note

        } catch (error) {
            log(`[ERROR] Failed to update note ${noteId} for source ${sourceId}: ${error.message}`);
            res.status(500).json({ message: 'Error updating source note.' });
        }
    });


    /**
     * DELETE /:id/notes/:noteId
     * Deletes a specific note linked to an advice source.
     * Expects `holderId` in the query parameters for validation.
     */
    router.delete('/:id/notes/:noteId', async (req, res) => {
        // ... (implementation remains the same) ...
        const sourceId = req.params.id;
        const noteId = req.params.noteId;
        const holderId = req.query.holder;

        if (!sourceId || !noteId || !holderId) {
            return res.status(400).json({ message: 'Source ID, Note ID, and Account Holder ID (query param) are required.' });
        }

        try {
            const source = await db.get('SELECT id FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]);
            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            const result = await db.run(
                'DELETE FROM source_notes WHERE id = ? AND advice_source_id = ?',
                [noteId, sourceId]
            );

            if (result.changes === 0) {
                 return res.status(404).json({ message: 'Note not found for this source.' });
            }

            res.status(200).json({ message: 'Note deleted successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to delete note ${noteId} for source ${sourceId}: ${error.message}`);
            res.status(500).json({ message: 'Error deleting source note.' });
        }
    });

    return router;
};

