// /routes/sources.js
/**
 * @file Creates and returns an Express router for fetching aggregated source-centric details.
 * @module routes/sources
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for aggregated source details.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
    // Base path for these routes is '/api/sources'

    /**
     * @route GET /api/sources/:id/details
     * @group Sources - Aggregated source-centric operations
     * @description Fetches all related data for a single advice source (journal entries, watchlist, txns, etc.).
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} holder.query.required - The account holder ID.
     * @returns {object} 200 - An object containing all related data. 404/500 - Error message.
     */
    router.get('/:id/details', async (req, res) => {
        const { id } = req.params;
        const holderId = req.query.holder;

        if (!holderId || holderId === 'all') {
            return res.status(400).json({ message: 'A specific account holder ID is required.' });
        }

        try {
            // 1. Get the source itself
            const source = await db.get('SELECT * FROM advice_sources WHERE id = ? AND account_holder_id = ?', [id, holderId]);
            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }
            
            // --- MIGRATE: Parse 'details' JSON ---
            if (source.details) {
                try {
                    source.details = JSON.parse(source.details);
                } catch (e) {
                    log(`[ERROR] Failed to parse details JSON for source ID ${source.id}: ${e.message}`);
                    source.details = null;
                }
            }
            // --- END MIGRATE ---

            // 2. Get all journal entries (techniques/strategies) linked to this source
            const journalEntries = await db.all(
                `SELECT j.*, s.name as strategy_name 
                 FROM journal_entries j
                 LEFT JOIN strategies s ON j.strategy_id = s.id
                 WHERE j.advice_source_id = ? AND j.account_holder_id = ?
                 ORDER BY j.entry_date DESC`,
                [id, holderId]
            );
            
            // --- MIGRATE: Get IDs of all journal entries for the next query ---
            const journalEntryIds = journalEntries.map(j => j.id);
            // --- END MIGRATE ---

            // 3. Get all 'OPEN' watchlist items (trade ideas)
            // --- MIGRATE: Update query to fetch items linked to the source OR any of its journal entries ---
            let watchlistItems = [];
            if (journalEntryIds.length > 0) {
                const placeholders = journalEntryIds.map(() => '?').join(',');
                watchlistItems = await db.all(
                    `SELECT * FROM watchlist 
                     WHERE account_holder_id = ? AND status = 'OPEN' 
                     AND (advice_source_id = ? OR journal_entry_id IN (${placeholders}))
                     ORDER BY created_at DESC`,
                    [holderId, id, ...journalEntryIds]
                );
            } else {
                // No journal entries, just fetch items linked to the source
                watchlistItems = await db.all(
                    `SELECT * FROM watchlist 
                     WHERE account_holder_id = ? AND status = 'OPEN' AND advice_source_id = ?
                     ORDER BY created_at DESC`,
                    [holderId, id]
                );
            }
            // --- END MIGRATE ---

            // 4. Get all transactions (real trades) linked to this source
            const linkedTransactions = await db.all(
                `SELECT * FROM transactions 
                 WHERE advice_source_id = ? AND account_holder_id = ?
                 ORDER BY transaction_date DESC`,
                [id, holderId]
            );

            // 5. Get all documents linked to this source
            const documents = await db.all(
                'SELECT * FROM documents WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY created_at DESC',
                [id, holderId]
            );

            // 6. Get all notes for this source
            const sourceNotes = await db.all(
                'SELECT * FROM source_notes WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY created_at DESC',
                [id, holderId]
            );
            
            // 7. Calculate summary stats
            // Note: This only counts *direct* links. We may want to expand this.
            const stats = await db.get(
                `SELECT 
                    COUNT(DISTINCT id) as total_journal_entries,
                    (SELECT COUNT(*) FROM watchlist WHERE advice_source_id = j.advice_source_id AND status = 'OPEN') as open_watchlist_items,
                    (SELECT COUNT(*) FROM transactions WHERE advice_source_id = j.advice_source_id) as total_transactions
                 FROM journal_entries j
                 WHERE j.advice_source_id = ? AND j.account_holder_id = ?`,
                [id, holderId]
            );
            
            // Handle case where there are no journal entries but other links exist
            if (stats.total_journal_entries === 0) {
                 stats.open_watchlist_items = watchlistItems.length;
                 stats.total_transactions = linkedTransactions.length;
            }

            const summaryStats = {
                totalJournalEntries: stats.total_journal_entries || 0,
                openWatchlistItems: stats.open_watchlist_items || 0,
                totalTransactions: stats.total_transactions || 0,
                totalDocuments: documents.length || 0,
                totalNotes: sourceNotes.length || 0
            };

            res.json({
                source,
                journalEntries,
                watchlistItems,
                linkedTransactions,
                documents,
                sourceNotes,
                summaryStats
            });

        } catch (e) {
            log(`[ERROR] Failed to fetch source details for ID ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error fetching source details.' });
        }
    });

    /**
     * @route POST /api/sources/:id/notes
     * @group Sources - Aggregated source-centric operations
     * @description Adds a new note to a specific advice source.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {object} req.body.required - The note data.
     * @param {string|number} req.body.holderId - The account holder ID.
     * @param {string} req.body.note_content - The content of the note.
     * @returns {object} 201 - The newly created note. 400/500 - Error message.
     */
    router.post('/:id/notes', async (req, res) => {
        const { id } = req.params;
        const { holderId, note_content } = req.body;

        if (!holderId || !note_content) {
            return res.status(400).json({ message: 'Account Holder ID and note content are required.' });
        }

        try {
            const createdAt = new Date().toISOString();
            const query = `
                INSERT INTO source_notes (advice_source_id, account_holder_id, note_content, created_at)
                VALUES (?, ?, ?, ?)
            `;
            const result = await db.run(query, [id, holderId, note_content, createdAt]);
            
            const newNoteId = result.lastID;
            const newNote = await db.get('SELECT * FROM source_notes WHERE id = ?', newNoteId);
            
            res.status(201).json(newNote);
        } catch (e) {
            log(`[ERROR] Failed to add note to source ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while adding note.' });
        }
    });

    /**
     * @route PUT /api/sources/:id/notes/:noteId
     * @group Sources - Aggregated source-centric operations
     * @description Updates an existing note.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} noteId.path.required - The ID of the note to update.
     * @param {object} req.body.required - The updated note data.
     * @param {string|number} req.body.holderId - The account holder ID (for verification).
     * @param {string} req.body.note_content - The new content of the note.
     * @returns {object} 200 - Success message. 400/404/500 - Error message.
     */
    router.put('/:id/notes/:noteId', async (req, res) => {
        const { id, noteId } = req.params;
        const { holderId, note_content } = req.body;

        if (!holderId || note_content === undefined) {
            return res.status(400).json({ message: 'Account Holder ID and note content are required.' });
        }

        try {
            const query = `
                UPDATE source_notes 
                SET note_content = ?
                WHERE id = ? AND advice_source_id = ? AND account_holder_id = ?
            `;
            const result = await db.run(query, [note_content, noteId, id, holderId]);

            if (result.changes === 0) {
                return res.status(404).json({ message: 'Note not found or you do not have permission to edit it.' });
            }

            res.json({ message: 'Note updated successfully.' });
        } catch (e) {
            log(`[ERROR] Failed to update note ${noteId} for source ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while updating note.' });
        }
    });

    /**
     * @route DELETE /api/sources/:id/notes/:noteId
     * @group Sources - Aggregated source-centric operations
     * @description Deletes a note.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} noteId.path.required - The ID of the note to delete.
     * @param {object} req.body.required - Body containing holder ID.
     * @param {string|number} req.body.holderId - The account holder ID (for verification).
     * @returns {object} 200 - Success message. 400/404/500 - Error message.
     */
    router.delete('/:id/notes/:noteId', async (req, res) => {
        const { id, noteId } = req.params;
        const { holderId } = req.body; // Get holderId from body for DELETE

        if (!holderId) {
            return res.status(400).json({ message: 'Account Holder ID is required for verification.' });
        }

        try {
            const query = `
                DELETE FROM source_notes
                WHERE id = ? AND advice_source_id = ? AND account_holder_id = ?
            `;
            const result = await db.run(query, [noteId, id, holderId]);

            if (result.changes === 0) {
                return res.status(404).json({ message: 'Note not found or you do not have permission to delete it.' });
            }

            res.json({ message: 'Note deleted successfully.' });
        } catch (e) {
            log(`[ERROR] Failed to delete note ${noteId} for source ${id}: ${e.message}\n${e.stack}`);
            res.status(500).json({ message: 'Server error while deleting note.' });
        }
    });

    return router;
};
