// routes/importer.js
const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');

const { brokerageTemplates } = require('../user-settings/importer-templates.js');

/**
 * Combines transactions for the same stock, on the same day, at the same price.
 * @param {Array<object>} transactions - The array of transactions to process.
 * @returns {Array<object>} A new array with the combined transactions.
 */
function combineFractionalShares(transactions) {
    const combined = new Map();

    transactions.forEach(tx => {
        const key = `${tx.date}-${tx.ticker}-${tx.type}-${tx.price}`;
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


function findConflict(parsedRow, existingTransactions) {
    const TOLERANCE = 0.01; // 1% tolerance for price matching

    for (const tx of existingTransactions) {
        const dateMatch = new Date(parsedRow.date).toDateString() === new Date(tx.transaction_date).toDateString();
        const tickerMatch = parsedRow.ticker === tx.ticker;
        const quantityMatch = Math.abs(parsedRow.quantity - tx.quantity) < 0.001;
        const priceMatch = tx.price ? Math.abs(parsedRow.price - tx.price) / tx.price < TOLERANCE : parsedRow.price === null;


        if (dateMatch && tickerMatch && quantityMatch && priceMatch) {
            return { status: 'Potential Duplicate', match: tx };
        }
    }
    return { status: 'New', match: null };
}

module.exports = (db, log, importSessions) => {

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
            
            // FIX: Combine fractional shares before further processing.
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