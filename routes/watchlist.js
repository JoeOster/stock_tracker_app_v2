// /routes/watchlist.js
/**
 * @file Creates and returns an Express router for handling watchlist endpoints.
 * @module routes/watchlist
 */
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling watchlist endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  /**
   * @route GET /api/watchlist/ideas/:holderId
   * @group Watchlist - Watchlist operations
   * @description Fetches all 'Trade Idea' watchlist items for a holder.
   * @param {string} holderId.path.required - Account holder ID.
   * @returns {Array<object>|object} 200 - Array of watchlist items. 500 - Error.
   */
  router.get('/ideas/:holderId', async (req, res) => {
    const { holderId } = req.params;
    if (!holderId || holderId === 'all') {
      return res
        .status(400)
        .json({ message: 'A specific Account Holder ID is required.' });
    }
    try {
      // --- MODIFIED: Added "type" check ---
      const items = await db.all(
        "SELECT * FROM watchlist WHERE account_holder_id = ? AND type = 'IDEA' AND status = 'OPEN' ORDER BY created_at DESC",
        [holderId]
      );
      res.json(items);
    } catch (error) {
      log(
        `[ERROR] Failed to fetch watchlist 'ideas' for holder ${holderId}: ${error.message}`
      );
      res
        .status(500)
        .json({ message: 'Server error fetching watchlist ideas.' });
    }
  });

  /**
   * @route POST /api/watchlist/ideas
   * @group Watchlist - Watchlist operations
   * @description Adds a new 'Trade Idea' to the watchlist.
   * @param {object} req.body.required - The trade idea data.
   * @returns {object} 201 - Success. 500 - Error.
   */
  router.post('/ideas', async (req, res) => {
    const {
      account_holder_id,
      ticker,
      advice_source_id,
      journal_entry_id,
      rec_entry_low,
      rec_entry_high,
      rec_tp1,
      rec_tp2,
      rec_stop_loss,
    } = req.body;

    if (!account_holder_id || !ticker) {
      return res
        .status(400)
        .json({ message: 'Account Holder ID and Ticker are required.' });
    }

    try {
      const sql = `
                INSERT INTO watchlist (
                    account_holder_id, ticker, advice_source_id, journal_entry_id,
                    rec_entry_low, rec_entry_high, rec_tp1, rec_tp2, rec_stop_loss,
                    type, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDEA', 'OPEN', CURRENT_TIMESTAMP)
            `;
      const result = await db.run(sql, [
        account_holder_id,
        ticker.toUpperCase(),
        advice_source_id,
        journal_entry_id,
        rec_entry_low,
        rec_entry_high,
        rec_tp1,
        rec_tp2,
        rec_stop_loss,
      ]);
      res
        .status(201)
        .json({ id: result.lastID, message: 'Trade Idea added to watchlist.' });
    } catch (error) {
      log(`[ERROR] Failed to add watchlist 'idea': ${error.message}`);
      res.status(500).json({ message: 'Server error adding watchlist idea.' });
    }
  });

  /**
   * @route PATCH /api/watchlist/ideas/:id/close
   * @group Watchlist - Watchlist operations
   * @description Closes (archives) a 'Trade Idea' watchlist item.
   * @param {string} id.path.required - The ID of the watchlist item.
   * @returns {object} 200 - Success. 500 - Error.
   */
  router.patch('/ideas/:id/close', async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("UPDATE watchlist SET status = 'CLOSED' WHERE id = ?", [id]);
      res.json({ message: 'Trade Idea closed.' });
    } catch (error) {
      log(`[ERROR] Failed to close watchlist 'idea' ${id}: ${error.message}`);
      res.status(500).json({ message: 'Server error closing watchlist idea.' });
    }
  });

  // --- ADDED: New routes for simple 'WATCH' type tickers ---

  /**
   * @route GET /api/watchlist/simple/:holderId
   * @group Watchlist - Watchlist operations
   * @description Fetches all simple 'WATCH' tickers for a holder.
   * @param {string} holderId.path.required - Account holder ID.
   * @returns {Array<object>|object} 200 - Array of simple watchlist items. 500 - Error.
   */
  router.get('/simple/:holderId', async (req, res) => {
    const { holderId } = req.params;
    if (!holderId || holderId === 'all') {
      return res
        .status(400)
        .json({ message: 'A specific Account Holder ID is required.' });
    }
    try {
      const items = await db.all(
        "SELECT id, ticker FROM watchlist WHERE account_holder_id = ? AND type = 'WATCH' AND status = 'OPEN' ORDER BY ticker ASC",
        [holderId]
      );
      res.json(items);
    } catch (error) {
      log(
        `[ERROR] Failed to fetch simple watchlist for holder ${holderId}: ${error.message}`
      );
      res
        .status(500)
        .json({ message: 'Server error fetching simple watchlist.' });
    }
  });

  /**
   * @route POST /api/watchlist/simple
   * @group Watchlist - Watchlist operations
   * @description Adds a new 'WATCH' ticker to the watchlist.
   * @param {object} req.body.required - The ticker data.
   * @param {string} req.body.ticker - The ticker symbol.
   * @param {string|number} req.body.account_holder_id - The account holder ID.
   * @returns {object} 201 - Success. 400 - Invalid input. 409 - Conflict. 500 - Error.
   */
  router.post('/simple', async (req, res) => {
    const { ticker, account_holder_id } = req.body;
    if (!ticker || !account_holder_id || account_holder_id === 'all') {
      return res
        .status(400)
        .json({ message: 'Ticker and Account Holder ID are required.' });
    }

    const upperTicker = ticker.toUpperCase();

    try {
      // Check if this ticker is already being watched
      const existing = await db.get(
        "SELECT id FROM watchlist WHERE account_holder_id = ? AND ticker = ? AND type = 'WATCH' AND status = 'OPEN'",
        [account_holder_id, upperTicker]
      );
      if (existing) {
        return res
          .status(409)
          .json({ message: `${upperTicker} is already on your watched list.` });
      }

      const sql = `
                INSERT INTO watchlist (account_holder_id, ticker, type, status, created_at)
                VALUES (?, ?, 'WATCH', 'OPEN', CURRENT_TIMESTAMP)
            `;
      const result = await db.run(sql, [account_holder_id, upperTicker]);
      res.status(201).json({
        id: result.lastID,
        ticker: upperTicker,
        message: `${upperTicker} added to watched list.`,
      });
    } catch (error) {
      log(`[ERROR] Failed to add simple watched ticker: ${error.message}`);
      res.status(500).json({ message: 'Server error adding watched ticker.' });
    }
  });

  /**
   * @route DELETE /api/watchlist/simple/:id
   * @group Watchlist - Watchlist operations
   * @description Deletes a simple 'WATCH' ticker from the watchlist.
   * @param {string} id.path.required - The ID of the watchlist item to delete.
   * @returns {object} 200 - Success. 500 - Error.
   */
  router.delete('/simple/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // We just delete it. We could set status='CLOSED', but for simple tickers, delete is fine.
      await db.run("DELETE FROM watchlist WHERE id = ? AND type = 'WATCH'", [
        id,
      ]);
      res.json({ message: 'Ticker removed from watched list.' });
    } catch (error) {
      log(
        `[ERROR] Failed to delete simple watched ticker ${id}: ${error.message}`
      );
      res
        .status(500)
        .json({ message: 'Server error deleting watched ticker.' });
    }
  });
  // --- END ADDED ---

  return router;
};
