// routes/reporting.js
const express = require('express');
const router = express.Router();
const { getPrices } = require('../services/priceService'); // Use the new centralized price service

/**
 * Creates and returns an Express router for handling complex reporting and data aggregation endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  /**
   * GET /daily_performance/:date
   * Calculates the portfolio's value at the end of the day PRIOR to the selected date.
   */
  router.get('/daily_performance/:date', async (req, res) => {
    const selectedDate = req.params.date;
    const holderId = req.query.holder;

    try {
      // @ts-ignore
      let prevDate = new Date(selectedDate + 'T12:00:00Z');
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const previousDay = prevDate.toISOString().split('T')[0];

      let holderFilter = '';
      const params = [previousDay];
      if (holderId && holderId !== 'all') {
        holderFilter = 'AND account_holder_id = ?';
        // --- THIS IS THE FIX ---
        params.push(String(holderId));
        // --- END FIX ---
      }

      const openLotsQuery = `
                SELECT ticker, price as cost_basis, COALESCE(quantity_remaining, 0) as quantity_remaining
                FROM transactions
                WHERE transaction_type = 'BUY' AND date(transaction_date) <= date(?) AND COALESCE(quantity_remaining, 0) > 0.00001
                ${holderFilter}
            `;
      const openLots = await db.all(openLotsQuery, params);

      const uniqueTickers = [...new Set(openLots.map((lot) => lot.ticker))];
      // Pass a high priority (e.g., 4) for these reporting requests
      const priceMap = await getPrices(uniqueTickers, 4);

      let previousValue = 0;
      for (const lot of openLots) {
        // Unwrap the price from the service's cache object
        const priceToUse = priceMap[lot.ticker]?.price;
        const finalPrice =
          typeof priceToUse === 'number' ? priceToUse : lot.cost_basis;
        previousValue += finalPrice * lot.quantity_remaining;
      }

      res.json({ previousValue });
    } catch (error) {
      // @ts-ignore
      log(
        `[ERROR] Failed to calculate previous day value for daily performance: ${error.message}`
      );
      res.status(500).json({ message: 'Error calculating daily performance' });
    }
  });

  /**
   * GET /positions/:date
   * Fetches all transactions for a specific day and all open positions at the end of that day.
   */
  router.get('/positions/:date', async (req, res) => {
    try {
      const selectedDate = req.params.date;
      const holderId = req.query.holder;
      let holderFilter = '';
      const params = [selectedDate];
      if (holderId && holderId !== 'all') {
        holderFilter = 'AND account_holder_id = ?';
        // --- THIS IS THE FIX ---
        params.push(String(holderId));
        // --- END FIX ---
      }
      const dailyTransactionsQuery = `
                SELECT daily_tx.*, parent_tx.price as parent_buy_price
                FROM transactions AS daily_tx
                LEFT JOIN transactions AS parent_tx ON daily_tx.parent_buy_id = parent_tx.id AND parent_tx.transaction_type = 'BUY'
                WHERE date(daily_tx.transaction_date) = date(?) ${holderFilter ? holderFilter.replace('account_holder_id', 'daily_tx.account_holder_id') : ''} ORDER BY daily_tx.id;
            `;
      const dailyTransactions = await db.all(dailyTransactionsQuery, params);
      dailyTransactions.forEach((tx) => {
        if (tx.transaction_type === 'SELL' && tx.parent_buy_price) {
          // @ts-ignore
          tx.realizedPL = (tx.price - tx.parent_buy_price) * tx.quantity;
        }
      });
      const endOfDayPositionsQuery = `
                SELECT id, ticker, exchange, transaction_date as purchase_date, price as cost_basis, 
                       COALESCE(original_quantity, quantity) as original_quantity, 
                       COALESCE(quantity_remaining, 0) as quantity_remaining,
                       limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, account_holder_id
                FROM transactions
                WHERE transaction_type = 'BUY' AND date(transaction_date) <= date(?) AND COALESCE(quantity_remaining, 0) > 0.00001
                ${holderFilter}
                ORDER BY ticker, purchase_date;
            `;
      const endOfDayPositions = await db.all(endOfDayPositionsQuery, params);

      // Fetch active pending orders
      let pendingOrdersQuery = `
                SELECT id, ticker, exchange, order_type, limit_price, quantity, created_date, expiration_date, notes, advice_source_id
                FROM pending_orders
                WHERE status = 'ACTIVE' AND date(created_date) <= date(?)
                ${holderFilter}
                ORDER BY created_date;
            `;
      const pendingOrders = await db.all(pendingOrdersQuery, params); // Re-use params, but ensure holderFilter is correctly applied

      res.json({
        dailyTransactions,
        endOfDayPositions,
        openOrders: pendingOrders,
      });
    } catch (error) {
      // @ts-ignore
      log(`[ERROR] CRITICAL ERROR in /api/positions/:date: ${error.message}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  /**
   * GET /realized_pl/summary
   * Calculates the total lifetime realized profit/loss, grouped by exchange.
   */
  router.get('/realized_pl/summary', async (req, res) => {
    try {
      const holderId = req.query.holder;
      let holderFilter = '';
      const params = [];
      if (holderId && holderId !== 'all') {
        holderFilter = 'AND s.account_holder_id = ?';
        params.push(String(holderId)); // Also apply fix here for consistency
      }
      const query = `
                SELECT s.exchange, SUM((s.price - b.price) * s.quantity) as total_pl
                FROM transactions s JOIN transactions b ON s.parent_buy_id = b.id
                WHERE s.transaction_type = 'SELL' ${holderFilter} GROUP BY s.exchange;
            `;
      const byExchangeRows = await db.all(query, params);
      const byExchange = byExchangeRows.map((row) => ({
        exchange: row.exchange,
        total_pl: row.total_pl,
      }));
      const total = byExchange.reduce((sum, row) => sum + row.total_pl, 0);
      res.json({ byExchange, total });
    } catch (error) {
      // @ts-ignore
      log(`[ERROR] Failed to get realized P&L summary: ${error.message}`);
      res.status(500).json({ message: 'Error fetching realized P&L summary.' });
    }
  });

  /**
   * POST /realized_pl/summary
   * Calculates the realized profit/loss within a specific date range, grouped by exchange.
   */
  router.post('/realized_pl/summary', async (req, res) => {
    try {
      const { startDate, endDate, accountHolderId } = req.body;
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: 'Start date and end date are required.' });
      }
      let holderFilter = '';
      const params = [startDate, endDate];
      if (accountHolderId && accountHolderId !== 'all') {
        holderFilter = 'AND s.account_holder_id = ?';
        params.push(accountHolderId); // This is from req.body, so it's already a single value
      }
      const query = `
                SELECT s.exchange, SUM((s.price - b.price) * s.quantity) as total_pl
                FROM transactions s JOIN transactions b ON s.parent_buy_id = b.id
                WHERE s.transaction_type = 'SELL'
                AND s.transaction_date >= ? 
                AND s.transaction_date <= ?
                ${holderFilter}
                GROUP BY s.exchange;
            `;
      const byExchangeRows = await db.all(query, params);
      const byExchange = byExchangeRows.map((row) => ({
        exchange: row.exchange,
        total_pl: row.total_pl,
      }));
      const total = byExchange.reduce((sum, row) => sum + row.total_pl, 0);
      res.json({ byExchange, total });
    } catch (error) {
      // @ts-ignore
      log(
        `[ERROR] Failed to get ranged realized P&L summary: ${error.message}`
      );
      res
        .status(500)
        .json({ message: 'Error fetching ranged realized P&L summary.' });
    }
  });

  /**
   * GET /portfolio/overview
   * Fetches a summarized overview of all current open positions, grouped by ticker.
   * Calculates total quantity and weighted average cost for each ticker.
   */
  router.get('/portfolio/overview', async (req, res) => {
    try {
      const holderId = req.query.holder;
      let holderFilter = '';
      const params = [];
      if (holderId && holderId !== 'all') {
        holderFilter = `AND account_holder_id = ?`;
        params.push(String(holderId)); // Also apply fix here for consistency
      }

      const overviewQuery = `
                SELECT 
                    ticker,
                    SUM(quantity_remaining) as total_quantity,
                    SUM(price * quantity_remaining) / SUM(quantity_remaining) as weighted_avg_cost
                FROM transactions
                WHERE transaction_type = 'BUY' AND COALESCE(quantity_remaining, 0) > 0.00001
                ${holderFilter}
                GROUP BY ticker 
                ORDER BY ticker;
            `;
      const overview = await db.all(overviewQuery, params);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      for (const pos of overview) {
        const priceRecord = await db.get(
          'SELECT close_price FROM historical_prices WHERE ticker = ? AND date <= ? ORDER BY date DESC LIMIT 1',
          [pos.ticker, yesterdayStr]
        );
        // @ts-ignore
        pos.previous_close = priceRecord ? priceRecord.close_price : null;
      }
      res.json(overview);
    } catch (error) {
      // @ts-ignore
      log(`[ERROR] Failed to get portfolio overview: ${error.message}`);
      res.status(500).json({ message: 'Error fetching portfolio overview.' });
    }
  });

  return router;
};
