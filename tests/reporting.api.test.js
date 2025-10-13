const request = require('supertest');
const { setupApp } = require('../server');
const fetch = require('node-fetch');

jest.mock('node-fetch');
const mockedFetch = /** @type {jest.Mock} */ (/** @type {unknown} */ (fetch));

let app;
let db;
let server;

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { app: runningApp, db: database } = await setupApp();
    app = runningApp;
    db = database;
    server = app.listen(3002); // Use a different port to avoid conflicts
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
});

beforeEach(async () => {
    mockedFetch.mockClear();
    await db.run('DELETE FROM transactions');
});

describe('Reporting Endpoints', () => {
    it('should correctly calculate the total realized P&L', async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PL-TEST', 'TestEx', 'BUY', 10, 100, '2025-10-08', 10, 10, 2]);
        const buyTransactionId = buyRes.lastID;
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['PL-TEST', 'TestEx', 'SELL', 8, 120, '2025-10-09', buyTransactionId, 2]);
        
        const res = await request(app)
            .get('/api/reporting/realized_pl/summary?holder=2');
            
        expect(res.statusCode).toEqual(200);
        expect(res.body.total).toBeCloseTo(160); // (120 - 100) * 8
    });

    it('should correctly calculate the weighted average cost basis', async () => {
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', 100, 100, 2]);
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 50, 12, '2025-10-02', 50, 50, 2]);
        mockedFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 15 }) });

        const res = await request(app).get('/api/reporting/portfolio/overview?holder=2');
        
        expect(res.statusCode).toEqual(200);
        const calcTestPosition = res.body.find(p => p.ticker === 'CALC-TEST');
        expect(calcTestPosition).toBeDefined();
        const expectedAverage = ((100 * 10) + (50 * 12)) / (100 + 50);
        expect(calcTestPosition.weighted_avg_cost).toBeCloseTo(expectedAverage);
    });
});