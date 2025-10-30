// routes/transactions.js
/**
 * @file Creates and returns an Express router for handling transaction endpoints.
 * @module routes/transactions
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling transaction endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {function(import('sqlite').Database, string): Promise<void>} captureEodPrices - Function to capture EOD prices.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log, captureEodPrices) => {
    // The base path for these routes is '/api/transactions'

    /**
     * Simple quantity formatter for error messages (internal to this module).
     * @param {number | string | null | undefined} number - The number to format.
     * @returns {string} The formatted quantity string.
     */
    function internalFormatQuantity(number) {
         const num = typeof number === 'string' ? parseFloat(number) : number;
         if (num === null || num === undefined || isNaN(num)) { return ''; }
         const formatter = new Intl.NumberFormat('en-US', {
             maximumFractionDigits: 5,
             minimumFractionDigits: 0,
             useGrouping: true
         });
         return formatter.format(num);
    }

    /**
     * @route GET /api/transactions/
     * @group Transactions - Operations for transactions
     * @description Fetches all transactions, optionally filtered by account holder.
     * @param {string} [holder.query] - Optional Account holder ID ('all' or specific ID).
     * @returns {Array<object>|object} 200 - An array of transaction objects. 500 - Error message for server errors.
     */
    router.get('/', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let query = 'SELECT * FROM transactions';
            const params = [];
            if (holderId && holderId !== 'all') {
                query += ' WHERE account_holder_id = ?';
                params.push(holderId);
            }
            query += ' ORDER BY transaction_date DESC, id DESC';
            const transactions = await db.all(query, params);
            res.json(transactions);
        } catch(e) {
            log(`[ERROR] Failed to fetch transactions: ${e.message}`);
            res.status(500).json({message: "Error fetching transactions"});
        }
    });

    /**
     * @typedef {object} TransactionPostBody
     * @property {string} ticker
     * @property {string} exchange
     * @property {'BUY'|'SELL'} transaction_type
     * @property {number} price
     * @property {string} transaction_date - Format YYYY-MM-DD
     * @property {string|number} account_holder_id
     * @property {number} [quantity] - Required for BUY or single SELL.
     * @property {number|null} [limit_price_up]
     * @property {string|null} [limit_up_expiration]
     * @property {number|null} [limit_price_down]
     * @property {string|null} [limit_down_expiration]
     * @property {number|null} [limit_price_up_2]
     * @property {string|null} [limit_up_expiration_2]
     * @property {string|number|null} [parent_buy_id] - Required for single lot SELL.
     * @property {Array<{parent_buy_id: string|number, quantity_to_sell: number}>|null} [lots] - Required for selective SELL.
     * @property {string|number|null} [advice_source_id]
     * @property {string|number|null} [linked_journal_id] - *** ADDED ***
     */

    /**
     * @route POST /api/transactions/
     * @group Transactions - Operations for transactions
     * @description Adds a single manual BUY/SELL transaction or a selective SELL transaction.
     * @param {TransactionPostBody} req.body.required - The transaction data.
     * @returns {object} 201 - Success message. 400 - Error message for invalid input. 404 - Error message if parent BUY lot not found for a SELL. 500 - Error message for server errors.
     */
    router.post('/', async (req, res) => {
        // --- Destructure ALL possible fields (including new TP2 and journal link) ---
        const {
            ticker, exchange, transaction_type, quantity, price, transaction_date,
            limit_price_up, limit_up_expiration,
            limit_price_down, limit_down_expiration,
            limit_price_up_2, limit_up_expiration_2,
            parent_buy_id, // For single lot sell
            lots, // For selective sell: Array of { parent_buy_id, quantity_to_sell }
            account_holder_id,
            advice_source_id,
            linked_journal_id // *** ADDED ***
        } = req.body;

        const numPrice = parseFloat(price);
        const createdAt = new Date().toISOString();

        // Basic Validation
        if (!ticker || !exchange || !transaction_date || !['BUY', 'SELL'].includes(transaction_type) || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
            return res.status(400).json({ message: 'Invalid input. Ensure ticker, exchange, type, date, price, and holder ID are valid.' });
        }

        try {
            await db.exec('BEGIN TRANSACTION');

            // --- Handle BUY ---
            if (transaction_type === 'BUY') {
                const numQuantity = parseFloat(quantity);
                if (isNaN(numQuantity) || numQuantity <= 0) {
                    await db.exec('ROLLBACK');
                    return res.status(400).json({ message: 'Invalid quantity for BUY.' });
                }
                const original_quantity = numQuantity;
                const quantity_remaining = numQuantity;

                // *** ADDED linked_journal_id TO INSERT ***
                const query = `INSERT INTO transactions (
                                ticker, exchange, transaction_type, quantity, price, transaction_date,
                                limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration,
                                limit_price_up_2, limit_up_expiration_2,
                                parent_buy_id, original_quantity, quantity_remaining, account_holder_id, source, created_at,
                                advice_source_id, linked_journal_id
                               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // Added last ?
                await db.run(query, [
                    ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date,
                    limit_price_up || null, limit_up_expiration || null, limit_price_down || null, limit_down_expiration || null,
                    limit_price_up_2 || null, limit_up_expiration_2 || null,
                    null, original_quantity, quantity_remaining, account_holder_id, 'MANUAL', createdAt,
                    advice_source_id || null,
                    linked_journal_id || null // *** ADDED ***
                ]);
            }
            // --- Handle SELL (Single Lot OR Selective) ---
            else if (transaction_type === 'SELL') {
                // --- Case 1: Single Lot Sell ---
                if (parent_buy_id && !lots) {
                    const numQuantity = parseFloat(quantity);
                    if (isNaN(numQuantity) || numQuantity <= 0) {
                        await db.exec('ROLLBACK');
                        return res.status(400).json({ message: 'Invalid quantity for single lot SELL.' });
                    }

                    const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'', [parent_buy_id, account_holder_id]);
                    if (!parentBuy) {
                        await db.exec('ROLLBACK');
                        return res.status(404).json({ message: 'Parent buy transaction not found for this account holder.' });
                    }
                    if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) {
                        await db.exec('ROLLBACK');
                        return res.status(400).json({ message: 'Sell date cannot be before the buy date.' });
                    }
                    // Fix: Use internalFormatQuantity for error message
                    if (parentBuy.quantity_remaining < numQuantity - 0.00001) {
                         await db.exec('ROLLBACK');
                        return res.status(400).json({ message: `Sell quantity (${internalFormatQuantity(numQuantity)}) exceeds remaining quantity (${internalFormatQuantity(parentBuy.quantity_remaining)}) in the selected lot.` });
                    }
                    // Insert the single SELL record
                    const sellQuery = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    await db.run(sellQuery, [ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date, parent_buy_id, account_holder_id, 'MANUAL', createdAt]);
                    // Update parent BUY lot
                    await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [numQuantity, parent_buy_id]);

                    // --- ADDED: Archive Watchlist Item ---
                    if (parentBuy.advice_source_id) {
                        log(`[TRANSACTION] Archiving watchlist item for Ticker: ${ticker}, Source: ${parentBuy.advice_source_id}`);
                        await db.run(
                            "UPDATE watchlist SET status = 'CLOSED' WHERE account_holder_id = ? AND ticker = ? AND advice_source_id = ?",
                            [account_holder_id, ticker.toUpperCase(), parentBuy.advice_source_id]
                        );
                    }
                    // --- END ADDED ---

                }
                // --- Case 2: Selective Sell ---
                else if (lots && Array.isArray(lots) && lots.length > 0) {
                    let totalSellQuantityFromLots = 0;
                    /** @type {Set<number>} */
                    const adviceSourceIdsToArchive = new Set(); // --- ADDED ---

                    for (const lotInfo of lots) {
                        const lotQty = parseFloat(lotInfo.quantity_to_sell);
                        if (isNaN(lotQty) || lotQty <= 0) continue; // Skip invalid or zero
                        totalSellQuantityFromLots += lotQty;

                        const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'', [lotInfo.parent_buy_id, account_holder_id]);
                        if (!parentBuy) {
                            await db.exec('ROLLBACK');
                            return res.status(404).json({ message: `Parent buy transaction (ID: ${lotInfo.parent_buy_id}) not found for this account holder.` });
                        }
                        if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) {
                             await db.exec('ROLLBACK');
                             return res.status(400).json({ message: `Sell date cannot be before the buy date of lot ID ${lotInfo.parent_buy_id}.` });
                        }
                        // Fix: Use internalFormatQuantity for error message
                        if (parentBuy.quantity_remaining < lotQty - 0.00001) {
                             await db.exec('ROLLBACK');
                            return res.status(400).json({ message: `Sell quantity (${internalFormatQuantity(lotQty)}) exceeds remaining quantity (${internalFormatQuantity(parentBuy.quantity_remaining)}) in lot ID ${lotInfo.parent_buy_id}.` });
                        }

                        // --- ADDED: Collect advice_source_id ---
                        if (parentBuy.advice_source_id) {
                            adviceSourceIdsToArchive.add(parentBuy.advice_source_id);
                        }
                        // --- END ADDED ---

                        // Insert a SELL record for this lot
                        const sellQuery = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        await db.run(sellQuery, [ticker.toUpperCase(), exchange, transaction_type, lotQty, numPrice, transaction_date, lotInfo.parent_buy_id, account_holder_id, 'MANUAL', createdAt]);
                        // Update parent BUY lot
                        await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [lotQty, lotInfo.parent_buy_id]);
                    }

                    // --- ADDED: Archive Watchlist Items ---
                    if (adviceSourceIdsToArchive.size > 0) {
                        const adviceIds = [...adviceSourceIdsToArchive];
                        const placeholders = adviceIds.map(() => '?').join(',');
                        log(`[TRANSACTION] Archiving watchlist items for Ticker: ${ticker}, Sources: ${adviceIds.join(', ')}`);
                        await db.run(
                            `UPDATE watchlist SET status = 'CLOSED' WHERE account_holder_id = ? AND ticker = ? AND advice_source_id IN (${placeholders})`,
                            [account_holder_id, ticker.toUpperCase(), ...adviceIds]
                        );
                    }
                    // --- END ADDED ---

                    // Final check
                    const expectedTotalQuantity = parseFloat(quantity);
                     if (!isNaN(expectedTotalQuantity) && Math.abs(totalSellQuantityFromLots - expectedTotalQuantity) > 0.00001) {
                         await db.exec('ROLLBACK');
                         return res.status(400).json({ message: 'Total quantity specified does not match the sum of quantities entered for individual lots.' });
                     }
                     if (totalSellQuantityFromLots <= 0) {
                         await db.exec('ROLLBACK');
                         return res.status(400).json({ message: 'Total quantity to sell must be greater than zero.' });
                     }
                }
                // --- Case 3: Invalid SELL payload ---
                else {
                    await db.exec('ROLLBACK');
                    return res.status(400).json({ message: 'Invalid SELL transaction payload. Must provide either a single parent_buy_id or a valid lots array.' });
                }
                // Trigger EOD price capture
                if (process.env.NODE_ENV !== 'test' && typeof captureEodPrices === 'function') {
                    captureEodPrices(db, transaction_date);
                }
            } // End SELL handling

            await db.exec('COMMIT');
            res.status(201).json({ message: 'Transaction logged successfully!' });

        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed to add transaction: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server Error processing transaction.' });
        }
    });

     /**
      * @route PUT /api/transactions/:id
      * @group Transactions - Operations for transactions
      * @description Updates an existing transaction.
      * @param {string} id.path.required - The ID of the transaction to update.
      * @param {object} req.body.required - A partial or full transaction object with fields to update.
      * @returns {object} 200 - Success message. 400 - Error message for invalid input. 404 - Error message if transaction not found. 500 - Error message for server errors.
      */
     router.put('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // *** ADDED linked_journal_id ***
            const {
                ticker, exchange, quantity, price, transaction_date,
                limit_price_up, limit_up_expiration,
                limit_price_down, limit_down_expiration,
                limit_price_up_2, limit_up_expiration_2,
                account_holder_id,
                linked_journal_id // *** ADDED ***
            } = req.body;
            // --- END DESTRUCTURE ---

            const numQuantity = parseFloat(quantity);
            const numPrice = parseFloat(price);

            if (!ticker || !exchange || !transaction_date || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure all fields are valid.' });
            }

            const originalTx = await db.get('SELECT * FROM transactions WHERE id = ?', id);
            if (!originalTx) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            // Adjust quantity_remaining if original_quantity of a BUY lot is changed
            if (originalTx.transaction_type === 'BUY') {
                 // Check if quantity_remaining was equal to original_quantity
                 const qtyMatch = Math.abs(originalTx.quantity_remaining - originalTx.original_quantity) < 0.00001;
                 // Calculate the difference if the original quantity is changing
                 const qtyDifference = numQuantity - originalTx.original_quantity;

                 // Only auto-update quantity_remaining if it was untouched OR if the change is positive
                 if (qtyMatch || qtyDifference > 0) {
                     // Adjust quantity_remaining by the same amount the original_quantity changed
                     const newQuantityRemaining = originalTx.quantity_remaining + qtyDifference;
                     await db.run('UPDATE transactions SET original_quantity = ?, quantity_remaining = ? WHERE id = ?', [numQuantity, newQuantityRemaining, id]);
                 } else {
                     // quantity_remaining was already modified by a sale, only update original_quantity
                      await db.run('UPDATE transactions SET original_quantity = ? WHERE id = ?', [numQuantity, id]);
                 }
            }

            // *** ADDED linked_journal_id TO UPDATE ***
            const query = `UPDATE transactions SET
                ticker = ?, exchange = ?, quantity = ?, price = ?, transaction_date = ?,
                limit_price_up = ?, limit_up_expiration = ?,
                limit_price_down = ?, limit_down_expiration = ?,
                limit_price_up_2 = ?, limit_up_expiration_2 = ?,
                account_holder_id = ?, linked_journal_id = ?
                WHERE id = ?`;
            await db.run(query, [
                ticker.toUpperCase(), exchange, numQuantity, numPrice, transaction_date,
                limit_price_up || null, limit_up_expiration || null,
                limit_price_down || null, limit_down_expiration || null,
                limit_price_up_2 || null, limit_up_expiration_2 || null, // *** ADDED ***
                account_holder_id,
                linked_journal_id || null, // *** ADDED ***
                id
            ]);
            // *** END UPDATE ---

            res.json({ message: 'Transaction updated successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to update transaction with ID ${id}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error during transaction update.' });
        }
    });

    /**
     * @route DELETE /api/transactions/:id
     * @group Transactions - Operations for transactions
     * @description Deletes a transaction. If it's a SELL, restores quantity to the parent BUY.
     * @param {string} id.path.required - The ID of the transaction to delete.
     * @returns {object} 200 - Success message. 400 - Error message if deleting a BUY that has child SELLs. 404 - Error message if transaction not found. 500 - Error message for server errors.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', id);

            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            await db.exec('BEGIN TRANSACTION');

            if (transaction.transaction_type === 'SELL' && transaction.parent_buy_id) {
                // Restore quantity to parent BUY
                await db.run(
                    'UPDATE transactions SET quantity_remaining = quantity_remaining + ? WHERE id = ?',
                    [transaction.quantity, transaction.parent_buy_id]
                );
                log(`[DELETE] Restored quantity ${transaction.quantity} to parent BUY ID ${transaction.parent_buy_id}`);
            }
             else if (transaction.transaction_type === 'BUY') {
                 // Check for child SELLs
                 const childSells = await db.all('SELECT id FROM transactions WHERE parent_buy_id = ?', id);
                 if (childSells.length > 0) {
                     await db.exec('ROLLBACK');
                     return res.status(400).json({ message: 'Cannot delete a BUY transaction that has associated SELL transactions.' });
                 }
                 log(`[DELETE] Deleting BUY transaction ID ${id}`);
             }

            // Delete the transaction itself
            await db.run('DELETE FROM transactions WHERE id = ?', id);

            await db.exec('COMMIT');

            res.json({ message: 'Transaction deleted successfully.' });

        } catch (error) {
             await db.exec('ROLLBACK');
            log(`[ERROR] Failed to delete transaction with ID ${req.params.id}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error during transaction deletion.' });
        }
    });

    /**
     * @route GET /api/transactions/sales/:buyId
     * @group Transactions - Operations for transactions
     * @description Fetches all SELL transactions linked to a specific parent BUY transaction ID.
     * @param {string} buyId.path.required - The ID of the parent BUY transaction.
     * @param {string} holder.query.required - Account holder ID.
     * @returns {Array<object>|object} 200 - An array of SELL transaction objects, each with a `realizedPL` property. 400 - Error message for missing IDs. 500 - Error message for server errors.
     */
    router.get('/sales/:buyId', async (req, res) => {
        const { buyId } = req.params;
        const accountHolderId = req.query.holder;

        if (!buyId) { return res.status(400).json({ message: 'Parent Buy ID is required.' }); }
        if (!accountHolderId || accountHolderId === 'all') { return res.status(400).json({ message: 'Account Holder ID is required.' }); }

        try {
            const parentBuy = await db.get( 'SELECT price as cost_basis FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'', [buyId, accountHolderId] );
            if (!parentBuy) {
                log(`[INFO] Parent BUY lot ID ${buyId} not found for holder ${accountHolderId} when fetching sales.`);
                return res.json([]);
            }
            const sales = await db.all( 'SELECT id, transaction_date, quantity, price FROM transactions WHERE parent_buy_id = ? AND account_holder_id = ? AND transaction_type = \'SELL\' ORDER BY transaction_date ASC, id ASC', [buyId, accountHolderId] );
            const salesWithPL = sales.map(sale => ({ ...sale, realizedPL: (sale.price - parentBuy.cost_basis) * sale.quantity }));
            res.json(salesWithPL);
        } catch (error) {
            log(`[ERROR] Failed to fetch sales for buyId ${buyId}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error fetching sales history.' });
        }
    });

    return router;
};