// routes/importer.js
const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');

const { brokerageTemplates } = require('../public/importer-templates.js');

function findConflict(parsedRow, existingTransactions) {
    const TOLERANCE = 0.02;

    for (const existingTx of existingTransactions) {
        if (
            existingTx.transaction_date === parsedRow.date &&
            existingTx.ticker.trim().toUpperCase() === parsedRow.ticker.trim().toUpperCase() &&
            existingTx.transaction_type === parsedRow.type &&
            Math.abs(existingTx.price - parsedRow.price) <= TOLERANCE &&
            existingTx.quantity === parsedRow.quantity
        ) {
            return { status: 'Potential Duplicate', match: existingTx };
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

        const template = brokerageTemplates[brokerageTemplate];
        if (!template) {
            return res.status(400).json({ message: 'Invalid brokerage template.' });
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

            const existingTransactions = await db.all(
                "SELECT * FROM transactions WHERE account_holder_id = ?",
                [accountHolderId]
            );

            const reconciliationData = { newTransactions: [], conflicts: [] };
            const importSessionData = [];

            processedData.forEach((csvRow, csvRowIndex) => {
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
            
            // FIX: Only set the expiry timer when not in the test environment.
            if (process.env.NODE_ENV !== 'test') {
                setTimeout(() => importSessions.delete(importSessionId), 3600 * 1000); // 1-hour expiry
            }

            res.json({ importSessionId, reconciliationData });

        } catch (error) {
            log(`[ERROR] CSV Upload failed: ${error.message}`);
            res.status(500).json({ message: `Failed to process CSV: ${error.message}` });
        }
    });

    return router;
};