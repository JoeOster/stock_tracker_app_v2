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
     * @route GET /api/sources/:id/details
     * @group Sources - Operations about source details
     * @description Fetches details for a specific advice source, including linked items and calculated summary statistics.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} holder.query.required - Account holder ID.
     * @returns {object} 200 - An object containing source details, linked items, and summary stats. 400 - Error message for missing ID or holder. 404 - Error message if the source is not found. 500 - Error message for server errors.
     */
    router.get('/:id/details', async (req, res) => {
        const sourceId = req.params.id;
        const holderId = req.query.holder;

        if (!sourceId || !holderId || holderId === 'all') {
            return res.status(400).json({ message: 'Source ID and a specific Account Holder ID query parameter are required.' });
        }

        try {
            // Query for real transactions linked to this source
            const linkedTransactionsQuery = `
                SELECT 
                    t.*, 
                    b.price as parent_buy_price,
                    j.entry_reason as technique_name
                FROM transactions t
                LEFT JOIN transactions b ON t.parent_buy_id = b.id AND b.transaction_type = 'BUY'
                LEFT JOIN journal_entries j ON t.linked_journal_id = j.id
                WHERE t.advice_source_id = ? 
                  AND t.account_holder_id = ?
                ORDER BY t.transaction_date DESC, t.id DESC
            `;

            // --- UPDATED: Filter watchlist items by status = 'OPEN' ---
            const watchlistQuery = `
                SELECT * FROM watchlist 
                WHERE advice_source_id = ? AND account_holder_id = ? AND status = 'OPEN' 
                ORDER BY ticker
            `;

            const [source, journalEntries, watchlistItems, documents, sourceNotes, linkedTransactions] = await Promise.all([
                db.get('SELECT *, image_path FROM advice_sources WHERE id = ? AND account_holder_id = ?', [sourceId, holderId]),
                db.all('SELECT * FROM journal_entries WHERE advice_source_id = ? AND account_holder_id = ? ORDER BY entry_date DESC', [sourceId, holderId]),
                db.all(watchlistQuery, [sourceId, holderId]), // Use updated query
                db.all('SELECT * FROM documents WHERE advice_source_id = ? ORDER BY created_at DESC', [sourceId]),
                db.all('SELECT * FROM source_notes WHERE advice_source_id = ? ORDER BY created_at DESC', [sourceId]),
                db.all(linkedTransactionsQuery, [sourceId, holderId]) // Fetch real transactions
            ]);

            if (!source) {
                return res.status(404).json({ message: 'Advice source not found for this account holder.' });
            }

            // --- Calculate Summary Statistics ---
            let totalTrades = journalEntries.length;
            let totalInvestment = 0;
            let totalUnrealizedPL = 0;
            let totalRealizedPL = 0;
            
            // Use a Set to gather all tickers that need pricing
            let tickersToPrice = new Set();

            journalEntries.forEach(entry => {
                if (entry.status === 'OPEN') {
                    // Only count "non-general" trades for paper stats
                    if (entry.ticker.toUpperCase() !== 'GENERAL' && entry.ticker.toUpperCase() !== 'N/A') {
                        totalInvestment += (entry.entry_price * entry.quantity);
                        tickersToPrice.add(entry.ticker); // Add journal ticker
                    }
                } else if (['CLOSED', 'EXECUTED'].includes(entry.status) && entry.pnl !== null) {
                    totalRealizedPL += entry.pnl;
                }
            });

            // Add tickers from *open* BUY transactions
            linkedTransactions.forEach(tx => {
                if (tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001) {
                    tickersToPrice.add(tx.ticker); // Add real trade ticker
                }
            });

            // --- ADDED: Add tickers from watchlist items ---
            watchlistItems.forEach(item => {
                tickersToPrice.add(item.ticker);
            });

            // Fetch current prices for open paper trades AND open real trades
            const uniqueTickers = [...tickersToPrice]; // Convert Set to array
            if (uniqueTickers.length > 0) {
                const priceData = await getPrices(uniqueTickers, 6); // Use moderate priority
                
                // Calculate P/L for open journal entries
                journalEntries.forEach(entry => {
                    if (entry.status === 'OPEN') {
                        // Skip "general" trades
                        if (entry.ticker.toUpperCase() === 'GENERAL' || entry.ticker.toUpperCase() === 'N/A') {
                             entry.current_pnl = null;
                             return;
                        }
                        
                        const currentPriceInfo = priceData[entry.ticker];
                        if (currentPriceInfo && typeof currentPriceInfo.price === 'number') {
                            const currentPrice = currentPriceInfo.price;
                            let currentPnl = 0;
                            if (entry.direction === 'BUY') {
                                currentPnl = (currentPrice - entry.entry_price) * entry.quantity;
                            } // Add SELL logic if needed later
                            entry.current_pnl = currentPnl; // Add to entry object for frontend table
                            totalUnrealizedPL += currentPnl; // Add to paper trade stats
                        } else {
                            entry.current_pnl = null; // Mark as null if price unavailable
                        }
                    }
                });

                // Calculate P/L for real transactions
                linkedTransactions.forEach(tx => {
                    if (tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001) {
                        // It's an open BUY lot
                        const currentPriceInfo = priceData[tx.ticker];
                        if (currentPriceInfo && typeof currentPriceInfo.price === 'number') {
                            const currentPrice = currentPriceInfo.price;
                            tx.current_price = currentPrice;
                            tx.unrealized_pnl = (currentPrice - tx.price) * tx.quantity_remaining;
                        } else {
                            tx.current_price = null;
                            tx.unrealized_pnl = null;
                        }
                    } else if (tx.transaction_type === 'SELL') {
                        // It's a SELL, calculate realized P/L
                        if (tx.parent_buy_price !== null) {
                            tx.realized_pnl = (tx.price - tx.parent_buy_price) * tx.quantity;
                        } else {
                            tx.realized_pnl = null; // Should not happen if data is clean
                        }
                    }
                });
            }
            // --- End Calculation ---

            res.json({
                source,
                journalEntries,
                watchlistItems,
                documents,
                sourceNotes,
                linkedTransactions, // <-- Send real transactions to frontend
                summaryStats: { 
                    totalTrades,
                    totalInvestment,
                    totalUnrealizedPL,
                    totalRealizedPL
                }
            });
        } catch (error) {
            // @ts-ignore
            log(`[ERROR] Failed to fetch details for source ${sourceId}: ${error.message}`);
            // @ts-ignore
            res.status(500).json({ message: `Error fetching source details: ${error.message}` });
        }
    });

    /**
     * @typedef {object} NotePostBody
     * @property {string|number} holderId
     * @property {string} noteContent
     */

    /**
     * @route POST /api/sources/:id/notes
     * @group Sources - Operations about source details
     * @description Creates a new note linked to a specific advice source.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {NotePostBody} req.body.required - Note data.
     * @returns {object} 201 - The newly created note object. 400 - Error message for missing fields. 404 - Error message if the source is not found. 500 - Error message for server errors.
     */
    router.post('/:id/notes', async (req, res) => {
        const sourceId = req.params.id;
        const { holderId, note_content: noteContent } = req.body; // Match frontend property name

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
            // @ts-ignore
            log(`[ERROR] Failed to add note for source ${sourceId}: ${error.message}`);
            // @ts-ignore
            res.status(500).json({ message: `Error adding source note: ${error.message}` });
        }
    });

    /**
     * @typedef {object} NotePutBody
     * @property {string|number} holderId
     * @property {string} note_content
     */

    /**
     * @route PUT /api/sources/:id/notes/:noteId
     * @group Sources - Operations about source details
     * @description Updates a specific note linked to an advice source.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} noteId.path.required - The ID of the note.
     * @param {NotePutBody} req.body.required - Note update data.
     * @returns {object} 200 - The updated note object. 400 - Error message for missing fields. 404 - Error message if the source or note is not found. 500 - Error message for server errors.
     */
    router.put('/:id/notes/:noteId', async (req, res) => {
        const sourceId = req.params.id;
        const noteId = req.params.noteId;
        const { holderId, note_content: noteContent } = req.body; // Match frontend property name

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
            // @ts-ignore
            log(`[ERROR] Failed to update note ${noteId} for source ${sourceId}: ${error.message}`);
            // @ts-ignore
            res.status(500).json({ message: `Error updating source note: ${error.message}` });
        }
    });

    /**
     * @typedef {object} NoteDeleteBody
     * @property {string|number} holderId
     */

    /**
     * @route DELETE /api/sources/:id/notes/:noteId
     * @group Sources - Operations about source details
     * @description Deletes a specific note linked to an advice source.
     * @param {string} id.path.required - The ID of the advice source.
     * @param {string} noteId.path.required - The ID of the note.
     * @param {NoteDeleteBody} req.body.required - Body containing holderId.
     * @returns {object} 200 - Success message. 400 - Error message for missing fields. 404 - Error message if the source or note is not found. 500 - Error message for server errors.
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
            // @ts-ignore
            log(`[ERROR] Failed to delete note ${noteId} for source ${sourceId}: ${error.message}`);
            // @ts-ignore
            res.status(500).json({ message: `Error deleting source note: ${error.message}` });
        }
    });

    return router;
};