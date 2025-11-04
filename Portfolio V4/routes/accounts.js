// routes/accounts.js
const express = require('express');
console.log('accounts.js loaded, typeof exports:', typeof module.exports);
const router = express.Router();

/**
 * Creates and returns an Express router for handling account-related endpoints (holders and exchanges).
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  // --- ACCOUNT HOLDER ENDPOINTS ---
  // Base path: /api/accounts/holders

  /**
   * GET /holders
   * Fetches all account holders, ordered by name.
   */
  router.get('/holders', async (req, res) => {
    try {
      const holders = await db.all(
        'SELECT * FROM account_holders ORDER BY name'
      );
      res.json(holders);
    } catch (error) {
      log(`[ERROR] Failed to fetch account holders: ${error.message}`);
      res.status(500).json({ message: 'Error fetching account holders.' });
    }
  });

  // ... (POST /holders, PUT /holders/:id, DELETE /holders/:id remain the same) ...

  /**
   * POST /holders
   * Creates a new account holder.
   */
  router.post('/holders', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res
        .status(400)
        .json({ message: 'Account holder name cannot be empty.' });
    }
    try {
      const result = await db.run(
        'INSERT INTO account_holders (name) VALUES (?)',
        name
      );
      res.status(201).json({ id: result.lastID, name });
    } catch (error) {
      log(`[ERROR] Failed to add account holder: ${error.message}`);
      // @ts-ignore
      if (error.code === 'SQLITE_CONSTRAINT') {
        res
          .status(409)
          .json({ message: 'Account holder name already exists.' });
      } else {
        res.status(500).json({ message: 'Error adding account holder.' });
      }
    }
  });

  /**
   * PUT /holders/:id
   * Updates the name of an existing account holder.
   */
  router.put('/holders/:id', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res
        .status(400)
        .json({ message: 'Account holder name cannot be empty.' });
    }
    try {
      await db.run('UPDATE account_holders SET name = ? WHERE id = ?', [
        name,
        req.params.id,
      ]);
      res.json({ message: 'Account holder updated successfully.' });
    } catch (error) {
      log(
        `[ERROR] Failed to update account holder with ID ${req.params.id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error updating account holder.' });
    }
  });

  /**
   * DELETE /holders/:id
   * Deletes an account holder, with protections against deleting the default account or one that is in use.
   */
  router.delete('/holders/:id', async (req, res) => {
    try {
      const id = req.params.id;
      if (id === '1' || parseInt(id, 10) === 1) {
        return res.status(400).json({
          message: 'Cannot delete the default Primary account holder.',
        });
      }
      const inUse = await db.get(
        'SELECT 1 FROM transactions WHERE account_holder_id = ? LIMIT 1',
        id
      );
      if (inUse) {
        return res.status(400).json({
          message:
            'Cannot delete an account holder that is in use by transactions.',
        });
      }
      // --- FIX: Also check link table ---
      const inUseLinks = await db.get(
        'SELECT 1 FROM account_source_links WHERE account_holder_id = ? LIMIT 1',
        id
      );
      if (inUseLinks) {
        log(`[DELETE] Deleting links for holder ${id} before deleting holder.`);
        await db.run(
          'DELETE FROM account_source_links WHERE account_holder_id = ?',
          id
        );
      }
      // --- END FIX ---
      await db.run('DELETE FROM account_holders WHERE id = ?', id);
      res.json({ message: 'Account holder deleted successfully.' });
    } catch (error) {
      log(
        `[ERROR] Failed to delete account holder with ID ${req.params.id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error deleting account holder.' });
    }
  });

  // --- NEW: ENDPOINTS FOR MANAGING SOURCE SUBSCRIPTIONS ---

  /**
   * GET /holders/:id/sources
   * Fetches ALL global advice sources and indicates which are linked to this user.
   */
  router.get('/holders/:id/sources', async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'all') {
      return res
        .status(400)
        .json({ message: 'A specific account holder ID is required.' });
    }
    try {
      // Get all global sources AND check if a link exists for this user
      const query = `
                SELECT
                    s.id,
                    s.name,
                    s.type,
                    s.is_active,
                    CASE WHEN l.advice_source_id IS NOT NULL THEN 1 ELSE 0 END AS is_linked
                FROM advice_sources s
                LEFT JOIN account_source_links l
                    ON s.id = l.advice_source_id AND l.account_holder_id = ?
                ORDER BY s.type, s.name;
            `;
      const sources = await db.all(query, [id]);
      res.json(sources);
    } catch (error) {
      log(
        `[ERROR] Failed to fetch source subscription list for holder ${id}: ${error.message}`
      );
      res
        .status(500)
        .json({ message: 'Error fetching source subscription list.' });
    }
  });

  /**
   * PUT /holders/:id/sources
   * Updates the linked sources for a specific account holder.
   */
  router.put('/holders/:id/sources', async (req, res) => {
    const { id } = req.params;
    const { sourceIds } = req.body; // Expects an array of source IDs to link

    if (!id || id === 'all') {
      return res
        .status(400)
        .json({ message: 'A specific account holder ID is required.' });
    }
    if (!Array.isArray(sourceIds)) {
      return res
        .status(400)
        .json({ message: 'An array of sourceIds is required.' });
    }

    try {
      await db.exec('BEGIN TRANSACTION');

      // 1. Delete all existing links for this user
      await db.run(
        'DELETE FROM account_source_links WHERE account_holder_id = ?',
        [id]
      );

      // 2. Insert the new links
      if (sourceIds.length > 0) {
        const stmt = await db.prepare(
          'INSERT INTO account_source_links (account_holder_id, advice_source_id) VALUES (?, ?)'
        );
        for (const sourceId of sourceIds) {
          await stmt.run(id, sourceId);
        }
        await stmt.finalize();
      }

      await db.exec('COMMIT');
      res.json({
        message: `Source subscriptions updated for account holder ${id}.`,
      });
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed to update source subscriptions for holder ${id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error updating source subscriptions.' });
    }
  });
  // --- END NEW ENDPOINTS ---

  // --- EXCHANGE ENDPOINTS ---
  // ... (All exchange endpoints remain the same) ...

  /**
   * GET /exchanges
   * Fetches all exchanges, ordered by name.
   */
  router.get('/exchanges', async (req, res) => {
    try {
      const exchanges = await db.all('SELECT * FROM exchanges ORDER BY name');
      res.json(exchanges);
    } catch (error) {
      log(`[ERROR] Failed to fetch exchanges: ${error.message}`);
      res.status(500).json({ message: 'Error fetching exchanges.' });
    }
  });

  /**
   * POST /exchanges
   * Creates a new exchange.
   */
  router.post('/exchanges', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res
        .status(400)
        .json({ message: 'Exchange name cannot be empty.' });
    }
    try {
      const result = await db.run(
        'INSERT INTO exchanges (name) VALUES (?)',
        name
      );
      res.status(201).json({ id: result.lastID, name });
    } catch (error) {
      log(`[ERROR] Failed to add exchange: ${error.message}`);
      // @ts-ignore
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ message: 'Exchange name already exists.' });
      } else {
        res.status(500).json({ message: 'Error adding exchange.' });
      }
    }
  });

  /**
   * PUT /exchanges/:id
   * Updates an existing exchange name and cascades the change to all related transactions.
   */
  router.put('/exchanges/:id', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res
        .status(400)
        .json({ message: 'Exchange name cannot be empty.' });
    }
    try {
      const oldExchange = await db.get(
        'SELECT name FROM exchanges WHERE id = ?',
        req.params.id
      );
      if (oldExchange) {
        await db.run(
          'UPDATE transactions SET exchange = ? WHERE exchange = ?',
          [name, oldExchange.name]
        );
        await db.run('UPDATE exchanges SET name = ? WHERE id = ?', [
          name,
          req.params.id,
        ]);
      }
      res.json({ message: 'Exchange updated successfully.' });
    } catch (error) {
      log(
        `[ERROR] Failed to update exchange with ID ${req.params.id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error updating exchange.' });
    }
  });

  /**
   * DELETE /exchanges/:id
   * Deletes an exchange, preventing deletion if it is currently in use by any transactions.
   */
  router.delete('/exchanges/:id', async (req, res) => {
    try {
      const oldExchange = await db.get(
        'SELECT name FROM exchanges WHERE id = ?',
        req.params.id
      );
      if (oldExchange) {
        const inUse = await db.get(
          'SELECT 1 FROM transactions WHERE exchange = ? LIMIT 1',
          oldExchange.name
        );
        if (inUse) {
          return res.status(400).json({
            message:
              'Cannot delete an exchange that is currently in use by transactions.',
          });
        }
      }
      await db.run('DELETE FROM exchanges WHERE id = ?', req.params.id);
      res.json({ message: 'Exchange deleted successfully.' });
    } catch (error) {
      log(
        `[ERROR] Failed to delete exchange with ID ${req.params.id}: ${error.message}`
      );
      res.status(500).json({ message: 'Error deleting exchange.' });
    }
  });

  return router;
};
