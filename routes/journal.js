// routes/journal.js
/**
 * @file Defines API routes for managing journal entries.
 * @module routes/journal
 */
const express = require('express');
const router = express.Router();
const { getPrices } = require('../services/priceService'); // Import price service for P/L calculation

/**
 * Creates and returns an Express router for handling journal entry endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} [log=console.log] - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {

    /**
     * @route GET /api/journal/
     * @group Journal - Operations for journal entries
     * @description Fetches journal entries for a specific account holder, optionally filtered by status.
     * Also fetches current prices for 'OPEN' entries to calculate current P/L.
     * @param {string} holder.query.required - Account holder ID.
     * @param {'OPEN' | 'CLOSED' | 'EXECUTED' | 'CANCELLED'} [status.query] - Optional status filter.
     * @returns {Array<object>} 200 - An array of journal entry objects.
     * 400 - Error message if holder ID is missing.
     * 500 - Error message for server errors.
     */
    router.get('/', async (req, res) => {
        const holderId = req.query.holder;
        const statusFilter = req.query.status; // e.g., 'OPEN', 'CLOSED'

        if (!holderId) {
            return res.status(400).json({ message: 'Account holder ID query parameter is required.' });
        }

        try {
            let query = `
                SELECT j.*, a.name as advice_source_name
                FROM journal_entries j
                LEFT JOIN advice_sources a ON j.advice_source_id = a.id
                WHERE j.account_holder_id = ?
            `;
            const params = [holderId];

            if (statusFilter) {
                query += ' AND j.status = ?';
                params.push(statusFilter);
            } else {
                 // Default to fetching OPEN and CLOSED/EXECUTED/CANCELLED separately if no filter
                 // Modify this if you want a single endpoint to return all by default
                 query += ' AND j.status = ?'; // Default to OPEN if no status specified
                 params.push('OPEN');
            }

            query += ' ORDER BY j.entry_date DESC, j.created_at DESC';

            const entries = await db.all(query, params);

            // If fetching OPEN entries, get current prices to calculate P/L
            if (statusFilter === 'OPEN' || !statusFilter) {
                 const openEntries = statusFilter === 'OPEN' ? entries : entries.filter(e => e.status === 'OPEN');
                 if (openEntries.length > 0) {
                     const uniqueTickers = [...new Set(openEntries.map(e => e.ticker))];
                     // Use a moderate priority for journal price checks
                     const priceData = await getPrices(uniqueTickers, 6);

                     openEntries.forEach(entry => {
                         const currentPriceInfo = priceData[entry.ticker];
                         if (currentPriceInfo && typeof currentPriceInfo.price === 'number') {
                            entry.current_price = currentPriceInfo.price;
                            // Calculate P/L based on direction (assuming BUY for now)
                            if (entry.direction === 'BUY') {
                                entry.current_pnl = (entry.current_price - entry.entry_price) * entry.quantity;
                            } else {
                                // Add logic for SELL (short) P/L if needed later
                                entry.current_pnl = null; // Placeholder
                            }
                         } else {
                             entry.current_price = null;
                             entry.current_pnl = null;
                         }
                     });
                 }
            }


            res.json(entries);
        } catch (error) {
            log(`[ERROR] Failed to fetch journal entries for holder ${holderId}: ${error.message}`);
            res.status(500).json({ message: 'Error fetching journal entries.' });
        }
    });

    /**
     * @typedef {object} JournalEntryPostBody
     * @property {string|number} account_holder_id
     * @property {string|number|null} [advice_source_id]
     * @property {string} entry_date
     * @property {string} ticker
     * @property {string} exchange
     * @property {'BUY'|'SELL'} direction
     * @property {string|number} quantity
     * @property {string|number} entry_price
     * @property {string|number|null} [target_price]
     * @property {string|number|null} [target_price_2] - *** ADDED ***
     * @property {string|number|null} [stop_loss_price]
     * @property {string|null} [advice_source_details]
     * @property {string|null} [entry_reason]
     * @property {string|null} [notes]
     * @property {string|null} [tags]
     * @property {string|null} [chart_type]
     */

    /**
     * @route POST /api/journal/
     * @group Journal - Operations for journal entries
     * @description Creates a new journal entry.
     * @param {JournalEntryPostBody.model} req.body.required - The journal entry data.
     * @returns {object} 201 - The newly created journal entry object.
     * 400 - Error message for missing or invalid fields.
     * 500 - Error message for server errors.
     */
    router.post('/', async (req, res) => {
        const {
            account_holder_id, advice_source_id, entry_date, ticker, exchange,
            direction, quantity, entry_price, target_price,
            target_price_2, // *** ADDED ***
            stop_loss_price,
            advice_source_details, entry_reason, notes, tags,
            chart_type
        } = req.body;

        // Basic validation
        if (!account_holder_id || !entry_date || !ticker || !exchange || !direction || !quantity || !entry_price) {
            return res.status(400).json({ message: 'Missing required fields for journal entry.' });
        }
        if (direction !== 'BUY' && direction !== 'SELL') {
             return res.status(400).json({ message: 'Direction must be BUY or SELL.' });
        }
         const numQuantity = parseFloat(quantity);
         const numEntryPrice = parseFloat(entry_price);
         // --- MODIFICATION: Allow 0 or positive quantity ---
         if (isNaN(numQuantity) || numQuantity < 0 || isNaN(numEntryPrice) || numEntryPrice <= 0) {
              return res.status(400).json({ message: 'Quantity must be 0 or positive, and Entry Price must be a valid positive number.' });
         }
         // --- END MODIFICATION ---

        try {
            const result = await db.run(`
                INSERT INTO journal_entries (
                    account_holder_id, advice_source_id, entry_date, ticker, exchange,
                    direction, quantity, entry_price, target_price,
                    target_price_2, -- *** ADDED ***
                    stop_loss_price,
                    advice_source_details, entry_reason, notes, tags, status,
                    chart_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                account_holder_id, advice_source_id || null, entry_date, ticker.toUpperCase().trim(), exchange,
                direction, numQuantity, numEntryPrice, target_price || null,
                target_price_2 || null, // *** ADDED ***
                stop_loss_price || null,
                advice_source_details || null, entry_reason || null, notes || null, tags || null, 'OPEN', // Default status
                chart_type || null
            ]);

             const newEntry = await db.get('SELECT * FROM journal_entries WHERE id = ?', result.lastID);
            res.status(201).json(newEntry); // Respond with the created entry

        } catch (error) {
            log(`[ERROR] Failed to add journal entry: ${error.message}`);
            res.status(500).json({ message: 'Error adding journal entry.' });
        }
    });

    /**
     * @route PUT /api/journal/:id
     * @group Journal - Operations for journal entries
     * @description Updates an existing journal entry (e.g., closing a trade, changing status, updating notes).
     * @param {string} id.path.required - The ID of the journal entry.
     * @param {object} req.body.required - The fields to update. Can be a partial object.
     * @returns {object} 200 - Success message.
     * @returns {object} 400 - Error message for invalid data (e.g., missing exit price on close).
     * @returns {object} 404 - Error message if entry not found.
     * @returns {object} 500 - Error message for server errors.
     */
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const {
            // Fields that might be updated directly
            target_price,
            target_price_2, // *** ADDED ***
            stop_loss_price, notes, tags, entry_reason, advice_source_details, advice_source_id,
            // Fields for closing a trade
            status, exit_date, exit_price, exit_reason,
            // Fields less likely to change but could technically (ticker, exchange, etc.) - decide if allowed
             entry_date, ticker, exchange, direction, quantity, entry_price,
             chart_type
        } = req.body;

        // Basic check for required update fields if closing/executing
         if (['CLOSED', 'EXECUTED'].includes(status) && (!exit_date || exit_price === undefined || exit_price === null)) {
            return res.status(400).json({ message: 'Exit Date and Exit Price are required to close or execute an entry.' });
        }

        try {
            const entry = await db.get('SELECT * FROM journal_entries WHERE id = ?', [id]);
            if (!entry) {
                return res.status(404).json({ message: 'Journal entry not found.' });
            }

            // Calculate PNL if closing/executing
            let pnl = entry.pnl; // Keep existing PNL unless recalculated
            if (['CLOSED', 'EXECUTED'].includes(status)) {
                 const numExitPrice = parseFloat(exit_price);
                 if (isNaN(numExitPrice)) return res.status(400).json({ message: 'Invalid Exit Price.' });

                 if (entry.direction === 'BUY') {
                     pnl = (numExitPrice - entry.entry_price) * entry.quantity - (entry.commission_fee || 0);
                 } else if (entry.direction === 'SELL') { // Basic short selling PNL
                      pnl = (entry.entry_price - numExitPrice) * entry.quantity - (entry.commission_fee || 0);
                 }
            } else if (status === 'OPEN' || status === 'CANCELLED') {
                 // Reset exit details if reopening or cancelling
                 pnl = null;
                 // exit_date = null; // Handled by incoming body data potentially being null
                 // exit_price = null;
                 // exit_reason = null;
            }


            // Construct update query dynamically? Or update all provided fields?
            // Simple approach: update most fields based on request body, ensure crucial ones like ID/account holder aren't changed easily.
            await db.run(`
                UPDATE journal_entries SET
                    target_price = ?,
                    target_price_2 = ?, -- *** ADDED ***
                    stop_loss_price = ?, notes = ?, tags = ?, entry_reason = ?,
                    advice_source_details = ?, advice_source_id = ?, status = ?, exit_date = ?,
                    exit_price = ?, exit_reason = ?, pnl = ?,
                    -- Potentially allow updating core details if needed, carefully consider implications
                    entry_date = ?, ticker = ?, exchange = ?, direction = ?, quantity = ?, entry_price = ?,
                    chart_type = ?
                WHERE id = ? AND account_holder_id = ?
            `, [
                target_price !== undefined ? target_price : entry.target_price,
                target_price_2 !== undefined ? target_price_2 : entry.target_price_2, // *** ADDED ***
                stop_loss_price !== undefined ? stop_loss_price : entry.stop_loss_price,
                notes !== undefined ? notes : entry.notes,
                tags !== undefined ? tags : entry.tags,
                entry_reason !== undefined ? entry_reason : entry.entry_reason,
                advice_source_details !== undefined ? advice_source_details : entry.advice_source_details,
                 advice_source_id !== undefined ? advice_source_id : entry.advice_source_id,
                status || entry.status, // Update status if provided
                exit_date !== undefined ? exit_date : entry.exit_date,
                exit_price !== undefined ? exit_price : entry.exit_price,
                exit_reason !== undefined ? exit_reason : entry.exit_reason,
                pnl, // Use calculated or existing PNL
                // Update core details - use with caution
                entry_date || entry.entry_date,
                ticker ? ticker.toUpperCase().trim() : entry.ticker,
                exchange || entry.exchange,
                direction || entry.direction,
                quantity !== undefined ? parseFloat(quantity) : entry.quantity,
                entry_price !== undefined ? parseFloat(entry_price) : entry.entry_price,
                chart_type !== undefined ? chart_type : entry.chart_type,
                id,
                entry.account_holder_id // Ensure user can only update their own entries
            ]);

            res.json({ message: 'Journal entry updated successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to update journal entry with ID ${id}: ${error.message}`);
            res.status(500).json({ message: 'Error updating journal entry.' });
        }
    });


     /**
     * @route PUT /api/journal/:id/execute
     * @group Journal - Operations for journal entries
     * @description Special endpoint to execute a journal entry and create a real transaction.
     * This links the journal entry to the transaction and updates the journal status.
     * @param {string} id.path.required - The ID of the journal entry.
     * @param {object} req.body.required - Execution details.
     * @param {string} req.body.execution_date - Actual execution date (YYYY-MM-DD).
     * @param {number} req.body.execution_price - Actual execution price.
     * @param {string|number} req.body.account_holder_id - Account holder ID.
     * @returns {object} 200 - Success message and new transaction ID.
     * @returns {object} 400 - Error message for invalid data or if entry is not OPEN/BUY.
     * @returns {object} 404 - Error message if entry not found.
     * @returns {object} 500 - Error message for server errors.
     */
    router.put('/:id/execute', async (req, res) => {
        const { id } = req.params;
        const { execution_date, execution_price, account_holder_id } = req.body; // Actual execution details

        if (!execution_date || execution_price === undefined || execution_price === null || !account_holder_id) {
            return res.status(400).json({ message: 'Execution date, price, and account holder ID are required.' });
        }
        const numExecutionPrice = parseFloat(execution_price);
         if (isNaN(numExecutionPrice) || numExecutionPrice <= 0) {
             return res.status(400).json({ message: 'Invalid execution price.' });
         }

        try {
            await db.exec('BEGIN TRANSACTION');

            // 1. Fetch the journal entry
            const entry = await db.get('SELECT * FROM journal_entries WHERE id = ? AND account_holder_id = ?', [id, account_holder_id]);
            if (!entry) {
                 await db.exec('ROLLBACK');
                return res.status(404).json({ message: 'Journal entry not found or does not belong to this account holder.' });
            }
            if (entry.status !== 'OPEN') {
                await db.exec('ROLLBACK');
                return res.status(400).json({ message: 'Only OPEN journal entries can be executed.' });
            }
             if (entry.direction !== 'BUY') { // Currently only supports executing BUYs
                 await db.exec('ROLLBACK');
                 return res.status(400).json({ message: 'Currently, only BUY journal entries can be executed.' });
             }

            // 2. Create the actual transaction record
            // *** ADDED linked_journal_id ***
            const txResult = await db.run(`
                INSERT INTO transactions (
                    ticker, exchange, transaction_type, quantity, price, transaction_date,
                    original_quantity, quantity_remaining, account_holder_id, source,
                    advice_source_id, linked_journal_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                entry.ticker, entry.exchange, entry.direction, entry.quantity, numExecutionPrice, execution_date,
                entry.quantity, entry.quantity, account_holder_id, 'JOURNAL_EXECUTE',
                entry.advice_source_id, // Link advice source
                id, // *** ADDED: Link back to this journal entry ***
                 new Date().toISOString()
            ]);
             const newTransactionId = txResult.lastID;

            // 3. Update the journal entry status and link it to the transaction
            const pnl = (numExecutionPrice - entry.entry_price) * entry.quantity - (entry.commission_fee || 0); // PNL at execution vs entry
            await db.run(`
                UPDATE journal_entries SET
                    status = 'EXECUTED',
                    exit_date = ?,
                    exit_price = ?,
                    pnl = ?,
                    linked_trade_id = ?
                WHERE id = ?
            `, [execution_date, numExecutionPrice, pnl, newTransactionId, id]);

            await db.exec('COMMIT');
            res.status(200).json({ message: 'Journal entry executed and transaction logged successfully.', transactionId: newTransactionId });

        } catch (error) {
             await db.exec('ROLLBACK');
            log(`[ERROR] Failed to execute journal entry with ID ${id}: ${error.message}`);
            res.status(500).json({ message: `Error executing journal entry: ${error.message}` });
        }
    });


    /**
     * @route DELETE /api/journal/:id
     * @group Journal - Operations for journal entries
     * @description Deletes a journal entry.
     * @param {string} id.path.required - The ID of the journal entry.
     * @returns {object} 200 - Success message.
     * @returns {object} 404 - Error message if entry not found.
     * @returns {object} 500 - Error message for server errors.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        // Optional: Get account_holder_id from authenticated user context in a real app
        // const account_holder_id = req.user.id;
        try {
             // Check if the entry exists before deleting
             // Optionally add account_holder_id check: AND account_holder_id = ?
             const existing = await db.get('SELECT id FROM journal_entries WHERE id = ?', [id]);
            if (!existing) {
                return res.status(404).json({ message: 'Journal entry not found.' });
            }

            // Documents linked via FOREIGN KEY ON DELETE CASCADE will be deleted automatically.
            await db.run('DELETE FROM journal_entries WHERE id = ?', [id]);
            res.json({ message: 'Journal entry deleted successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to delete journal entry with ID ${id}: ${error.message}`);
            res.status(500).json({ message: 'Error deleting journal entry.' });
        }
    });

    return router;
};