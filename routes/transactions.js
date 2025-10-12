// routes/transactions.js
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling transaction-related API endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(import('sqlite').Database, string): Promise<void>} captureEodPrices - A function to capture end-of-day prices.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, captureEodPrices) => {
    // The base path for these routes is '/api/transactions'

    /**
     * GET /
     * Fetches all transactions, optionally filtered by an account holder.
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
            res.status(500).json({message: "Error fetching transactions"});
        }
    });

    /**
     * POST /
     * Creates a new transaction (BUY or SELL).
     * For BUYs, it initializes lot-tracking columns.
     * For SELLs, it validates against and updates the parent BUY lot.
     */
    router.post('/', async (req, res) => {
        try {
            const { ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, parent_buy_id, account_holder_id } = req.body;
            if (!ticker || !exchange || !transaction_date || !['BUY', 'SELL'].includes(transaction_type) || quantity <= 0 || price <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure account holder is selected.' });
            }
            let original_quantity = null, quantity_remaining = null;
            if (transaction_type === 'BUY') {
                original_quantity = quantity;
                quantity_remaining = quantity;
            } else if (transaction_type === 'SELL' && parent_buy_id) {
                const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ?', parent_buy_id);
                if (!parentBuy) return res.status(404).json({ message: 'Parent buy transaction not found.' });
                if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) return res.status(400).json({ message: 'Sell date cannot be before the buy date.' });
                if (parentBuy.quantity_remaining < quantity) return res.status(400).json({ message: 'Sell quantity exceeds remaining quantity.' });
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [quantity, parent_buy_id]);
            }
            const query = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, parent_buy_id, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.run(query, [ticker.toUpperCase(), exchange, transaction_type, quantity, price, transaction_date, limit_price_up || null, limit_price_down || null, limit_up_expiration || null, limit_down_expiration || null, parent_buy_id || null, original_quantity, quantity_remaining, account_holder_id]);
            if (transaction_type === 'SELL') { captureEodPrices(db, transaction_date); }
            res.status(201).json({ message: 'Success' });
        } catch (error) {
            console.error('Failed to add transaction:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    /**
     * GET /:id
     * Fetches a single transaction by its ID.
     */
    router.get('/:id', async (req, res) => {
        try {
            const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', req.params.id);
            if (transaction) {
                res.json(transaction);
            } else {
                res.status(404).json({ message: 'Transaction not found' });
            }
        } catch (error) {
            console.error('Error fetching single transaction:', error);
            res.status(500).json({ message: 'Error fetching transaction.' });
        }
    });

    /**
     * PUT /:id
     * Updates an existing transaction.
     * Handles cascading updates to quantity_remaining for BUY and parent BUY lots.
     */
    router.put('/:id', async (req, res) => {
        try {
            const { exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, account_holder_id } = req.body;
            const ticker = req.body.ticker ? req.body.ticker.toUpperCase() : null;
            
            const originalTx = await db.get('SELECT * FROM transactions WHERE id = ?', req.params.id);
            if (!originalTx) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            const finalUpdate = {
                id: req.params.id, ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id,
                limit_price_up: (limit_price_up !== null && limit_price_up !== '' && !isNaN(parseFloat(limit_price_up))) ? parseFloat(limit_price_up) : null,
                limit_up_expiration: limit_up_expiration || null,
                limit_price_down: (limit_price_down !== null && limit_price_down !== '' && !isNaN(parseFloat(limit_price_down))) ? parseFloat(limit_price_down) : null,
                limit_down_expiration: limit_down_expiration || null,
                original_quantity: originalTx.original_quantity,
                quantity_remaining: originalTx.quantity_remaining
            };

            if (transaction_type === 'BUY') {
                const childSales = await db.all('SELECT * FROM transactions WHERE parent_buy_id = ?', req.params.id);
                for (const sale of childSales) {
                    if (new Date(sale.transaction_date) < new Date(transaction_date)) {
                        return res.status(400).json({ message: 'Buy date cannot be after any of its sell dates.' });
                    }
                }
                const quantitySold = originalTx.original_quantity - originalTx.quantity_remaining;
                const newRemaining = quantity - quantitySold;
                if (newRemaining < 0) {
                    return res.status(400).json({ message: 'Update would result in negative remaining quantity.' });
                }
                finalUpdate.original_quantity = quantity;
                finalUpdate.quantity_remaining = newRemaining;
            } else if (transaction_type === 'SELL' && originalTx.parent_buy_id) {
                const quantityChange = quantity - originalTx.quantity;
                const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ?', originalTx.parent_buy_id);
                if (parentBuy.quantity_remaining - quantityChange < 0) {
                    return res.status(400).json({ message: 'Update would result in negative remaining quantity on parent.' });
                }
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [quantityChange, originalTx.parent_buy_id]);
            }
            
            const query = `UPDATE transactions 
                           SET ticker = ?, exchange = ?, transaction_type = ?, quantity = ?, price = ?, transaction_date = ?, 
                               limit_price_up = ?, limit_price_down = ?, limit_up_expiration = ?, limit_down_expiration = ?,
                               original_quantity = ?, quantity_remaining = ?, account_holder_id = ?
                           WHERE id = ?`;
            await db.run(query, [
                finalUpdate.ticker, finalUpdate.exchange, finalUpdate.transaction_type, finalUpdate.quantity, finalUpdate.price, finalUpdate.transaction_date,
                finalUpdate.limit_price_up, finalUpdate.limit_price_down, finalUpdate.limit_up_expiration, finalUpdate.limit_down_expiration,
                finalUpdate.original_quantity, finalUpdate.quantity_remaining, finalUpdate.account_holder_id,
                finalUpdate.id
            ]);
            res.json({ message: 'Transaction updated.' });
        } catch (error) {
            console.error('Failed to update transaction:', error);
            res.status(500).json({ message: 'Error updating transaction.' });
        }
    });

    /**
     * DELETE /:id
     * Deletes a transaction.
     * If deleting a SELL, it "returns" the quantity to the parent BUY lot.
     * Prevents deletion of a BUY lot that has associated sales.
     */
    router.delete('/:id', async (req, res) => {
        try {
            const txToDelete = await db.get('SELECT * FROM transactions WHERE id = ?', req.params.id);
            if (!txToDelete) return res.status(404).json({ message: 'Transaction not found' });
            if (txToDelete.transaction_type === 'SELL' && txToDelete.parent_buy_id) {
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining + ? WHERE id = ?', [txToDelete.quantity, txToDelete.parent_buy_id]);
            } else if (txToDelete.transaction_type === 'BUY') {
                const sells = await db.get('SELECT COUNT(*) as count FROM transactions WHERE parent_buy_id = ?', txToDelete.id);
                if (sells.count > 0) { return res.status(400).json({ message: 'Cannot delete a BUY transaction that has associated sales. Please delete the sales first.' }); }
            }
            await db.run('DELETE FROM transactions WHERE id = ?', req.params.id);
            res.json({ message: 'Transaction deleted.' });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            res.status(500).json({ message: 'Error deleting transaction.' });
        }
    });

    /**
     * POST /batch
     * Imports a batch of BUY transactions, typically from a CSV file.
     */
    router.post('/batch', async (req, res) => {
        const { transactions, account_holder_id } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0 || !account_holder_id) {
            return res.status(400).json({ message: 'Invalid input. Expected an array of transactions and an account_holder_id.' });
        }
        let insert;
        try {
            insert = await db.prepare('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            for (const tx of transactions) {
                if (tx.transaction_type !== 'BUY') {
                    throw new Error(`CSV contains a non-BUY transaction for ${tx.ticker}, which is not allowed.`);
                }
                const ticker = tx.ticker ? tx.ticker.toUpperCase() : null;
                if (!ticker || !tx.exchange || !tx.transaction_date || tx.quantity <= 0 || tx.price <= 0) {
                    throw new Error('Invalid transaction data in batch.');
                }
                await insert.run(tx.transaction_date, ticker, tx.exchange, tx.transaction_type, tx.quantity, tx.price, tx.quantity, tx.quantity, account_holder_id);
            }
            res.status(201).json({ message: `${transactions.length} transactions imported successfully.` });
        } catch (error) {
            console.error('Failed to import batch transactions:', error);
            res.status(500).json({ message: error.message || 'Failed to import transactions.' });
        } finally {
            if (insert) await insert.finalize();
        }
    });

    return router;
};