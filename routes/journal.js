// /routes/journal.js
/**
 * @file Creates and returns an Express router for handling journal entry endpoints.
 * @module routes/journal
 */

const express = require('express');
const router = express.Router();

// --- Import Refactored Business Logic ---
const {
  handleCreateJournalEntry,
  handleUpdateJournalEntry,
  handleDeleteJournalEntry,
} = require('./journal-crud-logic.js');
const { handleExecuteJournalEntry } = require('./journal-execute-logic.js');
// --- End Imports ---

/**
 * Creates and returns an Express router for journal entries.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  // Base path for these routes is '/api/journal'

  /**
   * @route GET /api/journal/
   * @group Journal - Operations for journal entries
   * @description Fetches all journal entries, filtered by account holder and optionally by status.
   * @param {string} holder.query.required - The account holder ID.
   * @param {string} [status.query] - Optional status to filter by (e.g., 'OPEN', 'CLOSED').
   * @returns {Array<object>|object} 200 - An array of journal entries. 500 - Server error.
   */
  router.get('/', async (req, res) => {
    try {
      const holderId = req.query.holder;
      const status = req.query.status;

      if (!holderId || holderId === 'all') {
        log('[WARN] Attempted to fetch journal without a specific holder ID.');
        return res
          .status(400)
          .json({ message: 'A specific account holder ID is required.' });
      }

      // --- FIX: Join advice_sources instead of strategies ---
      let query = `SELECT j.*, a.name as advice_source_name 
                         FROM journal_entries j
                         LEFT JOIN advice_sources a ON j.advice_source_id = a.id
                         WHERE j.account_holder_id = ?`;
      // --- END FIX ---
      const params = [holderId];

      if (status) {
        query += ' AND j.status = ?';
        params.push(status);
      }

      query += ' ORDER BY j.entry_date DESC, j.id DESC';

      const entries = await db.all(query, params);
      res.json(entries);
    } catch (e) {
      log(`[ERROR] Failed to fetch journal entries: ${e.message}`);
      res.status(500).json({ message: 'Error fetching journal entries.' });
    }
  });

  /**
   * @typedef {object} JournalEntryPostBody
   * @property {string|number} account_holder_id
   * @property {string|number} advice_source_id
   * @property {string} ticker
   * @property {string} exchange
   * @property {string} direction
   * @property {string} entry_date - Format YYYY-MM-DD
   * @property {number} entry_price
   * @property {number} quantity
   * @property {number|null} [stop_loss_price]
   * @property {number|null} [target_price]
   * @property {number|null} [target_price_2]
   * @property {string|null} [notes]
   * @property {'OPEN'|'CLOSED'|'CANCELLED'} [status='OPEN']
   * @property {string|null} [advice_source_details]
   * @property {string|null} [entry_reason]
   * @property {Array<object>} [linked_document_urls] - e.g., [{title: "Chart", url: "http://..."}]
   */

  /**
   * @route POST /api/journal/
   * @group Journal - Operations for journal entries
   * @description Adds a new journal entry.
   * @param {JournalEntryPostBody} req.body.required - The data for the new journal entry.
   * @returns {object} 201 - The newly created journal entry. 400/500 - Error message.
   */
  router.post('/', async (req, res) => {
    try {
      await db.exec('BEGIN TRANSACTION');
      const newEntry = await handleCreateJournalEntry(db, req.body);
      await db.exec('COMMIT');
      res.status(201).json(newEntry);
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed to create journal entry: ${error.message}\n${error.stack}`
      );
      if (error.message.includes('Missing required fields')) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server error creating journal entry.' });
      }
    }
  });

  /**
   * @route PUT /api/journal/:id
   * @group Journal - Operations for journal entries
   * @description Updates an existing journal entry.
   * @param {string} id.path.required - The ID of the journal entry to update.
   * @param {object} req.body.required - An object with the fields to update.
   * @returns {object} 200 - Success message. 400/404/500 - Error message.
   */
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await handleUpdateJournalEntry(db, id, req.body);
      res.json({ message: 'Journal entry updated successfully.' });
    } catch (error) {
      log(
        `[ERROR] Failed to update journal entry ${id}: ${error.message}\n${error.stack}`
      );
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (
        error.message.includes('Cannot modify') ||
        error.message.includes('No fields') ||
        error.message.includes('Cannot set status')
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server error updating journal entry.' });
      }
    }
  });

  /**
   * @typedef {object} JournalExecuteBody
   * @property {string} execution_date - Format YYYY-MM-DD
   * @property {number} execution_price
   * @property {string|number} account_holder_id
   */

  /**
   * @route PUT /api/journal/:id/execute
   * @group Journal - Operations for journal entries
   * @description Executes an 'OPEN' journal entry, creating a real BUY transaction.
   * @param {string} id.path.required - The ID of the journal entry to execute.
   * @param {JournalExecuteBody} req.body.required - Execution details.
   * @returns {object} 200 - Success message and new transaction ID. 400/404/500 - Error message.
   */
  router.put('/:id/execute', async (req, res) => {
    const { id } = req.params;
    try {
      await db.exec('BEGIN TRANSACTION');
      const result = await handleExecuteJournalEntry(db, log, id, req.body);
      await db.exec('COMMIT');
      res.json(result);
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed to execute journal entry ${id}: ${error.message}\n${error.stack}`
      );
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('Cannot execute')
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server error executing journal entry.' });
      }
    }
  });

  /**
   * @route DELETE /api/journal/:id
   * @group Journal - Operations for journal entries
   * @description Deletes a journal entry (if not 'EXECUTED').
   * @param {string} id.path.required - The ID of the journal entry to delete.
   * @returns {object} 200 - Success message. 400/404/500 - Error message.
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.exec('BEGIN TRANSACTION');
      await handleDeleteJournalEntry(db, id);
      await db.exec('COMMIT');
      res.json({
        message: 'Journal entry and associated documents deleted successfully.',
      });
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed to delete journal entry ${id}: ${error.message}\n${error.stack}`
      );
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('Cannot delete')) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: 'Server error deleting journal entry.' });
      }
    }
  });

  return router;
};
