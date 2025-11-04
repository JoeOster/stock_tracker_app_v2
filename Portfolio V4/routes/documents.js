// /routes/documents.js
/**
 * @file Defines API routes for managing linked documents.
 * @module routes/documents
 */
const express = require('express');
const router = express.Router();

/**
 * Creates and returns an Express router for handling document endpoints.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} [log=console.log] - The logging function (optional).
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log = console.log) => {
  /**
   * @typedef {object} DocumentPostBody
   * @property {string|number|null} [journal_entry_id] - Must provide this OR advice_source_id.
   * @property {string|number|null} [advice_source_id] - Must provide this OR journal_entry_id.
   * @property {string} external_link - The URL of the document.
   * @property {string} [title] - Optional title.
   * @property {string} [document_type] - Optional type (e.g., 'Chart').
   * @property {string} [description] - Optional description.
   */

  /**
   * @route POST /api/documents/
   * @group Documents - Operations for document links
   * @description Creates a new document link, associated with either a journal entry OR an advice source.
   * @param {DocumentPostBody} req.body.required - The document data.
   * @returns {object} 201 - The newly created document object. 400 - Error message for invalid input. 404 - Error message if foreign key (journal/source) not found. 500 - Server error.
   */
  router.post('/', async (req, res) => {
    const {
      journal_entry_id,
      advice_source_id,
      title,
      document_type,
      external_link,
      description,
    } = req.body;

    // --- Validation ---
    if (!external_link || external_link.trim() === '') {
      return res.status(400).json({ message: 'External link is required.' });
    }
    const journalIdProvided =
      journal_entry_id !== null && journal_entry_id !== undefined;
    const sourceIdProvided =
      advice_source_id !== null && advice_source_id !== undefined;

    if (!journalIdProvided && !sourceIdProvided) {
      return res.status(400).json({
        message:
          'Document must be linked to either a Journal Entry ID or an Advice Source ID.',
      });
    }
    if (journalIdProvided && sourceIdProvided) {
      return res.status(400).json({
        message:
          'Document cannot be linked to both a Journal Entry ID and an Advice Source ID simultaneously.',
      });
    }
    // --- End Validation ---

    try {
      const result = await db.run(
        `
                INSERT INTO documents (
                    journal_entry_id, advice_source_id, title, document_type,
                    external_link, description
                ) VALUES (?, ?, ?, ?, ?, ?)
            `,
        [
          journal_entry_id || null,
          advice_source_id || null,
          title || null,
          document_type || null,
          external_link.trim(),
          description || null,
        ]
      );

      const newDocument = await db.get(
        'SELECT * FROM documents WHERE id = ?',
        result.lastID
      );
      res.status(201).json(newDocument);
    } catch (error) {
      log(`[ERROR] Failed to add document: ${error.message}`);
      // @ts-ignore
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        if (journalIdProvided) {
          return res.status(404).json({
            message: `Journal Entry with ID ${journal_entry_id} not found.`,
          });
        } else if (sourceIdProvided) {
          return res.status(404).json({
            message: `Advice Source with ID ${advice_source_id} not found.`,
          });
        }
      }
      // @ts-ignore
      res
        .status(500)
        .json({ message: `Error adding document: ${error.message}` });
    }
  });

  /**
   * @route DELETE /api/documents/:id
   * @group Documents - Operations for document links
   * @description Deletes a document link.
   * @param {string} id.path.required - The ID of the document link to delete.
   * @returns {object} 200 - Success message. 404 - Document not found. 500 - Server error.
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await db.run('DELETE FROM documents WHERE id = ?', [id]);

      if (result.changes === 0) {
        return res.status(404).json({ message: 'Document not found.' });
      }

      res.json({ message: 'Document deleted successfully.' });
    } catch (error) {
      // @ts-ignore
      log(`[ERROR] Failed to delete document with ID ${id}: ${error.message}`);
      // @ts-ignore
      res
        .status(500)
        .json({ message: `Error deleting document: ${error.message}` });
    }
  });

  return router;
};
