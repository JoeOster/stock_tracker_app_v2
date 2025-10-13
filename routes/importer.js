// routes/importer.js
const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid'); // Used to create unique session IDs

// In-memory cache to hold the state of an import session.
const importSessions = new Map();

// Correctly path to the templates from the server's perspective
const { brokerageTemplates } = require('../public/ui/importer-templates.js');

module.exports = (db, log) => {

    /**
     * POST /api/importer/upload
     * Handles the CSV file upload, parses it based on the selected template,
     * and performs an initial reconciliation against existing database transactions.
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
                .slice(template.dataStartRow - 1) // Adjust for slice's zero-based index if dataStartRow is 1-based
                .filter(template.filter)
                .map(template.transform);

            // --- Reconciliation Logic ---
            const existingTransactions = await db.all(
                "SELECT * FROM transactions WHERE account_holder_id = ? AND source = 'MANUAL'",
                [accountHolderId]
            );

            const reconciliationData = {
                newTransactions: [],
                conflicts: [],
                nonTradeActivity: []
            };

            for (const [index, csvRow] of processedData