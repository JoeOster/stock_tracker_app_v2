// /routes/advice_sources.js
/**
 * @file Creates and returns an Express router for handling CRUD on advice_sources.
 * @module routes/advice_sources
 */

const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for advice sources.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
  // Base path for these routes is '/api/advice-sources'

  /**
   * @route GET /api/advice-sources/
   * @group AdviceSources - Operations for advice sources
   * @description Fetches advice sources *linked* to a specific account holder.
   * @param {string} holder.query.required - The account holder ID.
   * @param {boolean} [include_inactive.query] - If true, returns all linked sources. Defaults to false.
   * @returns {Array<object>|object} 200 - An array of advice sources. 500 - Server error.
   */
  router.get('/', async (req, res) => {
    try {
      const holderId = req.query.holder;
      const includeInactive = req.query.include_inactive === 'true';

      if (!holderId || holderId === 'all') {
        log(
          '[WARN] Attempted to fetch advice sources without a specific holder ID.'
        );
        return res
          .status(400)
          .json({ message: 'A specific account holder ID is required.' });
      }

      // --- THIS IS THE FIX ---
      // Join with the link table to get only sources for this user
      let query = `
                SELECT s.* FROM advice_sources s
                JOIN account_source_links l ON s.id = l.advice_source_id
                WHERE l.account_holder_id = ?
            `;
      const params = [holderId];
      // --- END FIX ---

      if (!includeInactive) {
        query += ' AND s.is_active = 1';
      }

      query += ' ORDER BY s.name ASC';
      const sources = await db.all(query, params);

      const sourcesWithDetails = sources.map((source) => {
        if (source.details) {
          try {
            source.details = JSON.parse(source.details);
          } catch (e) {
            log(
              `[ERROR] Failed to parse details JSON for source ID ${source.id}: ${e.message}`
            );
            source.details = null;
          }
        }
        return source;
      });

      res.json(sourcesWithDetails);
    } catch (e) {
      log(`[ERROR] Failed to fetch advice sources: ${e.message}`);
      res.status(500).json({ message: 'Error fetching advice sources.' });
    }
  });

  /**
   * @typedef {object} AdviceSourcePostBody
   * @property {string|number} account_holder_id - The ID of the user to link this source to.
   * @property {string} name
   * @property {string} type
   * @property {string|null} [description]
   * @property {string|null} [url]
   * @property {string|null} [image_path]
   * @property {object|null} [details] - JSON blob for dynamic fields
   * @property {boolean} [is_active]
   */

  /**
   * @route POST /api/advice-sources/
   * @group AdviceSources - Operations for advice sources
   * @description Adds a new advice source. Creates it globally if it doesn't exist,
   * then links it to the specified account holder.
   * @param {AdviceSourcePostBody} req.body.required - The data for the new advice source.
   * @returns {object} 201 - The newly created advice source. 400/500 - Error message.
   */
  router.post('/', async (req, res) => {
    const {
      // --- FIX: We now need account_holder_id again, but only for linking ---
      account_holder_id,
      name,
      type,
      description,
      url,
      image_path,
      details,
      is_active = 1,
    } = req.body;

    if (!account_holder_id || !name || !type) {
      return res
        .status(400)
        .json({ message: 'Account Holder, Name, and Type are required.' });
    }
    // --- END FIX ---

    try {
      await db.exec('BEGIN TRANSACTION');

      const detailsJson = details ? JSON.stringify(details) : null;
      const createdAt = new Date().toISOString();

      // --- THIS IS THE FIX ---
      // 1. Try to insert the source globally. "OR IGNORE" does nothing if (name, type) constraint fails.
      const query = `
                INSERT OR IGNORE INTO advice_sources (
                    name, type, description, url, image_path, details, created_at, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
      await db.run(query, [
        name,
        type,
        description || null,
        url || null,
        image_path || null,
        detailsJson,
        createdAt,
        is_active ? 1 : 0,
      ]);

      // 2. Get the ID of the source (whether it was just inserted or already existed)
      const newSource = await db.get(
        'SELECT * FROM advice_sources WHERE name = ? AND type = ?',
        [name, type]
      );

      // 3. Link this source to the user.
      await db.run(
        'INSERT OR IGNORE INTO account_source_links (account_holder_id, advice_source_id) VALUES (?, ?)',
        [account_holder_id, newSource.id]
      );

      await db.exec('COMMIT');
      // --- END FIX ---

      if (newSource.details) {
        newSource.details = JSON.parse(newSource.details);
      }

      res.status(201).json(newSource);
    } catch (e) {
      await db.exec('ROLLBACK');
      log(`[ERROR] Failed to add advice source: ${e.message}\n${e.stack}`);
      res
        .status(500)
        .json({ message: 'Server error while adding advice source.' });
    }
  });

  // ... (The PUT, PUT /toggle-active, and DELETE routes remain the same as your current file)
  // ... (They correctly operate on the global source, which is what we want)

  /**
   * @typedef {object} AdviceSourcePutBody
   * @property {string} name
   * @property {string} type
   * @property {string|null} [description]
   * @property {string|null} [url]
   * @property {string|null} [image_path]
   * @property {object|null} [details] - JSON blob for dynamic fields
   * @property {boolean} [is_active] - Whether the source is active
   */

  /**
   * @route PUT /api/advice-sources/:id
   * @group AdviceSources - Operations for advice sources
   * @description Updates an existing advice source.
   * @param {string} id.path.required - The ID of the advice source to update.
   * @param {AdviceSourcePutBody} req.body.required - The data to update.
   * @returns {object} 200 - Success message. 400/404/500 - Error message.
   */
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, description, url, image_path, details, is_active } =
      req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and Type are required.' });
    }

    try {
      const detailsJson = details ? JSON.stringify(details) : null;

      const isActiveValue =
        is_active === undefined || is_active === null ? 1 : is_active ? 1 : 0;

      const query = `
                UPDATE advice_sources SET
                    name = ?,
                    type = ?,
                    description = ?,
                    url = ?,
                    image_path = ?,
                    details = ?,
                    is_active = ?
                WHERE id = ?
            `;
      const result = await db.run(query, [
        name,
        type,
        description || null,
        url || null,
        image_path || null,
        detailsJson,
        isActiveValue,
        id,
      ]);

      if (result.changes === 0) {
        return res.status(404).json({ message: 'Advice source not found.' });
      }

      res.json({ message: 'Advice source updated successfully.' });
    } catch (e) {
      log(
        `[ERROR] Failed to update advice source ${id}: ${e.message}\n${e.stack}`
      );
      res
        .status(500)
        .json({ message: 'Server error while updating advice source.' });
    }
  });

  /**
   * @route PUT /api/advice-sources/:id/toggle-active
   * @group AdviceSources - Operations for advice-sources
   * @description Toggles the 'is_active' status of an advice source.
   * @param {string} id.path.required - The ID of the advice source to update.
   * @param {object} req.body.required - The data to update.
   * @param {boolean} req.body.is_active - The new active state (true/false).
   * @returns {object} 200 - Success message. 400/404/500 - Error message.
   */
  router.put('/:id/toggle-active', async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined || is_active === null) {
      return res
        .status(400)
        .json({ message: 'is_active (true/false) is required.' });
    }

    try {
      const isActiveValue = is_active ? 1 : 0;
      const result = await db.run(
        'UPDATE advice_sources SET is_active = ? WHERE id = ?',
        [isActiveValue, id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ message: 'Advice source not found.' });
      }

      res.json({ message: 'Source active status updated.' });
    } catch (e) {
      log(
        `[ERROR] Failed to toggle active status for source ${id}: ${e.message}\n${e.stack}`
      );
      res.status(500).json({ message: 'Server error while updating status.' });
    }
  });

  /**
   * @route DELETE /api/advice-sources/:id
   * @group AdviceSources - Operations for advice sources
   * @description Deletes an advice source *link* for the current user.
   * The global source is not deleted unless no users are linked to it.
   * @param {string} id.path.required - The ID of the advice source to delete.
   * @param {string} holder.query.required - The Account Holder ID to unlink from.
   * @returns {object} 200 - Success message. 404/500 - Error message.
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const holderId = req.query.holder; // --- FIX: Get holderId from query ---

    if (!holderId || holderId === 'all') {
      return res
        .status(400)
        .json({
          message:
            'A specific account holder ID is required to remove a source.',
        });
    }

    try {
      // --- THIS IS THE FIX ---
      // 1. Delete the *link* between the user and the source
      log(`[DELETE] Unlinking source ${id} from holder ${holderId}`);
      const result = await db.run(
        'DELETE FROM account_source_links WHERE account_holder_id = ? AND advice_source_id = ?',
        [holderId, id]
      );

      if (result.changes === 0) {
        return res
          .status(404)
          .json({ message: 'Source link not found for this user.' });
      }

      // 2. (Optional) Garbage collect the source if no one else is using it.
      const links = await db.get(
        'SELECT COUNT(*) as count FROM account_source_links WHERE advice_source_id = ?',
        id
      );
      if (links.count === 0) {
        // Check for associations on other tables (though cascade delete should handle links)
        const journalCount = await db.get(
          'SELECT COUNT(*) as count FROM journal_entries WHERE advice_source_id = ?',
          id
        );
        const txCount = await db.get(
          'SELECT COUNT(*) as count FROM transactions WHERE advice_source_id = ?',
          id
        );
        // ... (add other checks: documents, notes, watchlist, pending_orders)

        if (journalCount.count === 0 && txCount.count === 0) {
          log(
            `[DELETE] Source ${id} is no longer linked by any user or item. Deleting globally.`
          );
          await db.run('DELETE FROM advice_sources WHERE id = ?', id);
          // Note: Cascades will delete from source_notes.
        } else {
          log(
            `[DELETE] Source ${id} unlinked, but kept globally as it's still referenced by ${journalCount.count} journal entries or ${txCount.count} transactions.`
          );
        }
      }
      // --- END FIX ---

      res.json({ message: 'Advice source removed from your account.' });
    } catch (e) {
      log(
        `[ERROR] Failed to delete/unlink advice source ${id}: ${e.message}\n${e.stack}`
      );
      res
        .status(500)
        .json({ message: 'Server error while deleting advice source.' });
    }
  });

  return router;
};
