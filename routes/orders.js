// routes/orders.js
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling pending orders and notifications.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  // --- PENDING ORDERS ENDPOINTS ---
  // Base path: /api/orders/pending

  /**
   * GET /pending
   * Fetches all 'ACTIVE' pending orders, optionally filtered by an account holder.
   */
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
      log(`[ERROR] Failed to fetch pending orders: ${error.message}`);
      res.status(500).json({ message: 'Error fetching pending orders.' });
    }
  });

  /**
   * POST /pending
   * Creates a new pending order (e.g., a BUY_LIMIT order).
   */
  router.post('/pending', async (req, res) => {
    try {
      const {
        account_holder_id,
        ticker,
        exchange,
        order_type,
        limit_price,
        quantity,
        created_date,
        expiration_date,
        notes,
        advice_source_id,
      } = req.body;

      if (
        !account_holder_id ||
        !ticker ||
        !exchange ||
        !order_type ||
        !limit_price ||
        !quantity ||
        !created_date
      ) {
        return res.status(400).json({
          message: 'Invalid input. Ensure all required fields are provided.',
        });
      }

      const query = `
                INSERT INTO pending_orders 
                (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date, expiration_date, notes, advice_source_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
      await db.run(query, [
        account_holder_id,
        ticker.toUpperCase(),
        exchange,
        order_type,
        limit_price,
        quantity,
        created_date,
        expiration_date || null,
        notes || null,
        advice_source_id || null,
      ]);
      res.status(201).json({ message: 'Pending order created successfully.' });
    } catch (error) {
      log(`[ERROR] Failed to create pending order: ${error.message}`);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  /**
   * PUT /pending/:id
   * Updates the status of a pending order (e.g., to 'FILLED' or 'CANCELLED').
   */
  router.put('/pending/:id', async (req, res) => {
    try {
      const { status } = req.body;
      const { id } = req.params;

      if (!status || !['ACTIVE', 'FILLED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
      }

      await db.run('UPDATE pending_orders SET status = ? WHERE id = ?', [
        status,
        id,
      ]);
      res.json({ message: 'Pending order status updated.' });
    } catch (error) {
      log(
        `[ERROR] Failed to update pending order with ID ${req.params.id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error updating pending order.' });
    }
  });

  // --- NOTIFICATIONS ENDPOINTS ---
  // Base path: /api/orders/notifications

  /**
   * GET /notifications
   * Fetches all 'UNREAD' notifications, optionally filtered by an account holder.
   */
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
      log(`[ERROR] Failed to fetch notifications: ${error.message}`);
      res.status(500).json({ message: 'Error fetching notifications.' });
    }
  });

  /**
   * PUT /notifications/:id
   * Updates the status of a notification (e.g., to 'PENDING' or 'DISMISSED').
   */
  router.put('/notifications/:id', async (req, res) => {
    try {
      const { status } = req.body;
      const { id } = req.params;

      if (!status || !['PENDING', 'DISMISSED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
      }

      await db.run('UPDATE notifications SET status = ? WHERE id = ?', [
        status,
        id,
      ]);
      res.json({ message: 'Notification status updated.' });
    } catch (error) {
      log(
        `[ERROR] Failed to update notification with ID ${req.params.id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error updating notification.' });
    }
  });

  return router;
};
