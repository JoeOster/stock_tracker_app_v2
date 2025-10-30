// routes/importer.js
const express = require('express');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');
const { brokerageTemplates } = require('../user-settings/importer-templates.js');

/**
 * Simple quantity formatter for error messages (internal to this module).
 * @param {number | string | null | undefined} number - The number to format.
 * @returns {string} The formatted quantity string.
 */
function internalFormatQuantity(number) {
     const num = typeof number === 'string' ? parseFloat(number) : number;
     if (num === null || num === undefined || isNaN(num)) { return ''; }
     const formatter = new Intl.NumberFormat('en-US', {
         maximumFractionDigits: 5,
         minimumFractionDigits: 0,
         useGrouping: true
     });
     return formatter.format(num);
}


// --- Helper Functions (Moved outside module.exports) ---

/**
 * Combines transactions for the same stock, on the same day, at the same price.
 * @param {Array<object>} transactions - The array of transactions to process.
 * @returns {Array<object>} A new array with the combined transactions.
 */
function combineFractionalShares(transactions) {
    const combined = new Map();

    transactions.forEach(tx => {
        // Ensure price exists and handle potential null/undefined before creating key
        const priceKey = (tx.price !== null && tx.price !== undefined) ? tx.price.toFixed(5) : 'null_price'; // Use fixed decimal places for key
        const key = `${tx.date}-${tx.ticker}-${tx.type}-${priceKey}`;

        if (combined.has(key)) {
            const existing = combined.get(key);
            existing.quantity += tx.quantity;
        } else {
            // Create a new object to avoid mutating the original
            combined.set(key, { ...tx });
        }
    });

    return Array.from(combined.values());
}

/**
 * Finds a potential conflict between a parsed CSV row and existing transactions.
 * @param {object} parsedRow - The processed data from a single CSV row.
 * @param {Array<object>} existingTransactions - Array of transactions already in the database.
 * @returns {{status: 'Potential Duplicate' | 'New', match: object | null}}
 */
function findConflict(parsedRow, existingTransactions) {
    // Price tolerance might need adjustment depending on brokerage rounding
    const PRICE_TOLERANCE_PERCENT = 1; // 1% tolerance for price matching
    const QTY_TOLERANCE_ABSOLUTE = 0.0001; // Small absolute tolerance for quantity floats

    for (const tx of existingTransactions) {
        // Ensure both dates are valid before comparing
        const parsedDate = new Date(parsedRow.date + 'T12:00:00Z'); // Add time to avoid timezone issues
        const txDate = new Date(tx.transaction_date + 'T12:00:00Z');
        if (isNaN(parsedDate.getTime()) || isNaN(txDate.getTime())) continue; // Skip if either date is invalid

        const dateMatch = parsedDate.toDateString() === txDate.toDateString();
        const tickerMatch = parsedRow.ticker === tx.ticker;
        const typeMatch = parsedRow.type === tx.transaction_type; // Compare types too
        const quantityMatch = Math.abs(parsedRow.quantity - tx.quantity) < QTY_TOLERANCE_ABSOLUTE;

        // Price match: Check if both prices are valid numbers before comparing
        let priceMatch = false;
        if (typeof parsedRow.price === 'number' && typeof tx.price === 'number' && tx.price !== 0) {
            priceMatch = (Math.abs(parsedRow.price - tx.price) / tx.price) * 100 < PRICE_TOLERANCE_PERCENT;
        } else if (parsedRow.price === tx.price) { // Handle cases where both might be null or zero
            priceMatch = true;
        }


        if (dateMatch && tickerMatch && typeMatch && quantityMatch && priceMatch) {
            return { status: 'Potential Duplicate', match: tx };
        }
    }
    return { status: 'New', match: null };
}

// --- Router Definition ---
/**
 * Creates and returns an Express router for handling CSV import uploads.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {Map<string, any>} importSessions - Map storing active import sessions.
 * @returns {express.Router} The configured Express router.
 */
const createImporterRouter = (db, log, importSessions) => {
    const router = express.Router(); // Require express Router here

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
            return res.status(400).json({ message: 'Account Holder and Brokerage Template are required.' });
        }

        if (!brokerageTemplates) {
            log('[ERROR] Brokerage templates are not loaded.');
            return res.status(500).json({ message: 'Internal Server Error: Brokerage templates not found.' });
        }

        const template = brokerageTemplates[brokerageTemplate];
        if (!template) {
            return res.status(400).json({ message: `Invalid brokerage template: ${brokerageTemplate}` });
        }

        try {
            let csvData = csvFile.data.toString('utf8');

            if (template.dataStartRow > 1) {
                const lines = csvData.split(/\r?\n/);
                csvData = lines.slice(template.dataStartRow - 1).join('\n');
            }

            const parseResult = Papa.parse(csvData, { header: true, skipEmptyLines: true });

            const processedData = parseResult.data
                .filter(row => template.filter(row))
                .map(row => template.transform(row));

            // Combine fractional shares before conflict detection.
            const combinedData = combineFractionalShares(processedData);

            log(`[IMPORTER DEBUG] Processed ${combinedData.length} rows from CSV after combining fractional shares.`);
            if (combinedData.length > 0) {
                log(`[IMPORTER DEBUG] First processed row: ${JSON.stringify(combinedData[0])}`);
            }

            if (combinedData.length === 0) {
                return res.status(400).json({ message: 'No valid transactions found in the CSV. Please check the brokerage template settings and the file content.' });
            }

            const existingTransactions = await db.all(
                "SELECT * FROM transactions WHERE account_holder_id = ?",
                [accountHolderId]
            );

            const reconciliationData = { newTransactions: [], conflicts: [] };
            const importSessionData = [];

            combinedData.forEach((csvRow, csvRowIndex) => {
                 // Basic validation before conflict check
                 if (!csvRow || typeof csvRow.ticker !== 'string' || typeof csvRow.date !== 'string' || typeof csvRow.quantity !== 'number' || typeof csvRow.price !== 'number' || !csvRow.type ) {
                     log(`[IMPORTER WARNING] Skipping invalid row at index ${csvRowIndex}: ${JSON.stringify(csvRow)}`);
                     // Optionally add to a list of skipped rows to show user
                     return;
                 }
                const { status, match } = findConflict(csvRow, existingTransactions);
                const sessionRow = { ...csvRow, status, matchedTx: match, csvRowIndex };

                if (status === 'Potential Duplicate') {
                    reconciliationData.conflicts.push({ csvData: csvRow, manualTransaction: match, csvRowIndex });
                } else {
                    reconciliationData.newTransactions.push(csvRow);
                }
                importSessionData.push(sessionRow);
            });

            const importSessionId = uuidv4();
            importSessions.set(importSessionId, { data: importSessionData, accountHolderId });

            if (process.env.NODE_ENV !== 'test') {
                setTimeout(() => importSessions.delete(importSessionId), 3600 * 1000); // 1-hour expiry
            }

            res.json({ importSessionId, reconciliationData });

        } catch (error) {
            log(`[ERROR] CSV Upload failed: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: `Failed to process CSV: ${error.message}` });
        }
    });

    /**
     * POST /import
     * Handles the batch import of reconciled transactions from the CSV importer.
     * (MOVED FROM routes/transactions.js)
     */
    router.post('/import', async (req, res) => {
        const { sessionId, resolutions } = req.body;

        if (!sessionId || !Array.isArray(resolutions)) {
            return res.status(400).json({ message: 'Invalid import payload.' });
        }

        const session = importSessions.get(sessionId);
        if (!session) {
            return res.status(400).json({ message: 'Import session expired or not found.' });
        }

        const { data: sessionData, accountHolderId } = session;
        /** @type {any[]} */
        const toCreate = []; // Array to hold transactions to be newly created
        /** @type {number[]} */
        const toDelete = []; // Array to hold IDs of transactions to be deleted (replaced)

        resolutions.forEach(res => {
            const conflictItem = sessionData.find(item => item.csvRowIndex == res.csvIndex);
            if (conflictItem && res.resolution === 'REPLACE' && conflictItem.matchedTx) {
                toDelete.push(conflictItem.matchedTx.id);
                toCreate.push(conflictItem);
            }
        });

        sessionData.forEach(item => {
            if (item.status === 'New') {
                toCreate.push(item);
            }
        });

        if (toCreate.length === 0 && toDelete.length === 0) {
            importSessions.delete(sessionId);
            return res.status(200).json({ message: 'No changes were committed.' });
        }

        // --- ADDED: Map to track tickers and advice IDs for archiving ---
        /** @type {Map<string, Set<number>>} */
        const tickerToAdviceIdMap = new Map();
        // --- END ADDED ---

        try {
            await db.exec('BEGIN TRANSACTION');

            if (toDelete.length > 0) {
                log(`[IMPORT] Deleting ${toDelete.length} transactions to be replaced.`);
                const deleteStmt = await db.prepare('DELETE FROM transactions WHERE id = ?');
                for (const id of toDelete) {
                    await deleteStmt.run(id);
                }
                await deleteStmt.finalize();
            }

            if (toCreate.length > 0) {
                log(`[IMPORT] Attempting to create ${toCreate.length} transactions.`);
                toCreate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                for (const tx of toCreate) {
                    const quantity = parseFloat(tx.quantity);
                    const price = parseFloat(tx.price);
                    const createdAt = new Date().toISOString();

                    if (isNaN(price) || price <= 0) {
                        log(`[IMPORT WARNING] Invalid price (${tx.price}) for ${tx.ticker} on ${tx.date}. Skipping and creating notification.`);
                        const message = `An imported transaction for ${internalFormatQuantity(quantity)} shares of ${tx.ticker} on ${tx.date} was ignored because the price was invalid or zero (${tx.price}).`;
                        await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                        continue;
                    }

                    if (tx.type === 'BUY') {
                        // --- START MODIFICATION ---
                        let adviceSourceIdToLink = null;
                        
                        // Find potential open watchlist items for this ticker
                        const openWatchlistItems = await db.all(
                            "SELECT * FROM watchlist WHERE account_holder_id = ? AND ticker = ? AND status = 'OPEN'",
                            [accountHolderId, tx.ticker]
                        );

                        if (openWatchlistItems.length === 1) {
                            // Only link if there is one, unambiguous match
                            adviceSourceIdToLink = openWatchlistItems[0].advice_source_id;
                            log(`[IMPORT] Auto-linking new BUY for ${tx.ticker} to advice source ID: ${adviceSourceIdToLink}`);
                        } else if (openWatchlistItems.length > 1) {
                            log(`[IMPORT WARNING] Ambiguous match: Found ${openWatchlistItems.length} open watchlist items for ${tx.ticker}. BUY transaction will not be auto-linked.`);
                        }

                        // Updated INSERT statement to include advice_source_id
                        await db.run(
                            'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining, source, created_at, advice_source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [tx.date, tx.ticker, tx.exchange, tx.type, quantity, price, accountHolderId, quantity, quantity, 'CSV_IMPORT', createdAt, adviceSourceIdToLink] // Pass adviceSourceIdToLink
                        );
                        // --- END MODIFICATION ---

                    }
                    else if (tx.type === 'SELL') {
                        let sellQuantityRemaining = quantity;
                        // --- MODIFIED: Query now includes advice_source_id ---
                        const openLots = await db.all(
                            "SELECT id, quantity_remaining, transaction_date, advice_source_id FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 AND transaction_type = 'BUY' ORDER BY transaction_date ASC, id ASC",
                            [tx.ticker, accountHolderId]
                        );
                        // --- END MODIFIED ---

                        if (openLots.length === 0) {
                             log(`[IMPORT WARNING] No open BUY lot for SELL of ${tx.ticker} on ${tx.date}. Skipping and creating notification.`);
                             const message = `An imported SELL transaction for ${internalFormatQuantity(quantity)} shares of ${tx.ticker} on ${tx.date} was ignored because no corresponding open BUY lot could be found.`;
                             await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                             continue;
                        }

                        for (const lot of openLots) {
                            if (sellQuantityRemaining <= 0.00001) break;
                            const sellableQuantity = Math.min(sellQuantityRemaining, lot.quantity_remaining);

                            // --- ADDED: Collect advice_source_id from the lot being sold ---
                            if (lot.advice_source_id) {
                                if (!tickerToAdviceIdMap.has(tx.ticker)) {
                                    tickerToAdviceIdMap.set(tx.ticker, new Set());
                                }
                                // Ensure get returns a Set before calling add
                                const adviceSet = tickerToAdviceIdMap.get(tx.ticker);
                                if(adviceSet) {
                                    adviceSet.add(lot.advice_source_id);
                                }
                            }
                            // --- END ADDED ---

                            await db.run(
                                'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                [tx.date, tx.ticker, tx.exchange, tx.type, sellableQuantity, price, accountHolderId, lot.id, 'CSV_IMPORT', createdAt]
                            );
                            await db.run(
                                'UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
                                [sellableQuantity, lot.id]
                            );
                            sellQuantityRemaining -= sellableQuantity;
                        }

                         if (sellQuantityRemaining > 0.00001) {
                            log(`[IMPORT WARNING] Not enough shares to cover entire SELL of ${tx.ticker} on ${tx.date}. ${internalFormatQuantity(sellQuantityRemaining)} shares were not recorded as sold.`);
                            const message = `An imported SELL transaction for ${tx.ticker} on ${tx.date} could not be fully completed. There were not enough shares in open lots to cover the entire sale. ${internalFormatQuantity(sellQuantityRemaining)} shares were not recorded as sold.`;
                            await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (?, ?, ?)", [accountHolderId, message, 'UNREAD']);
                        }
                    }
                } // End loop
            }

            // --- ADDED: Process the archive map before committing ---
            if (tickerToAdviceIdMap.size > 0) {
                log(`[IMPORT] Archiving watchlist items based on SELLs...`);
                for (const [ticker, adviceIdSet] of tickerToAdviceIdMap.entries()) {
                    const adviceIds = [...adviceIdSet];
                    if (adviceIds.length > 0) {
                        const placeholders = adviceIds.map(() => '?').join(',');
                        log(`[IMPORT] Archiving for Ticker: ${ticker}, Sources: ${adviceIds.join(', ')}`);
                        await db.run(
                            `UPDATE watchlist SET status = 'CLOSED' WHERE account_holder_id = ? AND ticker = ? AND advice_source_id IN (${placeholders})`,
                            [accountHolderId, ticker, ...adviceIds]
                        );
                    }
                }
            }
            // --- END ADDED ---

            await db.exec('COMMIT');
            importSessions.delete(sessionId);
            log('[IMPORT] Import completed successfully.');
            res.status(201).json({ message: 'Import completed successfully!' });

        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed during batch import: ${error.message}\n${error.stack}`);
            res.status(500).json({ message: `Import failed: ${error.message}` });
        }
    });

    return router;
};

// --- Exports ---
module.exports = createImporterRouter; // Export the router factory function

// Export helpers only when testing
if (process.env.NODE_ENV === 'test') {
    module.exports.combineFractionalShares = combineFractionalShares;
    module.exports.findConflict = findConflict;
}