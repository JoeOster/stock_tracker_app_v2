// routes/transactions.js
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling transaction endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {function(import('sqlite').Database, string): Promise<void>} captureEodPrices - Function to capture EOD prices.
 * @param {Map<string, any>} importSessions - Map storing active import sessions.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log, captureEodPrices, importSessions) => {
    // The base path for these routes is '/api/transactions'

    /**
     * POST /import
     * Handles the batch import of reconciled transactions from the CSV importer.
     * Includes hardening for edge cases: invalid prices, missing BUYs, insufficient shares.
     */
    router.post('/import', async (req, res) => {
        const { sessionId, resolutions } = req.body;

        if (!sessionId || !Array.isArray(resolutions)) {
            return res.status(400).json({ message: 'Invalid import payload.' });
        }

        const session = importSessions.get(sessionId);
        if (!session) {
            return res.status(400).json({ message: 'Import session expired or not found.' });
        }

        const { data: sessionData, accountHolderId } = session;
        /** @type {any[]} */
        const toCreate = []; // Array to hold transactions to be newly created
        /** @type {number[]} */
        const toDelete = []; // Array to hold IDs of transactions to be deleted (replaced)

        // Process resolutions to identify which existing transactions to delete
        resolutions.forEach(res => {
            const conflictItem = sessionData.find(item => item.csvRowIndex == res.csvIndex);
            // If resolution is REPLACE, mark the matched manual transaction for deletion
            if (conflictItem && res.resolution === 'REPLACE' && conflictItem.matchedTx) {
                toDelete.push(conflictItem.matchedTx.id);
                // Add the CSV item to be created (replacing the manual one)
                toCreate.push(conflictItem);
            }
            // If resolution is DISCARD, do nothing with the CSV item.
            // If resolution is KEEP, do nothing (manual stays, CSV is ignored implicitly).
        });

        // Add all 'New' transactions and those marked 'REPLACE' from session data to the creation list
        sessionData.forEach(item => {
            if (item.status === 'New') {
                toCreate.push(item);
            }
            // Items marked 'REPLACE' were already added above while processing resolutions.
        });

        // If nothing to create or delete, end the session and inform the user.
        if (toCreate.length === 0 && toDelete.length === 0) {
            importSessions.delete(sessionId);
            return res.status(200).json({ message: 'No changes were committed.' });
        }

        // --- Begin Database Transaction ---
        try {
            await db.exec('BEGIN TRANSACTION');

            // --- Deletion Phase ---
            if (toDelete.length > 0) {
                log(`[IMPORT] Deleting ${toDelete.length} transactions to be replaced.`);
                // Prepare statement for efficiency if deleting many items
                const deleteStmt = await db.prepare('DELETE FROM transactions WHERE id = ?');
                for (const id of toDelete) {
                    await deleteStmt.run(id);
                }
                await deleteStmt.finalize(); // Close the prepared statement
            }

            // --- Creation Phase ---
            if (toCreate.length > 0) {
                log(`[IMPORT] Attempting to create ${toCreate.length} transactions.`);
                // Sort transactions by date to process chronologically, important for SELL logic
                toCreate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                for (const tx of toCreate) {
                    const quantity = parseFloat(tx.quantity);
                    const price = parseFloat(tx.price);
                    const createdAt = new Date().toISOString();

                    // --- HARDENING: Check for invalid price ---
                    if (isNaN(price) || price <= 0) {
                        log(`[IMPORT WARNING] Invalid price (${tx.price}) for ${tx.ticker} on ${tx.date}. Skipping and creating notification.`);
                        const message = `An imported transaction for ${formatQuantity(quantity)} shares of ${tx.ticker} on ${tx.date} was ignored because the price was invalid or zero (${tx.price}).`;
                        // Insert notification and skip to the next transaction
                        await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                        continue; // Skip this transaction
                    }

                    // --- Process BUY Transactions ---
                    if (tx.type === 'BUY') {
                        await db.run(
                            'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [tx.date, tx.ticker, tx.exchange, tx.type, quantity, price, accountHolderId, quantity, quantity, 'CSV_IMPORT', createdAt]
                        );
                    }
                    // --- Process SELL Transactions ---
                    else if (tx.type === 'SELL') {
                        let sellQuantityRemaining = quantity; // How much of this SELL we still need to allocate

                        // Find available BUY lots for this ticker and account holder, oldest first
                        const openLots = await db.all(
                            "SELECT * FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 AND transaction_type = 'BUY' ORDER BY transaction_date ASC, id ASC",
                            [tx.ticker, accountHolderId]
                        );

                        // --- HARDENING: Check if any BUY lots exist ---
                        if (openLots.length === 0) {
                             log(`[IMPORT WARNING] No open BUY lot for SELL of ${tx.ticker} on ${tx.date}. Skipping and creating notification.`);
                             const message = `An imported SELL transaction for ${formatQuantity(quantity)} shares of ${tx.ticker} on ${tx.date} was ignored because no corresponding open BUY lot could be found.`;
                             await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                             continue; // Skip this transaction
                        }

                        // --- Allocate SELL quantity against available BUY lots ---
                        for (const lot of openLots) {
                            if (sellQuantityRemaining <= 0.00001) break; // Stop if SELL is fully allocated

                            // Determine how much can be sold from this specific lot
                            const sellableQuantity = Math.min(sellQuantityRemaining, lot.quantity_remaining);

                            // Create the SELL record linked to this parent BUY lot
                            await db.run(
                                'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                [tx.date, tx.ticker, tx.exchange, tx.type, sellableQuantity, price, accountHolderId, lot.id, 'CSV_IMPORT', createdAt]
                            );

                            // Update the remaining quantity on the parent BUY lot
                            await db.run(
                                'UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
                                [sellableQuantity, lot.id]
                            );

                            sellQuantityRemaining -= sellableQuantity; // Decrease remaining SELL amount
                        }

                         // --- HARDENING: Check if entire SELL quantity was allocated ---
                         if (sellQuantityRemaining > 0.00001) {
                            // If some quantity remains, it means there weren't enough shares across all lots
                            log(`[IMPORT WARNING] Not enough shares to cover entire SELL of ${tx.ticker} on ${tx.date}. ${formatQuantity(sellQuantityRemaining)} shares were not recorded as sold.`);
                            const message = `An imported SELL transaction for ${tx.ticker} on ${tx.date} could not be fully completed. There were not enough shares in open lots to cover the entire sale. ${formatQuantity(sellQuantityRemaining)} shares were not recorded as sold.`;
                            await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                        }
                    }
                } // End loop through toCreate transactions
            }

            // --- Commit Transaction ---
            await db.exec('COMMIT');
            importSessions.delete(sessionId); // Clean up session data
            log('[IMPORT] Import completed successfully.');
            res.status(201).json({ message: 'Import completed successfully!' });

        } catch (error) {
            // --- Rollback on Error ---
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed during batch import: ${error.message}\n${error.stack}`);
            // Send specific error message back to frontend
            res.status(500).json({ message: `Import failed: ${error.message}` });
        }
    });

    // --- GET / --- (Fetch all transactions)
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

    // --- POST / --- (Add single manual transaction)
    router.post('/', async (req, res) => {
        try {
            const { ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, parent_buy_id, account_holder_id } = req.body;

            const numQuantity = parseFloat(quantity);
            const numPrice = parseFloat(price);

            // Basic Server-Side Validation (Client-side validation should catch most)
            if (!ticker || !exchange || !transaction_date || !['BUY', 'SELL'].includes(transaction_type) || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure all required fields are valid positive numbers.' });
            }

            let original_quantity = null, quantity_remaining = null;
            if (transaction_type === 'BUY') {
                original_quantity = numQuantity;
                quantity_remaining = numQuantity;
            } else if (transaction_type === 'SELL') {
                 if (!parent_buy_id) {
                     // Manual SELL requires a parent ID from the UI (e.g., from Daily Report or future Ledger enhancement)
                     return res.status(400).json({ message: 'Manual SELL transaction requires selecting a parent BUY lot.' });
                 }
                const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'', [parent_buy_id, account_holder_id]);
                if (!parentBuy) return res.status(404).json({ message: 'Parent buy transaction not found for this account holder.' });
                if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) return res.status(400).json({ message: 'Sell date cannot be before the buy date.' });
                if (parentBuy.quantity_remaining < numQuantity) return res.status(400).json({ message: 'Sell quantity exceeds remaining quantity in the selected lot.' });
                // Update parent BUY lot
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [numQuantity, parent_buy_id]);
            }

            // Insert the transaction record
            const query = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, parent_buy_id, original_quantity, quantity_remaining, account_holder_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.run(query, [ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date, limit_price_up || null, limit_price_down || null, limit_up_expiration || null, limit_down_expiration || null, parent_buy_id || null, original_quantity, quantity_remaining, account_holder_id, 'MANUAL', new Date().toISOString()]);

            // Trigger EOD price capture if a SELL occurred (and not testing)
            if (transaction_type === 'SELL' && process.env.NODE_ENV !== 'test' && typeof captureEodPrices === 'function') {
                captureEodPrices(db, transaction_date);
            }

            res.status(201).json({ message: 'Transaction logged successfully!' }); // Consistent success message
        } catch (error) {
            log(`[ERROR] Failed to add transaction: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server Error processing transaction.' });
        }
    });

     // --- PUT /:id --- (Update existing transaction)
     router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { ticker, exchange, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, account_holder_id } = req.body;

            const numQuantity = parseFloat(quantity);
            const numPrice = parseFloat(price);

            // Basic validation
            if (!ticker || !exchange || !transaction_date || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure all fields are valid.' });
            }

            // Fetch the original transaction to check type, etc.
            const originalTx = await db.get('SELECT * FROM transactions WHERE id = ?', id);
            if (!originalTx) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            // --- Complexities for updating BUY/SELL ---
            // If updating a BUY that has associated SELLs, quantity changes can break consistency.
            // If updating a SELL, quantity changes or parent_buy_id changes affect the parent BUY.
            // For now, allow updating core fields but WARN about quantity changes on BUYs with SELLs.
            if (originalTx.transaction_type === 'BUY' && originalTx.quantity !== numQuantity && originalTx.quantity_remaining !== originalTx.original_quantity) {
                 log(`[WARN] Updating quantity of BUY transaction (ID: ${id}) which has associated SELLs. Manual adjustment of SELLs/parent quantity_remaining might be needed.`);
                 // Ideally, prevent this or implement complex logic to adjust children SELLs.
                 // For now, we update original_quantity and quantity_remaining based on the *difference*.
                 const diff = numQuantity - originalTx.quantity;
                 await db.run('UPDATE transactions SET original_quantity = ?, quantity_remaining = quantity_remaining + ? WHERE id = ?', [numQuantity, diff, id]);

            } else if (originalTx.transaction_type === 'BUY') {
                 // If it's a BUY with no sells yet, update both original and remaining
                 await db.run('UPDATE transactions SET original_quantity = ?, quantity_remaining = ? WHERE id = ?', [numQuantity, numQuantity, id]);
            }
            // Add logic here if you want to allow updating SELL quantities (would require adjusting parent BUY)

            // Update common fields
            const query = `UPDATE transactions SET
                ticker = ?, exchange = ?, quantity = ?, price = ?, transaction_date = ?,
                limit_price_up = ?, limit_up_expiration = ?, limit_price_down = ?, limit_down_expiration = ?,
                account_holder_id = ?
                WHERE id = ?`;
            await db.run(query, [
                ticker.toUpperCase(), exchange, numQuantity, numPrice, transaction_date,
                limit_price_up || null, limit_up_expiration || null, limit_price_down || null, limit_down_expiration || null,
                account_holder_id, id
            ]);

            res.json({ message: 'Transaction updated successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to update transaction with ID ${req.params.id}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error during transaction update.' });
        }
    });

    // --- DELETE /:id --- (Delete transaction)
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', id);

            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            await db.exec('BEGIN TRANSACTION'); // Start transaction for safety

            // If deleting a SELL, restore the quantity to the parent BUY
            if (transaction.transaction_type === 'SELL' && transaction.parent_buy_id) {
                await db.run(
                    'UPDATE transactions SET quantity_remaining = quantity_remaining + ? WHERE id = ?',
                    [transaction.quantity, transaction.parent_buy_id]
                );
                log(`[DELETE] Restored quantity ${transaction.quantity} to parent BUY ID ${transaction.parent_buy_id}`);
            }
             // If deleting a BUY, check if it has associated SELLs
             else if (transaction.transaction_type === 'BUY') {
                 const childSells = await db.all('SELECT id FROM transactions WHERE parent_buy_id = ?', id);
                 if (childSells.length > 0) {
                     // Prevent deletion or delete children? For now, prevent.
                     await db.exec('ROLLBACK');
                     return res.status(400).json({ message: 'Cannot delete a BUY transaction that has associated SELL transactions.' });
                 }
                 log(`[DELETE] Deleting BUY transaction ID ${id}`);
             }

            // Delete the target transaction
            await db.run('DELETE FROM transactions WHERE id = ?', id);

            await db.exec('COMMIT'); // Commit changes

            res.json({ message: 'Transaction deleted successfully.' });

        } catch (error) {
             await db.exec('ROLLBACK'); // Rollback on any error
            log(`[ERROR] Failed to delete transaction with ID ${req.params.id}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error during transaction deletion.' });
        }
    });

    // Helper function for formatting quantity (add locally if not imported)
    function formatQuantity(number) {
        const num = typeof number === 'string' ? parseFloat(number) : number;
        if (num === null || num === undefined || isNaN(num)) { return ''; }
        const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 5, minimumFractionDigits: 0, useGrouping: true });
        return formatter.format(num);
    }


module.exports = (db, log, captureEodPrices, importSessions) => {
    // ... (existing routes: /import, GET /, POST /, PUT /:id, DELETE /:id) ...

    /**
     * GET /sales/:buyId
     * Fetches all SELL transactions linked to a specific parent BUY transaction ID.
     */
    router.get('/sales/:buyId', async (req, res) => {
        const { buyId } = req.params;
        const accountHolderId = req.query.holder; // Get holder ID from query

        if (!buyId) {
            return res.status(400).json({ message: 'Parent Buy ID is required.' });
        }
        // Although not strictly necessary for this query, filtering by holder adds a layer of security/scoping
        if (!accountHolderId || accountHolderId === 'all') {
             return res.status(400).json({ message: 'Account Holder ID is required.' });
        }

        try {
            // Fetch the parent buy to calculate P/L later
            const parentBuy = await db.get(
                'SELECT price as cost_basis FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'',
                [buyId, accountHolderId]
            );

            if (!parentBuy) {
                // If the parent buy doesn't exist or doesn't belong to the holder, return empty
                // Or you could return a 404, but empty is probably fine
                log(`[INFO] Parent BUY lot ID ${buyId} not found for holder ${accountHolderId} when fetching sales.`);
                return res.json([]);
            }

            const sales = await db.all(
                'SELECT id, transaction_date, quantity, price FROM transactions WHERE parent_buy_id = ? AND account_holder_id = ? AND transaction_type = \'SELL\' ORDER BY transaction_date ASC, id ASC',
                [buyId, accountHolderId]
            );

            // Calculate realized P/L for each sale relative to the parent cost basis
            const salesWithPL = sales.map(sale => ({
                ...sale,
                realizedPL: (sale.price - parentBuy.cost_basis) * sale.quantity
            }));

            res.json(salesWithPL);
        } catch (error) {
            log(`[ERROR] Failed to fetch sales for buyId ${buyId}: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: 'Server error fetching sales history.' });
        }
    });


    // Helper function for formatting quantity (add locally if not imported)
    function formatQuantity(number) {
        // ... (keep existing helper function) ...
    }};


    return router;
};