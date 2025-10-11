const request = require('supertest');
const { setupApp, runOrderWatcher } = require('../server');
const fetch = require('node-fetch');

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
    fetch.mockClear();
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM account_holders WHERE id > 2');
    await db.run('DELETE FROM pending_orders');
    await db.run('DELETE FROM notifications');
});


describe('Transaction API Endpoints', () => {
    it('should create a new BUY transaction', async () => {
        const res = await request(app)
            .post('/api/transactions') // This URL is correct
            .send({
                ticker: 'TEST', exchange: 'TestEx', transaction_type: 'BUY',
                quantity: 100, price: 50, transaction_date: '2025-10-08', account_holder_id: 2
            });
        expect(res.statusCode).toEqual(201);
    });

    it('should create a new SELL transaction and update the parent BUY lot', async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SELL-TEST', 'TestEx', 'BUY', 100, 50, '2025-10-01', 100, 100, 2]);
        const buyId = buyRes.lastID;
        const sellRes = await request(app)
            .post('/api/transactions') // This URL is correct
            .send({
                ticker: 'SELL-TEST', exchange: 'TestEx', transaction_type: 'SELL',
                quantity: 40, price: 60, transaction_date: '2025-10-02',
                account_holder_id: 2, parent_buy_id: buyId
            });
        expect(sellRes.statusCode).toEqual(201);
        const parentBuyLot = await db.get("SELECT * FROM transactions WHERE id = ?", buyId);
        expect(parentBuyLot.quantity_remaining).toBe(60);
    });
});

describe('Price Fetching API', () => {
    it('should return "invalid" for a ticker with no price data', async () => {
        fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 0 }) });
        const res = await request(app)
            .post('/api/utility/prices/batch') // <-- CORRECTED URL
            .send({ tickers: ['INVALIDTICKER'], date: '2025-10-08' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('INVALIDTICKER', 'invalid');
    });
});

describe('Portfolio Calculation Endpoints', () => {
    it('should correctly calculate the weighted average cost basis', async () => {
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', 100, 100, 2]);
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CALC-TEST', 'TestEx', 'BUY', 50, 12, '2025-10-02', 50, 50, 2]);
        fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 15 }) });
        const res = await request(app).get('/api/reporting/portfolio/overview?holder=2'); // <-- CORRECTED URL
        expect(res.statusCode).toEqual(200);
        const calcTestPosition = res.body.find(p => p.ticker === 'CALC-TEST');
        expect(calcTestPosition).toBeDefined();
        const expectedAverage = ((100 * 10) + (50 * 12)) / (100 + 50);
        expect(calcTestPosition.weighted_avg_cost).toBeCloseTo(expectedAverage);
    });
});

describe('Reporting Endpoints', () => {
    it('should correctly calculate the total realized P&L', async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PL-TEST', 'TestEx', 'BUY', 10, 100, '2025-10-08', 10, 10, 2]);
        const buyTransactionId = buyRes.lastID;
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['PL-TEST', 'TestEx', 'SELL', 8, 120, '2025-10-09', buyTransactionId, 2]);
        const res = await request(app)
            .get('/api/reporting/realized_pl/summary?holder=2'); // <-- CORRECTED URL
        expect(res.statusCode).toEqual(200);
        expect(res.body.total).toBeCloseTo(160);
    });
});

describe('Data Integrity Endpoints', () => {
    it('should prevent deleting an account holder that has transactions', async () => {
        const holderRes = await db.run('INSERT INTO account_holders (name) VALUES (?)', ['InUseHolder']);
        const holderId = holderRes.lastID;
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', holderId]);
        const res = await request(app)
            .delete(`/api/accounts/holders/${holderId}`); // <-- CORRECTED URL
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Cannot delete an account holder that is in use by transactions.');
    });
});

describe('Pending Orders API', () => {
    it('should create a new pending order successfully', async () => {
        const res = await request(app)
            .post('/api/orders/pending') // <-- CORRECTED URL
            .send({
                account_holder_id: 2, ticker: 'NEW-PO', exchange: 'TestEx',
                order_type: 'BUY_LIMIT', limit_price: 150, quantity: 10, created_date: '2025-10-09'
            });
        expect(res.statusCode).toEqual(201);
    });

    it('should retrieve only ACTIVE pending orders', async () => {
        await db.run("INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'ACTIVE-A', 'ACTIVE', 'BUY_LIMIT', 10, 1, '2025-10-09', 'TestEx')");
        const res = await request(app)
            .get('/api/orders/pending?holder=2'); // <-- CORRECTED URL
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
    });
    
    it('should update the status of a pending order', async () => {
        const insertRes = await db.run("INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'TO-CANCEL', 'ACTIVE', 'BUY_LIMIT', 50, 5, '2025-10-09', 'TestEx')");
        const orderId = insertRes.lastID;
        const res = await request(app)
            .put(`/api/orders/pending/${orderId}`) // <-- CORRECTED URL
            .send({ status: 'CANCELLED' });
        expect(res.statusCode).toEqual(200);
    });
});

describe('Notifications API (v2.18)', () => {
    it('should retrieve only UNREAD notifications', async () => {
        await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (2, 'Test message for user 2', 'UNREAD')");
        const res = await request(app)
            .get('/api/orders/notifications?holder=2'); // <-- CORRECTED URL
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
    });

    it('should update the status of a notification', async () => {
        const insertRes = await db.run("INSERT INTO notifications (account_holder_id, message, status) VALUES (2, 'To be dismissed', 'UNREAD')");
        const notificationId = insertRes.lastID;
        const res = await request(app)
            .put(`/api/orders/notifications/${notificationId}`) // <-- CORRECTED URL
            .send({ status: 'DISMISSED' });
        expect(res.statusCode).toEqual(200);
    });
});

describe('Order Watcher Service (Sell Orders)', () => {
    // ... (This block is unchanged as it calls the function directly, not via an HTTP request)
});