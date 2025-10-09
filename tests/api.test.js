const request = require('supertest');
const setupApp = require('../server');
const fetch = require('node-fetch');

// Mock the node-fetch library. This replaces the default export with a Jest mock function.
jest.mock('node-fetch');

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

beforeEach(async () => {
    // Reset mocks and clear the database before each test
    fetch.mockClear();
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM account_holders WHERE id > 2'); // Keep Joe and the default
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

    // ... other transaction tests remain the same
});

describe('Account Holder API Endpoints', () => {
    // ... account holder tests remain the same
});

// --- UPDATED and CORRECTED TEST SUITE for Price Fetching ---
describe('Price Fetching API', () => {
    it('should return "invalid" for a ticker with no price data', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Use mockResolvedValue to simulate the fetch promise resolving
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ c: 0 }), // Simulate the API returning a zero price
        });

        const res = await request(app)
            .post('/api/prices/batch')
            .send({ tickers: ['INVALIDTICKER'], date: '2025-10-08' });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('INVALIDTICKER', 'invalid');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[Price Fetch Warning] Ticker 'INVALIDTICKER'"));

        consoleSpy.mockRestore();
    });

    it('should return a valid price for a good ticker', async () => {
        // Use mockResolvedValue to simulate a successful API call
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ c: 150.75 }),
        });

        const res = await request(app)
            .post('/api/prices/batch')
            .send({ tickers: ['GOODTICKER'], date: '2025-10-08' });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('GOODTICKER', 150.75);
    });
});

describe('Portfolio Calculation Endpoints', () => {
    it('should correctly calculate the weighted average cost basis', async () => {
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', 100, 100, 2]);
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 50, 12, '2025-10-02', 50, 50, 2]);
        
        fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 15 }) });

        const res = await request(app).get('/api/portfolio/overview?holder=2');
        expect(res.statusCode).toEqual(200);

        const calcTestPosition = res.body.find(p => p.ticker === 'CALC-TEST');
        expect(calcTestPosition).toBeDefined();

        const expectedAverage = ((100 * 10) + (50 * 12)) / (100 + 50);
        expect(calcTestPosition.weighted_avg_cost).toBeCloseTo(expectedAverage);
    });
});

