// /routes/importer.js
/**
 * @file Defines Express routes for handling CSV import uploads and processing.
 * @module routes/importer
 */

const express = require('express');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');
const {
  brokerageTemplates,
} = require('../user-settings/importer-templates.js');

// --- Import Refactored Helpers ---
const {
  internalFormatQuantity,
  combineFractionalShares,
  findConflict,
} = require('./importer-helpers.js');
// --- End Import ---

/**
 * Creates and returns an Express router for handling CSV import uploads.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {Map<string, any>} importSessions - Map storing active import sessions.
 * @returns {express.Router} The configured Express router.
 */
const createImporterRouter = (db, log, importSessions) => {
  const router = express.Router(); // Require express Router here

  /**
   * @route POST /api/importer/upload
   * @group Importer - CSV upload and reconciliation
   * @description Receives a CSV file, parses it based on a template,
   * performs conflict detection, and returns a session ID for reconciliation.
   * @param {string} accountHolderId.body.required - The ID of the account holder.
   * @param {string} brokerageTemplate.body.required - The key of the template to use (e.g., 'fidelity').
   * @param {object} csvfile.files.required - The uploaded CSV file.
   * @returns {object} 200 - JSON object with `importSessionId` and `reconciliationData`.
   * 400 - Error message for invalid input or file.
   * 500 - Error message for server errors.
   */
  router.post('/upload', async (req, res) => {
    if (!req.files || !req.files.csvfile) {
      return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const csvFile = /** @type {any} */ (req.files.csvfile);
    if (Array.isArray(csvFile)) {
      return res.status(400).json({ message: 'Please upload a single file.' });
    }

    const { accountHolderId, brokerageTemplate } = req.body;
    if (!accountHolderId || !brokerageTemplate) {
      return res.status(400).json({
        message: 'Account Holder and Brokerage Template are required.',
      });
    }

    if (!brokerageTemplates) {
      log('[ERROR] Brokerage templates are not loaded.');
      return res.status(500).json({
        message: 'Internal Server Error: Brokerage templates not found.',
      });
    }

    const template = brokerageTemplates[brokerageTemplate];
    if (!template) {
      return res
        .status(400)
        .json({ message: `Invalid brokerage template: ${brokerageTemplate}` });
    }

    try {
      let csvData = csvFile.data.toString('utf8');

      if (template.dataStartRow > 1) {
        const lines = csvData.split(/\r?\n/);
        csvData = lines.slice(template.dataStartRow - 1).join('\n');
      }

      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const processedData = parseResult.data
        .filter((row) => template.filter(row))
        .map((row) => template.transform(row));

      // Combine fractional shares before conflict detection.
      const combinedData = combineFractionalShares(processedData);

      log(
        `[IMPORTER DEBUG] Processed ${combinedData.length} rows from CSV after combining fractional shares.`
      );
      if (combinedData.length > 0) {
        log(
          `[IMPORTER DEBUG] First processed row: ${JSON.stringify(combinedData[0])}`
        );
      }

      if (combinedData.length === 0) {
        return res.status(400).json({
          message:
            'No valid transactions found in the CSV. Please check the brokerage template settings and the file content.',
        });
      }

      const existingTransactions = await db.all(
        'SELECT * FROM transactions WHERE account_holder_id = ?',
        [accountHolderId]
      );

      const reconciliationData = { newTransactions: [], conflicts: [] };
      const importSessionData = [];

      combinedData.forEach((csvRow, csvRowIndex) => {
        // Basic validation before conflict check
        if (
          !csvRow ||
          typeof csvRow.ticker !== 'string' ||
          typeof csvRow.date !== 'string' ||
          typeof csvRow.quantity !== 'number' ||
          typeof csvRow.price !== 'number' ||
          !csvRow.type
        ) {
          log(
            `[IMPORTER WARNING] Skipping invalid row at index ${csvRowIndex}: ${JSON.stringify(csvRow)}`
          );
          // Optionally add to a list of skipped rows to show user
          return;
        }
        const { status, match } = findConflict(csvRow, existingTransactions);
        const sessionRow = { ...csvRow, status, matchedTx: match, csvRowIndex };

        if (status === 'Potential Duplicate') {
          reconciliationData.conflicts.push({
            csvData: csvRow,
            manualTransaction: match,
            csvRowIndex,
          });
        } else {
          reconciliationData.newTransactions.push(csvRow);
        }
        importSessionData.push(sessionRow);
      });

      const importSessionId = uuidv4();
      importSessions.set(importSessionId, {
        data: importSessionData,
        accountHolderId,
      });

      if (process.env.NODE_ENV !== 'test') {
        setTimeout(() => importSessions.delete(importSessionId), 3600 * 1000); // 1-hour expiry
      }

      res.json({ importSessionId, reconciliationData });
    } catch (error) {
      log(`[ERROR] CSV Upload failed: ${error.message}\n${error.stack}`);
      res
        .status(500)
        .json({ message: `Failed to process CSV: ${error.message}` });
    }
  });

  /**
   * @route POST /api/importer/import
   * @group Importer - CSV upload and reconciliation
   * @description Commits the transactions from a reconciliation session
   * based on user-provided resolutions.
   * @param {string} sessionId.body.required - The session ID from the /upload response.
   * @param {Array<object>} resolutions.body.required - An array of resolution objects.
   * @returns {object} 201 - Success message.
   * @returns {object} 400 - Error message for invalid session or payload.
   * @returns {object} 500 - Error message for server errors.
   */
  router.post('/import', async (req, res) => {
    const { sessionId, resolutions } = req.body;

    if (!sessionId || !Array.isArray(resolutions)) {
      return res.status(400).json({ message: 'Invalid import payload.' });
    }

    const session = importSessions.get(sessionId);
    if (!session) {
      return res
        .status(400)
        .json({ message: 'Import session expired or not found.' });
    }

    const { data: sessionData, accountHolderId } = session;
    /** @type {any[]} */
    const toCreate = []; // Array to hold transactions to be newly created
    /** @type {number[]} */
    const toDelete = []; // Array to hold IDs of transactions to be deleted (replaced)

    resolutions.forEach((res) => {
      const conflictItem = sessionData.find(
        (item) => item.csvRowIndex == res.csvIndex
      );
      if (
        conflictItem &&
        res.resolution === 'REPLACE' &&
        conflictItem.matchedTx
      ) {
        toDelete.push(conflictItem.matchedTx.id);
        toCreate.push(conflictItem);
      }
    });

    sessionData.forEach((item) => {
      if (item.status === 'New') {
        toCreate.push(item);
      }
    });

    if (toCreate.length === 0 && toDelete.length === 0) {
      importSessions.delete(sessionId);
      return res.status(200).json({ message: 'No changes were committed.' });
    }

    /** @type {Map<string, Set<number>>} */
    const tickerToAdviceIdMap = new Map();

    try {
      await db.exec('BEGIN TRANSACTION');

      if (toDelete.length > 0) {
        log(
          `[IMPORT] Deleting ${toDelete.length} transactions to be replaced.`
        );
        const deleteStmt = await db.prepare(
          'DELETE FROM transactions WHERE id = ?'
        );
        for (const id of toDelete) {
          await deleteStmt.run(id);
        }
        await deleteStmt.finalize();
      }

      if (toCreate.length > 0) {
        log(`[IMPORT] Attempting to create ${toCreate.length} transactions.`);
        toCreate.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        for (const tx of toCreate) {
          const quantity = parseFloat(tx.quantity);
          const price = parseFloat(tx.price);
          const createdAt = new Date().toISOString();

          if (isNaN(price) || price <= 0) {
            log(
              `[IMPORT WARNING] Invalid price (${tx.price}) for ${tx.ticker} on ${tx.date}. Skipping and creating notification.`
            );
            const message = `An imported transaction for ${internalFormatQuantity(quantity)} shares of ${tx.ticker} on ${tx.date} was ignored because the price was invalid or zero (${tx.price}).`;
            await db.run(
              'INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)',
              [accountHolderId, message, 'UNREAD']
            );
            continue;
          }

          if (tx.type === 'BUY') {
            let adviceSourceIdToLink = null;

            const openWatchlistItems = await db.all(
              "SELECT * FROM watchlist WHERE account_holder_id = ? AND ticker = ? AND status = 'OPEN'",
              [accountHolderId, tx.ticker]
            );

            if (openWatchlistItems.length === 1) {
              adviceSourceIdToLink = openWatchlistItems[0].advice_source_id;
              log(
                `[IMPORT] Auto-linking new BUY for ${tx.ticker} to advice source ID: ${adviceSourceIdToLink}`
              );
            } else if (openWatchlistItems.length > 1) {
              log(
                `[IMPORT WARNING] Ambiguous match: Found ${openWatchlistItems.length} open watchlist items for ${tx.ticker}. BUY transaction will not be auto-linked.`
              );
            }

            await db.run(
              'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining, source, created_at, advice_source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                tx.date,
                tx.ticker,
                tx.exchange,
                tx.type,
                quantity,
                price,
                accountHolderId,
                quantity,
                quantity,
                'CSV_IMPORT',
                createdAt,
                adviceSourceIdToLink,
              ]
            );
          } else if (tx.type === 'SELL') {
            let sellQuantityRemaining = quantity;
            const openLots = await db.all(
              "SELECT id, quantity_remaining, transaction_date, advice_source_id FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 AND transaction_type = 'BUY' ORDER BY transaction_date ASC, id ASC",
              [tx.ticker, accountHolderId]
            );

            if (openLots.length === 0) {
              log(
                `[IMPORT WARNING] No open BUY lot for SELL of ${tx.ticker} on ${tx.date}. Skipping and creating notification.`
              );
              const message = `An imported SELL transaction for ${internalFormatQuantity(quantity)} shares of ${tx.ticker} on ${tx.date} was ignored because no corresponding open BUY lot could be found.`;
              await db.run(
                'INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)',
                [accountHolderId, message, 'UNREAD']
              );
              continue;
            }

            for (const lot of openLots) {
              if (sellQuantityRemaining <= 0.00001) break;
              const sellableQuantity = Math.min(
                sellQuantityRemaining,
                lot.quantity_remaining
              );

              if (lot.advice_source_id) {
                if (!tickerToAdviceIdMap.has(tx.ticker)) {
                  tickerToAdviceIdMap.set(tx.ticker, new Set());
                }
                const adviceSet = tickerToAdviceIdMap.get(tx.ticker);
                if (adviceSet) {
                  adviceSet.add(lot.advice_source_id);
                }
              }

              await db.run(
                'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  tx.date,
                  tx.ticker,
                  tx.exchange,
                  tx.type,
                  sellableQuantity,
                  price,
                  accountHolderId,
                  lot.id,
                  'CSV_IMPORT',
                  createdAt,
                ]
              );
              await db.run(
                'UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
                [sellableQuantity, lot.id]
              );
              sellQuantityRemaining -= sellableQuantity;
            }

            if (sellQuantityRemaining > 0.00001) {
              log(
                `[IMPORT WARNING] Not enough shares to cover entire SELL of ${tx.ticker} on ${tx.date}. ${internalFormatQuantity(sellQuantityRemaining)} shares were not recorded as sold.`
              );
              const message = `An imported SELL transaction for ${tx.ticker} on ${tx.date} could not be fully completed. There were not enough shares in open lots to cover the entire sale. ${internalFormatQuantity(sellQuantityRemaining)} shares were not recorded as sold.`;
              await db.run(
                'INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)',
                [accountHolderId, message, 'UNREAD']
              );
            }
          }
        } // End loop
      }

      if (tickerToAdviceIdMap.size > 0) {
        log(`[IMPORT] Archiving watchlist items based on SELLs...`);
        for (const [ticker, adviceIdSet] of tickerToAdviceIdMap.entries()) {
          const adviceIds = [...adviceIdSet];
          if (adviceIds.length > 0) {
            const placeholders = adviceIds.map(() => '?').join(',');
            log(
              `[IMPORT] Archiving for Ticker: ${ticker}, Sources: ${adviceIds.join(', ')}`
            );
            await db.run(
              `UPDATE watchlist SET status = 'CLOSED' WHERE account_holder_id = ? AND ticker = ? AND advice_source_id IN (${placeholders})`,
              [accountHolderId, ticker, ...adviceIds]
            );
          }
        }
      }

      await db.exec('COMMIT');
      importSessions.delete(sessionId);
      log('[IMPORT] Import completed successfully.');
      res.status(201).json({ message: 'Import completed successfully!' });
    } catch (error) {
      await db.exec('ROLLBACK');
      log(
        `[ERROR] Failed during batch import: ${error.message}\n${error.stack}`
      );
      res.status(500).json({ message: `Import failed: ${error.message}` });
    }
  });

  return router;
};

// --- Exports ---
module.exports = createImporterRouter; // Export the router factory function

// Export helpers only when testing
if (process.env.NODE_ENV === 'test') {
  // REFACTOR: Point to the new helpers file
  module.exports.helpers = require('./importer-helpers.js');
}
