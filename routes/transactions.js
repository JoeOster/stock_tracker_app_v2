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
            
            // FIX: Strengthen validation to catch non-numeric and invalid values.
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
            
            if (transaction_type === 'SELL' && process.env.NODE_ENV !== 'test') {
                captureEodPrices(db, transaction_date); 
            }
            
            res.status(201).json({ message: 'Success' });
        } catch (error) {
            console.error('Failed to add transaction:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });
    // ... (rest of the file remains the same)
    return router;
};