// routes/transactions.js
const express = require('express');
const router = express.Router();

// NOTE: This assumes 'importSessions' is passed from server.js
// We will need a small change in server.js to make this work.

module.exports = (db, log, captureEodPrices, importSessions) => {
    // The base path for these routes is '/api/transactions'

    /**
     * POST /import
     * Handles the batch import of reconciled transactions from the CSV importer.
     */
    router.post('/import', async (req, res) => {
        // This route now uses the session data and resolutions from the frontend
        const { sessionId, resolutions } = req.body;

        if (!sessionId || !resolutions) {
            return res.status(400).json({ message: 'Invalid import payload.' });
        }

        const session = importSessions.get(sessionId);
        if (!session) {
            return res.status(400).json({ message: 'Import session expired or not found.' });
        }

        const { data: sessionData, accountHolderId } = session;
        const toCreate = [];
        const toDelete = [];

        // Process resolutions from the user
        resolutions.forEach(res => {
            const conflictItem = sessionData[res.csvIndex];
            if (res.resolution === 'REPLACE') {
                toDelete.push(conflictItem.matchedTx.id);
                toCreate.push(conflictItem);
            }
            // If resolution is 'KEEP', we do nothing, as we keep the manual entry.
        });
        
        // Add all undisputed "New" items from the session to the create list
        sessionData.forEach(item => {
            if (item.status === 'New') {
                toCreate.push(item);
            }
        });

        try {
            await db.exec('BEGIN TRANSACTION');

            // 1. Delete transactions that the user chose to replace
            if (toDelete.length > 0) {
                const deleteStmt = await db.prepare('DELETE FROM transactions WHERE id = ?');
                for (const id of toDelete) {
                    await deleteStmt.run(id);
                }
                await deleteStmt.finalize();
            }

            // 2. Insert new transactions
            if (toCreate.length > 0) {
                toCreate.sort((a, b) => new Date(a.date) - new Date(b.date));

                for (const tx of toCreate) {
                    if (tx.type === 'BUY') {
                        await db.run(
                            'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [tx.date, tx.ticker, tx.exchange, tx.type, tx.quantity, tx.price, accountHolderId, tx.quantity, tx.quantity]
                        );
                    } else if (tx.type === 'SELL') {
                        let sellQuantity = tx.quantity;
                        const openLots = await db.all(
                            "SELECT * FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 ORDER BY transaction_date ASC",
                            [tx.ticker, accountHolderId]
                        );

                        if (openLots.length === 0) {
                            throw new Error(`No open BUY lot found for SELL transaction of ${tx.ticker} on ${tx.date}.`);
                        }

                        for (const lot of openLots) {
                            if (sellQuantity <= 0) break;
                            const sellableQuantity = Math.min(sellQuantity, lot.quantity_remaining);
                            await db.run(
                                'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [tx.date, tx.ticker, tx.exchange, tx.type, sellableQuantity, tx.price, accountHolderId, lot.id]
                            );
                            await db.run(
                                'UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
                                [sellableQuantity, lot.id]
                            );
                            sellQuantity -= sellableQuantity;
                        }
                    }
                }
            }

            await db.exec('COMMIT');
            importSessions.delete(sessionId); // Clean up the session
            res.status(201).json({ message: 'Import completed successfully!' });
        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed during batch import: ${error.message}`);
            res.status(500).json({ message: `Import failed: ${error.message}` });
        }
    });

    // ... (the rest of your transaction routes like GET /, POST /, PUT /, DELETE /)
    
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

    router.post('/', async (req, res) => {
        try {
            const { ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, parent_buy_id, account_holder_id } = req.body;
            
            const numQuantity = parseFloat(quantity);
            const numPrice = parseFloat(price);

            if (!ticker || !exchange || !transaction_date || !['BUY', 'SELL'].includes(transaction_type) || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure all fields are valid.' });
            }

            let original_quantity = null, quantity_remaining = null;
            if (transaction_type === 'BUY') {
                original_quantity = numQuantity;
                quantity_remaining = numQuantity;
            } else if (transaction_type === 'SELL' && parent_buy_id) {
                const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ?', parent_buy_id);
                if (!parentBuy) return res.status(404).json({ message: 'Parent buy transaction not found.' });
                if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) return res.status(400).json({ message: 'Sell date cannot be before the buy date.' });
                if (parentBuy.quantity_remaining < numQuantity) return res.status(400).json({ message: 'Sell quantity exceeds remaining quantity.' });
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [numQuantity, parent_buy_id]);
            }
            const query = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, parent_buy_id, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.run(query, [ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date, limit_price_up || null, limit_price_down || null, limit_up_expiration || null, limit_down_expiration || null, parent_buy_id || null, original_quantity, quantity_remaining, account_holder_id]);
            
            if (transaction_type === 'SELL' && process.env.NODE_ENV !== 'test' && typeof captureEodPrices === 'function') {
                captureEodPrices(db, transaction_date); 
            }
            
            res.status(201).json({ message: 'Success' });
        } catch (error) {
            log(`[ERROR] Failed to add transaction: ${error.message}`);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { ticker, exchange, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, account_holder_id } = req.body;
            
            const numQuantity = parseFloat(quantity);
            const numPrice = parseFloat(price);

            if (!ticker || !exchange || !transaction_date || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure all fields are valid.' });
            }

            const query = `UPDATE transactions SET ticker = ?, exchange = ?, quantity = ?, price = ?, transaction_date = ?, limit_price_up = ?, limit_up_expiration = ?, limit_price_down = ?, limit_down_expiration = ?, account_holder_id = ? WHERE id = ?`;
            await db.run(query, [ticker.toUpperCase(), exchange, numQuantity, numPrice, transaction_date, limit_price_up || null, limit_up_expiration || null, limit_price_down || null, limit_down_expiration || null, account_holder_id, id]);

            res.json({ message: 'Transaction updated successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to update transaction with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Server error during transaction update.' });
        }
    });
    
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', id);

            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            if (transaction.transaction_type === 'SELL' && transaction.parent_buy_id) {
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining + ? WHERE id = ?', [transaction.quantity, transaction.parent_buy_id]);
            }

            await db.run('DELETE FROM transactions WHERE id = ?', id);
            res.json({ message: 'Transaction deleted successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to delete transaction with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Server error during transaction deletion.' });
        }
    });

    return router;
};