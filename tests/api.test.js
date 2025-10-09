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
    await db.run('DELETE FROM pending_orders');
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

// Add this entire block to the end of your tests/api.test.js file

describe('Transaction API Edge Cases', () => {
    let buyTransactionId;

    // Setup a BUY transaction to sell against in each test
    beforeEach(async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EDGE', 'TestEx', 'BUY', 100, 10, '2025-10-08', 100, 100, 2]);
        buyTransactionId = buyRes.lastID;
    });

    it('should fail to create a SELL transaction if quantity is insufficient', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .send({
                ticker: 'EDGE',
                exchange: 'TestEx',
                transaction_type: 'SELL',
                quantity: 101, // Attempt to sell 101 shares when only 100 are owned
                price: 12,
                transaction_date: '2025-10-09',
                account_holder_id: 2,
                parent_buy_id: buyTransactionId
            });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Sell quantity exceeds remaining quantity.');
    });

    it('should fail to create a SELL transaction if the sell date is before the buy date', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .send({
                ticker: 'EDGE',
                exchange: 'TestEx',
                transaction_type: 'SELL',
                quantity: 50,
                price: 12,
                transaction_date: '2025-10-07', // Sell date is before the buy date of Oct 8th
                account_holder_id: 2,
                parent_buy_id: buyTransactionId
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Sell date cannot be before the buy date.');
    });
});
// Add these two 'describe' blocks to the end of the file

describe('Reporting Endpoints', () => {
    it('should correctly calculate the total realized P&L', async () => {
        // Setup: Create a BUY transaction for 10 shares @ $100
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PL-TEST', 'TestEx', 'BUY', 10, 100, '2025-10-08', 10, 10, 2]);
        const buyTransactionId = buyRes.lastID;

        // Setup: Sell 8 of those shares @ $120 for a profit of ($120 - $100) * 8 = $160
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['PL-TEST', 'TestEx', 'SELL', 8, 120, '2025-10-09', buyTransactionId, 2]);

        // Action: Fetch the realized P&L summary
        const res = await request(app)
            .get('/api/realized_pl/summary?holder=2');

        // Assertion: The total should be 160
        expect(res.statusCode).toEqual(200);
        expect(res.body.total).toBeCloseTo(160);
    });
});

describe('Data Integrity Endpoints', () => {
    it('should prevent deleting an account holder that has transactions', async () => {
        // Setup: Create a new account holder
        const holderRes = await db.run('INSERT INTO account_holders (name) VALUES (?)', ['InUseHolder']);
        const holderId = holderRes.lastID;
        
        // Setup: Assign a transaction to this new holder
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', holderId]);

        // Action: Attempt to delete the account holder
        const res = await request(app)
            .delete(`/api/account_holders/${holderId}`);

        // Assertion: The request should be rejected with a 400 status
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Cannot delete an account holder that is in use by transactions.');
    });
});
// Add this new block to the end of tests/api.test.js

describe('Pending Orders API', () => {
    it('should create a new pending order successfully', async () => {
        const res = await request(app)
            .post('/api/pending_orders')
            .send({
                account_holder_id: 2,
                ticker: 'NEW-PO',
                exchange: 'TestEx',
                order_type: 'BUY_LIMIT',
                limit_price: 150,
                quantity: 10,
                created_date: '2025-10-09'
            });
        
        expect(res.statusCode).toEqual(201);

        const order = await db.get("SELECT * FROM pending_orders WHERE ticker = 'NEW-PO'");
        expect(order).toBeDefined();
        expect(order.limit_price).toEqual(150);
    });

    it('should retrieve only ACTIVE pending orders for the selected account holder', async () => {
        // Setup: Create various orders to test the filtering
        await db.run("INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'ACTIVE-A', 'ACTIVE', 'BUY_LIMIT', 10, 1, '2025-10-09', 'TestEx')");
        await db.run("INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (5, 'ACTIVE-B', 'ACTIVE', 'BUY_LIMIT', 20, 2, '2025-10-09', 'TestEx')"); // Belongs to a different holder
        await db.run("INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'CANCELLED-C', 'CANCELLED', 'BUY_LIMIT', 30, 3, '2025-10-09', 'TestEx')"); // Is not 'ACTIVE'

        // Action: Fetch orders for account holder #2
        const res = await request(app)
            .get('/api/pending_orders?holder=2');

        // Assertion: Only the one correct order should be returned
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].ticker).toBe('ACTIVE-A');
    });

    it('should update the status of a pending order', async () => {
        const insertRes = await db.run("INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'TO-CANCEL', 'ACTIVE', 'BUY_LIMIT', 50, 5, '2025-10-09', 'TestEx')");
        const orderId = insertRes.lastID;

        // Action: Update the status to 'CANCELLED'
        const res = await request(app)
            .put(`/api/pending_orders/${orderId}`)
            .send({ status: 'CANCELLED' });

        expect(res.statusCode).toEqual(200);

        // Assert that the change was saved to the database
        const updatedOrder = await db.get("SELECT * FROM pending_orders WHERE id = ?", orderId);
        expect(updatedOrder.status).toBe('CANCELLED');
    });
});