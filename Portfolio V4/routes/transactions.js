// /routes/transactions.js
/**
 * @file Creates and returns an Express router for handling transaction endpoints.
 * @module routes/transactions
 */

const express = require('express');
const router = express.Router();

// --- Import Refactored Business Logic ---
const { handleBuyTransaction } = require('./transaction-buy-logic.js');
const { handleSellTransaction } = require('./transaction-sell-logic');
const { handleDividendTransaction } = require('./transaction-dividend-logic');
const { handleUpdateTransaction } = require('./transaction-update-logic.js');
const { handleDeleteTransaction } = require('./transaction-delete-logic.js');
// --- End Imports ---

/**
 * Creates and returns an Express router for handling transaction endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {function(import('sqlite').Database, string): Promise<void>} captureEodPrices - Function to capture EOD prices.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  // The base path for these routes is '/api/transactions'

  /**
   * @route GET /api/transactions/
   * @group Transactions - Operations for transactions
   * @description Fetches all transactions, optionally filtered by account holder.
   * @param {string} [holder.query] - Optional Account holder ID ('all' or specific ID).
   * @returns {Array<object>|object} 200 - An array of transaction objects. 500 - Error message.
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
    } catch (e) {
      log(`[ERROR] Failed to fetch transactions: ${e.message}`);
      res.status(500).json({ message: 'Error fetching transactions' });
    }
  });

  /**
   * @typedef {object} TransactionPostBody
   * @property {string} ticker
   * @property {string} exchange
   * @property {'BUY'|'SELL'} transaction_type
   * @property {number} price
   * @property {string} transaction_date - Format YYYY-MM-DD
   * @property {string|number} account_holder_id
   * @property {number} [quantity] - Required for BUY or single SELL.
   * @property {number|null} [limit_price_up]
   * @property {string|null} [limit_up_expiration]
   * @property {number|null} [limit_price_down]
   * @property {string|null} [limit_down_expiration]
   * @property {number|null} [limit_price_up_2]
   * @property {string|null} [limit_up_expiration_2]
   * @property {string|number|null} [parent_buy_id] - Required for single lot SELL.
   * @property {Array<{parent_buy_id: string|number, quantity_to_sell: number}>|null} [lots] - Required for selective SELL.
   * @property {string|number|null} [advice_source_id]
   * @property {string|number|null} [linked_journal_id]
   */

  /**
   * @route POST /api/transactions/
   * @group Transactions - Operations for transactions
   * @description Adds a single manual BUY/SELL transaction or a selective SELL transaction.
   * @param {TransactionPostBody} req.body.required - The transaction data.
   * @returns {object} 201 - Success. 400 - Invalid input. 404 - Parent BUY not found. 500 - Server error.
   */
  router.post('/', async (req, res) => {
    const {
      ticker,
      exchange,
      transaction_type,
      price,
      transaction_date,
      account_holder_id,
    } = req.body;
    const createdAt = new Date().toISOString();

    // Basic Validation
    if (
      !ticker ||
      !exchange ||
      !transaction_date ||
      !['BUY', 'SELL', 'DIVIDEND'].includes(transaction_type) ||
      isNaN(parseFloat(price)) ||
      parseFloat(price) <= 0 ||
      !account_holder_id
    ) {
      return res.status(400).json({
        message:
          'Invalid input. Ensure ticker, exchange, type, date, price, and holder ID are valid.',
      });
    }

    try {
      await db.exec('BEGIN TRANSACTION');

      if (transaction_type === 'BUY') {
        // --- *** THIS IS THE FIX *** ---
        // Added the 'log' argument
        await handleBuyTransaction(db, log, req.body, createdAt);
        // --- *** END FIX *** ---
      } else if (transaction_type === 'SELL') {
        await handleSellTransaction(req.body, res);
      } else if (transaction_type === 'DIVIDEND') {
        await handleDividendTransaction(req.body, res);
      }

      await db.exec('COMMIT');
      res.status(201).json({ message: 'Transaction logged successfully!' });
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed to add transaction: ${error.message}\n${error.stack}`
      );
      // Determine status code based on error message
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (
        error.message.includes('Invalid') ||
        error.message.includes('exceeds') ||
        error.message.includes('before')
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server Error processing transaction.' });
      }
    }
  });

  /**
   * @route PUT /api/transactions/:id
   * @group Transactions - Operations for transactions
   * @description Updates an existing transaction.
   * @param {string} id.path.required - The ID of the transaction to update.
   * @param {object} req.body.required - A partial or full transaction object with fields to update.
   * @returns {object} 200 - Success. 400 - Invalid input. 404 - Not found. 500 - Server error.
   */
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await handleUpdateTransaction(db, id, req.body);
      res.json({ message: 'Transaction updated successfully.' });
    } catch (error) {
      log(
        `[ERROR] Failed to update transaction with ID ${id}: ${error.message}\n${error.stack}`
      );
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('Invalid')) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server error during transaction update.' });
      }
    }
  });

  /**
   * @route DELETE /api/transactions/:id
   * @group Transactions - Operations for transactions
   * @description Deletes a transaction. If it's a SELL, restores quantity to the parent BUY.
   * @param {string} id.path.required - The ID of the transaction to delete.
   * @returns {object} 200 - Success. 400 - Cannot delete BUY with child SELLs. 404 - Not found. 500 - Server error.
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.exec('BEGIN TRANSACTION');
      await handleDeleteTransaction(db, log, id);
      await db.exec('COMMIT');
      res.json({ message: 'Transaction deleted successfully.' });
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed to delete transaction with ID ${req.params.id}: ${error.message}\n${error.stack}`
      );
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('Cannot delete')) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server error during transaction deletion.' });
      }
    }
  });

  /**
   * @route GET /api/transactions/sales/:buyId
   * @group Transactions - Operations for transactions
   * @description Fetches all SELL transactions linked to a specific parent BUY transaction ID.
   * @param {string} buyId.path.required - The ID of the parent BUY transaction.
   * @param {string} holder.query.required - Account holder ID.
   * @returns {Array<object>|object} 200 - An array of SELL objects. 400 - Missing IDs. 500 - Server error.
   */
  router.get('/sales/:buyId', async (req, res) => {
    const { buyId } = req.params;
    const accountHolderId = req.query.holder;

    if (!buyId) {
      return res.status(400).json({ message: 'Parent Buy ID is required.' });
    }
    if (!accountHolderId || accountHolderId === 'all') {
      return res
        .status(400)
        .json({ message: 'Account Holder ID is required.' });
    }

    try {
      const parentBuy = await db.get(
        "SELECT price as cost_basis FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = 'BUY'",
        [buyId, accountHolderId]
      );
      if (!parentBuy) {
        log(
          `[INFO] Parent BUY lot ID ${buyId} not found for holder ${accountHolderId} when fetching sales.`
        );
        return res.json([]);
      }
      const sales = await db.all(
        "SELECT id, transaction_date, quantity, price FROM transactions WHERE parent_buy_id = ? AND account_holder_id = ? AND transaction_type = 'SELL' ORDER BY transaction_date ASC, id ASC",
        [buyId, accountHolderId]
      );
      const salesWithPL = sales.map((sale) => ({
        ...sale,
        realizedPL: (sale.price - parentBuy.cost_basis) * sale.quantity,
      }));
      res.json(salesWithPL);
    } catch (error) {
      log(
        `[ERROR] Failed to fetch sales for buyId ${buyId}: ${error.message}\n${error.stack}`
      );
      res.status(500).json({ message: 'Server error fetching sales history.' });
    }
  });

  /**
   * @route POST /api/transactions/sales/batch
   * @group Transactions - Operations for transactions
   * @description Fetches all SELL transactions for a *list* of parent BUY transaction IDs.
   * @param {object} req.body.required - The request body.
   * @param {Array<number>} req.body.lotIds - An array of parent BUY transaction IDs.
   * @param {string|number} req.body.holderId - The account holder ID.
   * @returns {Array<object>|object} 200 - An array of SELL objects. 400 - Missing IDs. 500 - Server error.
   */
  router.post('/sales/batch', async (req, res) => {
    const { lotIds, holderId } = req.body;

    if (!Array.isArray(lotIds) || lotIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'An array of lotIds is required.' });
    }
    if (!holderId || holderId === 'all') {
      return res
        .status(400)
        .json({ message: 'A specific Account Holder ID is required.' });
    }

    try {
      // Create a ( ? ) placeholder string for the IN clause
      const placeholders = lotIds.map(() => '?').join(',');

      // 1. Fetch all parent BUY lots to get their cost basis
      const buysQuery = `
                SELECT id, price as cost_basis 
                FROM transactions 
                WHERE id IN (${placeholders}) 
                  AND account_holder_id = ? 
                  AND transaction_type = 'BUY'
            `;
      const parentBuys = await db.all(buysQuery, [...lotIds, holderId]);

      // Create a Map for quick cost basis lookup
      const costBasisMap = new Map(
        parentBuys.map((lot) => [lot.id, lot.cost_basis])
      );

      // 2. Fetch all SELL transactions linked to any of these parent BUYs
      const salesQuery = `
                SELECT id, transaction_date, quantity, price, parent_buy_id 
                FROM transactions 
                WHERE parent_buy_id IN (${placeholders}) 
                  AND account_holder_id = ? 
                  AND transaction_type = 'SELL' 
                ORDER BY transaction_date ASC, id ASC
            `;
      const sales = await db.all(salesQuery, [...lotIds, holderId]);

      // 3. Calculate P/L for each sale
      const salesWithPL = sales.map((sale) => {
        const cost_basis = costBasisMap.get(sale.parent_buy_id);
        const realizedPL =
          cost_basis !== undefined
            ? (sale.price - cost_basis) * sale.quantity
            : 0;
        return { ...sale, realizedPL };
      });

      res.json(salesWithPL);
    } catch (error) {
      log(
        `[ERROR] Failed to fetch batch sales history: ${error.message}\n${error.stack}`
      );
      res.status(500).json({ message: 'Server error fetching sales history.' });
    }
  });

  return router;
};
