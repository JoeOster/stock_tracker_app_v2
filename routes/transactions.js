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
     * GET /
     * Fetches all transactions, optionally filtered by account holder.
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
     * POST /
     * Adds a single manual BUY/SELL transaction or a selective SELL transaction.
     */
    router.post('/', async (req, res) => {
        // --- Destructure ALL possible fields (including new TP2 fields) ---
        const {
            ticker, exchange, transaction_type, quantity, price, transaction_date,
            limit_price_up, limit_up_expiration,
            limit_price_down, limit_down_expiration,
            limit_price_up_2, limit_up_expiration_2, // *** ADDED TP2 FIELDS ***
            parent_buy_id, // For single lot sell
            lots, // For selective sell: Array of { parent_buy_id, quantity_to_sell }
            account_holder_id,
            advice_source_id // *** ADDED ADVICE SOURCE ID ***
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

                // *** ADDED TP2 AND ADVICE_SOURCE_ID COLUMNS TO INSERT ***
                const query = `INSERT INTO transactions (
                                ticker, exchange, transaction_type, quantity, price, transaction_date,
                                limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration,
                                limit_price_up_2, limit_up_expiration_2,
                                parent_buy_id, original_quantity, quantity_remaining, account_holder_id, source, created_at,
                                advice_source_id
                               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // Added ?
                await db.run(query, [
                    ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date,
                    limit_price_up || null, limit_up_expiration || null, limit_price_down || null, limit_down_expiration || null,
                    limit_price_up_2 || null, limit_up_expiration_2 || null, // *** ADDED TP2 VALUES ***
                    null, original_quantity, quantity_remaining, account_holder_id, 'MANUAL', createdAt,
                    advice_source_id || null // *** ADDED ADVICE SOURCE ID VALUE ***
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
                    if (parentBuy.quantity_remaining < numQuantity - 0.00001) {
                         await db.exec('ROLLBACK');
                         // Use .toLocaleString() for basic formatting in the error message
                        return res.status(400).json({ message: `Sell quantity (${numQuantity.toLocaleString()}) exceeds remaining quantity (${parentBuy.quantity_remaining.toLocaleString()}) in the selected lot.` });
                    }
                    // Insert the single SELL record
                    const sellQuery = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    await db.run(sellQuery, [ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date, parent_buy_id, account_holder_id, 'MANUAL', createdAt]);
                    // Update parent BUY lot
                    await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [numQuantity, parent_buy_id]);
                }
                // --- Case 2: Selective Sell ---
                else if (lots && Array.isArray(lots) && lots.length > 0) {
                    let totalSellQuantityFromLots = 0;
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
                        if (parentBuy.quantity_remaining < lotQty - 0.00001) {
                             await db.exec('ROLLBACK');
                            return res.status(400).json({ message: `Sell quantity (${lotQty.toLocaleString()}) exceeds remaining quantity (${parentBuy.quantity_remaining.toLocaleString()}) in lot ID ${lotInfo.parent_buy_id}.` });
                        }
                        // Insert a SELL record for this lot
                        const sellQuery = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        await db.run(sellQuery, [ticker.toUpperCase(), exchange, transaction_type, lotQty, numPrice, transaction_date, lotInfo.parent_buy_id, account_holder_id, 'MANUAL', createdAt]);
                        // Update parent BUY lot
                        await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [lotQty, lotInfo.parent_buy_id]);
                    }
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
      * PUT /:id
      * Updates an existing transaction (e.g., from Edit Modal).
      */
     router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // --- ADDED TP2 FIELDS ---
            const {
                ticker, exchange, quantity, price, transaction_date,
                limit_price_up, limit_up_expiration,
                limit_price_down, limit_down_expiration,
                limit_price_up_2, limit_up_expiration_2, // *** ADDED ***
                account_holder_id
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
                 // Only adjust remaining if it was untouched (equal to original)
                 if (Math.abs(originalTx.quantity_remaining - originalTx.original_quantity) < 0.00001) {
                     await db.run('UPDATE transactions SET original_quantity = ?, quantity_remaining = ? WHERE id = ?', [numQuantity, numQuantity, id]);
                 } else {
                     // Quantity has been sold, only update original_quantity
                      await db.run('UPDATE transactions SET original_quantity = ? WHERE id = ?', [numQuantity, id]);
                 }
            }

            // *** ADDED TP2 COLUMNS TO UPDATE ***
            const query = `UPDATE transactions SET
                ticker = ?, exchange = ?, quantity = ?, price = ?, transaction_date = ?,
                limit_price_up = ?, limit_up_expiration = ?,
                limit_price_down = ?, limit_down_expiration = ?,
                limit_price_up_2 = ?, limit_up_expiration_2 = ?,
                account_holder_id = ?
                WHERE id = ?`;
            await db.run(query, [
                ticker.toUpperCase(), exchange, numQuantity, numPrice, transaction_date,
                limit_price_up || null, limit_up_expiration || null,
                limit_price_down || null, limit_down_expiration || null,
                limit_price_up_2 || null, limit_up_expiration_2 || null, // *** ADDED ***
                account_holder_id,
                id
            ]);
            // *** END UPDATE ---

            res.json({ message: 'Transaction updated successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to update transaction with ID ${req.params.id}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error during transaction update.' });
        }
    });

    /**
     * DELETE /:id
     * Deletes a transaction.
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
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
     * GET /sales/:buyId
     * Fetches all SELL transactions linked to a specific parent BUY transaction ID.
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