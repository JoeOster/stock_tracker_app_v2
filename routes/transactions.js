// routes/transactions.js
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling transaction-related API endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {function(import('sqlite').Database, string): Promise<void>} captureEodPrices - A function to capture end-of-day prices.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log, captureEodPrices) => {
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
            log(`[ERROR] Failed to fetch transactions: ${e.message}`);
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

    /**
     * PUT /:id
     * Updates an existing transaction.
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { ticker, exchange, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, account_holder_id } = req.body;
            
            const numQuantity = parseFloat(quantity);
            const numPrice = parseFloat(price);

            if (!ticker || !exchange || !transaction_date || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure all fields are valid.' });
            }

            // A simple update query; more complex logic would be needed if we allowed changing transaction type, etc.
            const query = `UPDATE transactions SET ticker = ?, exchange = ?, quantity = ?, price = ?, transaction_date = ?, limit_price_up = ?, limit_up_expiration = ?, limit_price_down = ?, limit_down_expiration = ?, account_holder_id = ? WHERE id = ?`;
            await db.run(query, [ticker.toUpperCase(), exchange, numQuantity, numPrice, transaction_date, limit_price_up || null, limit_up_expiration || null, limit_price_down || null, limit_down_expiration || null, account_holder_id, id]);

            res.json({ message: 'Transaction updated successfully.' });

        } catch (error) {
            log(`[ERROR] Failed to update transaction with ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ message: 'Server error during transaction update.' });
        }
    });

    /**
     * DELETE /:id
     * Deletes a transaction. If the deleted transaction is a SELL, it reverts the quantity_remaining on the parent BUY.
     */
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