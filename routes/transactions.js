// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/routes/transactions.js
const express = require('express');
const router = express.Router();

module.exports = (db, log, captureEodPrices, importSessions) => {
    // The base path for these routes is '/api/transactions'

    /**
     * POST /import
     * Handles the batch import of reconciled transactions from the CSV importer.
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
        const toCreate = [];
        const toDelete = [];

        resolutions.forEach(res => {
            const conflictItem = sessionData.find(item => item.csvRowIndex == res.csvIndex);
            if (conflictItem && res.resolution === 'REPLACE') {
                toDelete.push(conflictItem.matchedTx.id);
                toCreate.push(conflictItem);
            }
        });
        
        sessionData.forEach(item => {
            if (item.status === 'New') {
                toCreate.push(item);
            }
        });
        
        if (toCreate.length === 0 && toDelete.length === 0) {
            importSessions.delete(sessionId);
            return res.status(200).json({ message: 'No changes were committed.' });
        }

        try {
            await db.exec('BEGIN TRANSACTION');

            if (toDelete.length > 0) {
                const deleteStmt = await db.prepare('DELETE FROM transactions WHERE id = ?');
                for (const id of toDelete) {
                    await deleteStmt.run(id);
                }
                await deleteStmt.finalize();
            }

            if (toCreate.length > 0) {
                toCreate.sort((a, b) => new Date(a.date) - new Date(b.date));
                for (const tx of toCreate) {
                    const quantity = parseFloat(tx.quantity);
                    const price = parseFloat(tx.price);
                    const createdAt = new Date().toISOString();

                    if (tx.type === 'BUY') {
                        await db.run('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [tx.date, tx.ticker, tx.exchange, tx.type, quantity, price, accountHolderId, quantity, quantity, 'CSV_IMPORT', createdAt]);
                    } else if (tx.type === 'SELL') {
                        let sellQuantity = quantity;
                        const openLots = await db.all("SELECT * FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 ORDER BY transaction_date ASC", [tx.ticker, accountHolderId]);

                        if (openLots.length === 0) {
                             log(`[IMPORT WARNING] No open BUY lot for SELL of ${tx.ticker} on ${tx.date}. Skipping and creating notification.`);
                             const message = `An imported SELL transaction for ${tx.quantity} shares of ${tx.ticker} on ${tx.date} was ignored because no corresponding open BUY lot could be found.`;
                             await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                             continue; // Skip this transaction and continue with the next one
                        }

                        for (const lot of openLots) {
                            if (sellQuantity <= 0) break;
                            const sellableQuantity = Math.min(sellQuantity, lot.quantity_remaining);
                            await db.run('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                [tx.date, tx.ticker, tx.exchange, tx.type, sellableQuantity, price, accountHolderId, lot.id, 'CSV_IMPORT', createdAt]);
                            await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [sellableQuantity, lot.id]);
                            sellQuantity -= sellableQuantity;
                        }
                         if (sellQuantity > 0.00001) {
                            log(`[IMPORT WARNING] Not enough shares to cover entire SELL of ${tx.ticker} on ${tx.date}. ${sellQuantity} shares were not sold.`);
                            const message = `An imported SELL transaction for ${tx.ticker} on ${tx.date} could not be fully completed. There were not enough shares in open lots to cover the entire sale. ${sellQuantity} shares were not recorded as sold.`;
                            await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                        }
                    }
                }
            }

            await db.exec('COMMIT');
            importSessions.delete(sessionId);
            res.status(201).json({ message: 'Import completed successfully!' });
        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed during batch import: ${error.message}`);
            res.status(500).json({ message: `Import failed: ${error.message}` });
        }
    });

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
            const query = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, parent_buy_id, original_quantity, quantity_remaining, account_holder_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.run(query, [ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date, limit_price_up || null, limit_price_down || null, limit_up_expiration || null, limit_down_expiration || null, parent_buy_id || null, original_quantity, quantity_remaining, account_holder_id, 'MANUAL', new Date().toISOString()]);
            
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