// /tests/importer.api.test.js
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { setupApp } = require('../server');

let app;
let db;
let server;

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { app: runningApp, db: database } = await setupApp();
    app = runningApp;
    db = database;
    server = app.listen(3007); // Use a unique port for this test suite
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
});

beforeEach(async () => {
    // Clear all relevant tables before each test
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM account_holders WHERE id > 1');
    // Ensure the account holder we are testing with exists
    await db.run("INSERT OR IGNORE INTO account_holders (id, name) VALUES (2, 'Test Holder')");
});

describe('Importer API', () => {
    it('should correctly process a CSV, identify conflicts, and commit changes', async () => {
        // --- 1. Setup: Insert a manual transaction that will conflict with the CSV
        await db.run(
            'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['2025-10-10', 'CSV-CONFLICT', 'Fidelity', 'BUY', 5, 100.00, 2, 'MANUAL']
        );

        const csvFilePath = path.join(__dirname, 'fixtures', 'importer-test.csv');
        const csvFileContent = fs.readFileSync(csvFilePath);

        // --- 2. Upload and Reconcile
        const uploadRes = await request(app)
            .post('/api/importer/upload')
            .field('accountHolderId', '2')
            .field('brokerageTemplate', 'fidelity')
            .attach('csvfile', csvFileContent, 'importer-test.csv');

        // Assert the upload response
        expect(uploadRes.statusCode).toEqual(200);
        expect(uploadRes.body).toHaveProperty('importSessionId');
        expect(uploadRes.body.reconciliationData.newTransactions.length).toBe(1);
        expect(uploadRes.body.reconciliationData.conflicts.length).toBe(1);
        expect(uploadRes.body.reconciliationData.newTransactions[0].ticker).toBe('CSV-NEW');
        expect(uploadRes.body.reconciliationData.conflicts[0].csvData.ticker).toBe('CSV-CONFLICT');

        const { importSessionId, reconciliationData } = uploadRes.body;
        const conflict = reconciliationData.conflicts[0];

        // --- 3. Resolve conflict and prepare commit payload
        const resolutions = [{
            csvIndex: conflict.csvRowIndex,
            resolution: 'REPLACE'
        }];

        // --- 4. Commit Import ---
        // ---
        // --- THE FIX IS HERE: Changed URL from /api/transactions/import
        // ---
        const commitRes = await request(app)
            .post('/api/importer/import') // <-- CORRECTED URL
            .send({
                sessionId: importSessionId,
                resolutions: resolutions,
            });
        // ---
        // --- END FIX
        // ---

        // Assert the commit response
        expect(commitRes.statusCode).toEqual(201);
        expect(commitRes.body.message).toBe('Import completed successfully!');

        // --- 5. Verify Database State
        const allTxs = await db.all('SELECT * FROM transactions ORDER BY ticker ASC');
        expect(allTxs.length).toBe(2);

        const conflictTx = allTxs.find(t => t.ticker === 'CSV-CONFLICT');
        const newTx = allTxs.find(t => t.ticker === 'CSV-NEW');

        // Check that the new transaction was created correctly
        expect(newTx).toBeDefined();
        expect(newTx.quantity).toBe(10);
        expect(newTx.price).toBe(125.00);
        expect(newTx.source).toBe('CSV_IMPORT');

        // Check that the conflicting transaction was replaced
        expect(conflictTx).toBeDefined();
        expect(conflictTx.source).toBe('CSV_IMPORT'); // Source should now be CSV_IMPORT
    });
    it('should successfully parse a live Fidelity CSV file', async () => {
        const csvFilePath = path.join(__dirname, 'fixtures', 'fidelity-live.csv');
        const csvFileContent = fs.readFileSync(csvFilePath);

        const uploadRes = await request(app)
            .post('/api/importer/upload')
            .field('accountHolderId', '2')
            .field('brokerageTemplate', 'fidelity')
            .attach('csvfile', csvFileContent, 'fidelity-live.csv');
        
        expect(uploadRes.statusCode).toEqual(200);
        expect(uploadRes.body.reconciliationData.newTransactions.length).toBeGreaterThan(0);
    });

    it('should successfully parse a live Robinhood CSV file', async () => {
        const csvFilePath = path.join(__dirname, 'fixtures', 'robinhood-live.csv');
        const csvFileContent = fs.readFileSync(csvFilePath);

        const uploadRes = await request(app)
            .post('/api/importer/upload')
            .field('accountHolderId', '2')
            .field('brokerageTemplate', 'robinhood')
            .attach('csvfile', csvFileContent, 'robinhood-live.csv');
        
        expect(uploadRes.statusCode).toEqual(200);
        expect(uploadRes.body.reconciliationData.newTransactions.length).toBeGreaterThan(0);
    });

    it('should successfully parse a live E-Trade CSV file', async () => {
        const csvFilePath = path.join(__dirname, 'fixtures', 'etrade-live.csv');
        const csvFileContent = fs.readFileSync(csvFilePath);

        const uploadRes = await request(app)
            .post('/api/importer/upload')
            .field('accountHolderId', '2')
            .field('brokerageTemplate', 'etrade')
            .attach('csvfile', csvFileContent, 'etrade-live.csv');
        
        expect(uploadRes.statusCode).toEqual(200);
        expect(uploadRes.body.reconciliationData.newTransactions.length).toBeGreaterThan(0);
    });
});