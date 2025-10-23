// routes/importer.js
const express = require('express');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');
const { brokerageTemplates } = require('../user-settings/importer-templates.js');

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

    return router;
};

// --- Exports ---
module.exports = createImporterRouter; // Export the router factory function

// Export helpers only when testing
if (process.env.NODE_ENV === 'test') {
    module.exports.combineFractionalShares = combineFractionalShares;
    module.exports.findConflict = findConflict;
}