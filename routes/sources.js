// /routes/sources.js
/**
 * @file Defines API routes for managing advice sources and their details.
 * @module routes/sources
 */
const express = require('express');
const router = express.Router();
const { getPrices } = require('../services/priceService'); // Import price service for P/L calculation

/**
 * Creates and returns an Express router for handling advice source detail endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} [log=console.log] - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {

    /**
     * GET /:id/details
     * Fetches details for a specific advice source, including linked items and calculated summary statistics.
     * @route GET /api/sources/{id}/details
     * @group Sources - Operations about source details
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} holder.query.required - Account holder ID.
     * @returns {object} 200 - An object containing source details, linked items, and summary stats.
     * @returns {object} 400 - An object with an error message for missing ID or holder.
     * @returns {object} 404 - An object with an error message if the source is not found.
     * @returns {object} 500 - An object with an error message for server errors.
     */
    router.get('/:id/details', async (req, res) => {
        const sourceId = req.params.id;
        const holderId = req.query.holder;

        if (!sourceId || !holderId || holderId === 'all') {
            return res.status(400).json({ message: 'Source ID and a specific Account Holder ID query parameter are required.' });
        }

        try {
            const [source, journalEntries, watchlistItems, documents, sourceNotes] = await Promise.all([
                db.get('SELECT *, image_path FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]),
                db.all('SELECT * FROM journal_entries WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY entry_date DESC', [sourceId, holderId]),
                // <-- Select all columns from watchlist -->
                db.all('SELECT * FROM watchlist WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY ticker', [sourceId, holderId]),
                db.all('SELECT * FROM documents WHERE advice_source_id = ? ORDER BY created_at DESC', [sourceId]),
                db.all('SELECT * FROM source_notes WHERE advice_source_id = ? ORDER BY created_at DESC', [sourceId])
            ]);

            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            // --- Calculate Summary Statistics ---
            let totalTrades = journalEntries.length;
            let totalInvestment = 0;
            let totalUnrealizedPL = 0;
            let totalRealizedPL = 0;
            let openTradeTickers = [];

            journalEntries.forEach(entry => {
                if (entry.status === 'OPEN') {
                    totalInvestment += (entry.entry_price * entry.quantity);
                    openTradeTickers.push(entry.ticker);
                    // Placeholder for unrealized - will be calculated after fetching prices
                } else if (['CLOSED', 'EXECUTED'].includes(entry.status) && entry.pnl !== null) {
                    totalRealizedPL += entry.pnl;
                }
            });

            // Fetch current prices for open trades to calculate unrealized P/L
            const uniqueOpenTickers = [...new Set(openTradeTickers)];
            if (uniqueOpenTickers.length > 0) {
                const priceData = await getPrices(uniqueOpenTickers, 6); // Use moderate priority
                journalEntries.forEach(entry => {
                    if (entry.status === 'OPEN') {
                        const currentPriceInfo = priceData[entry.ticker];
                        if (currentPriceInfo && typeof currentPriceInfo.price === 'number') {
                            const currentPrice = currentPriceInfo.price;
                            let currentPnl = 0;
                            if (entry.direction === 'BUY') {
                                currentPnl = (currentPrice - entry.entry_price) * entry.quantity;
                            } // Add SELL logic if needed later
                            entry.current_pnl = currentPnl; // Add to entry object for frontend table
                            totalUnrealizedPL += currentPnl;
                        } else {
                            entry.current_pnl = null; // Mark as null if price unavailable
                        }
                    }
                });
            }
            // --- End Calculation ---

            res.json({
                source,
                journalEntries, // Still send all entries, frontend will filter
                watchlistItems,
                documents,
                sourceNotes,
                summaryStats: { // Send calculated stats
                    totalTrades,
                    totalInvestment,
                    totalUnrealizedPL,
                    totalRealizedPL
                }
            });
        } catch (error) {
            log(`[ERROR] Failed to fetch details for source ${sourceId}: ${error.message}`);
            res.status(500).json({ message: 'Error fetching source details.' });
        }
    });

    // ... (rest of the routes: /:id/notes, /:id/notes/:noteId) ...
    /**
     * POST /:id/notes
     * Creates a new note linked to a specific advice source.
     * @route POST /api/sources/{id}/notes
     * @group Sources - Operations about source details
     * @param {string} id.path.required - The ID of the advice source.
     * @param {object} NotePostBody.body.required - Note data ({ holderId: string|number, noteContent: string }).
     * @returns {object} 201 - The newly created note object.
     * 400 - An object with an error message for missing fields.
     * 404 - An object with an error message if the source is not found.
     * 500 - An object with an error message for server errors.
     */
    router.post('/:id/notes', async (req, res) => {
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
     * @route PUT /api/sources/{id}/notes/{noteId}
     * @group Sources - Operations about source details
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} noteId.path.required - The ID of the note.
     * @param {object} NotePutBody.body.required - Note update data ({ holderId: string|number, noteContent: string }).
     * @returns {object} 200 - The updated note object.
     * 400 - An object with an error message for missing fields.
     * 404 - An object with an error message if the source or note is not found.
     * 500 - An object with an error message for server errors.
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
     * @route DELETE /api/sources/{id}/notes/{noteId}
     * @group Sources - Operations about source details
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} noteId.path.required - The ID of the note.
     * @param {object} NoteDeleteBody.body.required - Body containing holderId ({ holderId: string|number }).
     * @returns {object} 200 - An object with a success message.
     * 400 - An object with an error message for missing fields.
     * 404 - An object with an error message if the source or note is not found.
     * 500 - An object with an error message for server errors.
     */
    router.delete('/:id/notes/:noteId', async (req, res) => {
        const sourceId = req.params.id;
        const noteId = req.params.noteId;
        // Get holderId from request body for DELETE consistency
        const { holderId } = req.body;

        if (!sourceId || !noteId || !holderId) {
            return res.status(400).json({ message: 'Source ID, Note ID, and Account Holder ID (body param) are required.' });
        }

        try {
            // Validate that the source exists and belongs to the holder
            const source = await db.get('SELECT id FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]);
            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            // Ensure the note belongs to this source before deleting
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