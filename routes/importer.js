// routes/importer.js
const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');

// In-memory cache to hold the state of an import session.
const importSessions = new Map();

// Path to the templates from the server's perspective
const { brokerageTemplates } = require('../public/importer-templates.js');

/**
 * Compares a parsed CSV row against existing transactions to find potential duplicates.
 * @param {object} parsedRow - The transaction parsed from the CSV.
 * @param {any[]} existingTransactions - Array of transactions from the database.
 * @returns {{status: string, match: object|null}} - The status ('New' or 'Potential Duplicate') and the matched transaction if found.
 */
function findConflict(parsedRow, existingTransactions) {
    const TOLERANCE = 0.02; // 2 cents tolerance for price matching

    for (const existingTx of existingTransactions) {
        const isSameDay = existingTx.transaction_date === parsedRow.date;
        const isSameTicker = existingTx.ticker.trim().toUpperCase() === parsedRow.ticker.trim().toUpperCase();
        const isSameAction = existingTx.transaction_type === parsedRow.type;
        const isSimilarPrice = Math.abs(existingTx.price - parsedRow.price) <= TOLERANCE;
        const isSameQuantity = existingTx.quantity === parsedRow.quantity;

        if (isSameDay && isSameTicker && isSameAction && isSimilarPrice && isSameQuantity) {
            return { status: 'Potential Duplicate', match: existingTx };
        }
    }
    return { status: 'New', match: null };
}

module.exports = (db, log) => {

    /**
     * POST /api/importer/upload
     * Handles the CSV file upload, parses it, and performs an initial reconciliation.
     */
    router.post('/upload', async (req, res) => {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ message: 'No file was uploaded.' });
        }

        const { accountHolderId, brokerageTemplate } = req.body;
        const csvFile = req.files.csvfile;

        if (!accountHolderId || !brokerageTemplate) {
            return res.status(400).json({ message: 'Account Holder and Brokerage Template are required.' });
        }

        const template = brokerageTemplates[brokerageTemplate];
        if (!template) {
            return res.status(400).json({ message: 'Invalid brokerage template selected.' });
        }

        try {
            const csvData = csvFile.data.toString('utf8');
            const parseResult = Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
            });

            const processedData = parseResult.data
                .slice(template.dataStartRow - 1)
                .filter(row => template.filter(row))
                .map(row => template.transform(row));

            // --- Reconciliation Logic ---
            // Fetch all existing transactions for the account holder for comparison.
            const existingTransactions = await db.all(
                "SELECT * FROM transactions WHERE account_holder_id = ?",
                [accountHolderId]
            );

            const reconciliationData = {
                newTransactions: [],
                conflicts: []
            };

            const importSessionData = [];

            processedData.forEach((csvRow, csvRowIndex) => {
                const { status, match } = findConflict(csvRow, existingTransactions);

                if (status === 'Potential Duplicate') {
                    reconciliationData.conflicts.push({
                        csvData: csvRow,
                        manualTransaction: match,
                        csvRowIndex: csvRowIndex
                    });
                } else {
                    reconciliationData.newTransactions.push(csvRow);
                }

                importSessionData.push({
                    ...csvRow,
                    status: status,
                    matchedTx: match
                });
            });

            const importSessionId = uuidv4();
            importSessions.set(importSessionId, { data: importSessionData, accountHolderId: accountHolderId });

            // Clean up old sessions after 1 hour to prevent memory leaks.
            setTimeout(() => importSessions.delete(importSessionId), 3600 * 1000);

            res.json({
                importSessionId: importSessionId,
                reconciliationData: reconciliationData
            });

        } catch (error) {
            log(`[ERROR] CSV Upload/Reconciliation failed: ${error.message}`);
            res.status(500).json({ message: `Failed to process CSV file: ${error.message}` });
        }
    });

    return router;
};