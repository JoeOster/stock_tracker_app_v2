// routes/orders.js
const express = require('express');
const router = express.Router();

// This module will be passed the database connection (db) from server.js
module.exports = (db) => {

    // --- PENDING ORDERS ENDPOINTS ---
    // Base path: /api/orders/pending

    router.get('/pending', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let query = `SELECT * FROM pending_orders WHERE status = 'ACTIVE'`;
            const params = [];
            if (holderId && holderId !== 'all') {
                query += ' AND account_holder_id = ?';
                params.push(holderId);
            }
            query += ' ORDER BY created_date DESC';
            const orders = await db.all(query, params);
            res.json(orders);
        } catch (error) {
            console.error("Failed to fetch pending orders:", error);
            res.status(500).json({ message: 'Error fetching pending orders.' });
        }
    });

    router.post('/pending', async (req, res) => {
        try {
            const { account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date, expiration_date, notes, advice_source_id } = req.body;
            
            if (!account_holder_id || !ticker || !exchange || !order_type || !limit_price || !quantity || !created_date) {
                return res.status(400).json({ message: 'Invalid input. Ensure all required fields are provided.' });
            }

            const query = `
                INSERT INTO pending_orders 
                (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date, expiration_date, notes, advice_source_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await db.run(query, [
                account_holder_id, ticker.toUpperCase(), exchange, order_type, limit_price, quantity, created_date, 
                expiration_date || null, notes || null, advice_source_id || null
            ]);
            res.status(201).json({ message: 'Pending order created successfully.' });
        } catch (error) {
            console.error('Failed to create pending order:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    router.put('/pending/:id', async (req, res) => {
        try {
            const { status } = req.body;
            const { id } = req.params;

            if (!status || !['ACTIVE', 'FILLED', 'CANCELLED'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status provided.' });
            }

            await db.run('UPDATE pending_orders SET status = ? WHERE id = ?', [status, id]);
            res.json({ message: 'Pending order status updated.' });
        } catch (error) {
            console.error('Failed to update pending order:', error);
            res.status(500).json({ message: 'Error updating pending order.' });
        }
    });


    // --- NOTIFICATIONS ENDPOINTS ---
    // Base path: /api/orders/notifications

    router.get('/notifications', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let query = `SELECT * FROM notifications WHERE status = 'UNREAD'`;
            const params = [];
            if (holderId && holderId !== 'all') {
                query += ' AND account_holder_id = ?';
                params.push(holderId);
            }
            query += ' ORDER BY created_at DESC';
            const notifications = await db.all(query, params);
            res.json(notifications);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            res.status(500).json({ message: 'Error fetching notifications.' });
        }
    });

    router.put('/notifications/:id', async (req, res) => {
        try {
            const { status } = req.body;
            const { id } = req.params;

            if (!status || !['PENDING', 'DISMISSED'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status provided.' });
            }

            await db.run('UPDATE notifications SET status = ? WHERE id = ?', [status, id]);
            res.json({ message: 'Notification status updated.' });
        } catch (error) {
            console.error('Failed to update notification:', error);
            res.status(500).json({ message: 'Error updating notification.' });
        }
    });

    return router;
};