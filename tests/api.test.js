const request = require('supertest');
const setupApp = require('../server');
const fetch = require('node-fetch');

// Mock the node-fetch library
jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

let app;
let db;
let server;

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { app: runningApp, db: database } = await setupApp();
    app = runningApp;
    db = database;
    server = app.listen(3001);
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
});

// THIS IS THE FIX: Clean the database before each test to ensure isolation
beforeEach(async () => {
    // Reset mocks before each test
    fetch.mockClear();
    // Clear out transaction data to ensure tests don't interfere with each other
    await db.run('DELETE FROM transactions');
});

describe('Transaction API Endpoints', () => {
    let newTransactionId;

    it('should create a new BUY transaction', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .send({
                ticker: 'TEST',
                exchange: 'TestEx',
                transaction_type: 'BUY',
                quantity: 100,
                price: 50,
                transaction_date: '2025-10-08',
                account_holder_id: 2
            });
        expect(res.statusCode).toEqual(201);
        
        const transactions = await db.all('SELECT * FROM transactions WHERE ticker = ?', 'TEST');
        newTransactionId = transactions[0].id;
        expect(newTransactionId).toBeDefined();
    });

    it('should fetch all transactions and find the new one', async () => {
        // First, ensure the transaction from the previous test exists
        await db.run('INSERT INTO transactions (id, ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [newTransactionId, 'TEST', 'TestEx', 'BUY', 100, 50, '2025-10-08', 2]);
        
        const res = await request(app).get('/api/transactions?holder=2');
        expect(res.statusCode).toEqual(200);
        const found = res.body.find(tx => tx.id === newTransactionId);
        expect(found).toBeDefined();
    });

    it('should update the created transaction', async () => {
         await db.run('INSERT INTO transactions (id, ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id, original_quantity, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [newTransactionId, 'TEST', 'TestEx', 'BUY', 100, 50, '2025-10-08', 2, 100, 100]);

        const res = await request(app)
            .put(`/api/transactions/${newTransactionId}`)
            .send({
                ticker: 'TEST',
                exchange: 'TestEx',
                transaction_type: 'BUY',
                quantity: 110,
                price: 55,
                transaction_date: '2025-10-08',
                account_holder_id: 2
            });
        expect(res.statusCode).toEqual(200);

        const updatedTx = await db.get('SELECT * FROM transactions WHERE id = ?', newTransactionId);
        expect(updatedTx.quantity).toEqual(110);
    });

    it('should correctly update a BUY transaction that has child SELLs', async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SALE-TEST', 'TestEx', 'BUY', 200, 10, '2025-10-01', 200, 200, 2]);
        const buyId = buyRes.lastID;

        await db.run('UPDATE transactions SET quantity_remaining = 180 WHERE id = ?', [buyId]);
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['SALE-TEST', 'TestEx', 'SELL', 20, 12, '2025-10-02', buyId, 2]);

        const updateRes = await request(app)
            .put(`/api/transactions/${buyId}`)
            .send({
                ticker: 'SALE-TEST',
                exchange: 'TestEx',
                transaction_type: 'BUY',
                quantity: 205,
                price: 10,
                transaction_date: '2025-10-01',
                account_holder_id: 2
            });
        expect(updateRes.statusCode).toEqual(200);

        const finalTx = await db.get('SELECT * FROM transactions WHERE id = ?', buyId);
        expect(finalTx.original_quantity).toEqual(205);
        expect(finalTx.quantity_remaining).toEqual(185);
    });

    it('should delete the transaction', async () => {
        await db.run('INSERT INTO transactions (id, ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [newTransactionId, 'TEST', 'TestEx', 'BUY', 100, 50, '2025-10-08', 2]);
        const res = await request(app).delete(`/api/transactions/${newTransactionId}`);
        expect(res.statusCode).toEqual(200);

        const deletedTx = await db.get('SELECT * FROM transactions WHERE id = ?', newTransactionId);
        expect(deletedTx).toBeUndefined();
    });
});

describe('Account Holder API Endpoints', () => {
    let newHolderId;

    it('should create a new account holder', async () => {
        const res = await request(app)
            .post('/api/account_holders')
            .send({ name: 'Test Holder' });
        expect(res.statusCode).toEqual(201);
        newHolderId = res.body.id;
    });
    
    // ... other account holder tests ...
});

describe('Price Fetching API', () => {
    it('should return "invalid" for a ticker with no price data', async () => {
        fetch.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ c: 0 }))));
        const res = await request(app)
            .post('/api/prices/batch')
            .send({ tickers: ['INVALIDTICKER'], date: '2025-10-08' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('INVALIDTICKER', 'invalid');
    });

    // ... other price fetching tests ...
});

describe('Portfolio Calculation Endpoints', () => {

    it('should correctly calculate the weighted average cost basis', async () => {
        // Step 1: Seed the database with the specific data for this test
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', 100, 100, 2]);
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 50, 12, '2025-10-02', 50, 50, 2]);
        
        // Step 2: Mock the price fetch API call
        fetch.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ c: 15 }))));

        // Step 3: Call the endpoint
        const res = await request(app).get('/api/portfolio/overview?holder=2');
        expect(res.statusCode).toEqual(200);

        const calcTestPosition = res.body.find(p => p.ticker === 'CALC-TEST');
        expect(calcTestPosition).toBeDefined();

        // Step 4: Verify the weighted average calculation
        const expectedAverage = ((100 * 10) + (50 * 12)) / (100 + 50); // (1000 + 600) / 150 = 10.666...
        expect(calcTestPosition.weighted_avg_cost).toBeCloseTo(expectedAverage);
    });
});

