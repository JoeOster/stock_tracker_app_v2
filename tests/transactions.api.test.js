const request = require('supertest');
const { setupApp } = require('../server');

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
    await db.run('DELETE FROM transactions');
});

describe('Transaction API Endpoints', () => {
    it('should create a new BUY transaction', async () => {
        const res = await request(app)
            .post('/api/transactions')
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
            .post('/api/transactions')
            .send({
                ticker: 'SELL-TEST', exchange: 'TestEx', transaction_type: 'SELL',
                quantity: 40, price: 60, transaction_date: '2025-10-02',
                account_holder_id: 2, parent_buy_id: buyId
            });

        expect(sellRes.statusCode).toEqual(201);
        const parentBuyLot = await db.get("SELECT * FROM transactions WHERE id = ?", buyId);
        expect(parentBuyLot.quantity_remaining).toBe(60);
    });

    it('should fail to create a SELL transaction for more shares than are available', async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SELL-TEST', 'TestEx', 'BUY', 100, 50, '2025-10-01', 100, 100, 2]);
        const buyId = buyRes.lastID;

        const sellRes = await request(app)
            .post('/api/transactions')
            .send({
                ticker: 'SELL-TEST', exchange: 'TestEx', transaction_type: 'SELL',
                quantity: 101, // Attempt to sell more than owned
                price: 60, transaction_date: '2025-10-02',
                account_holder_id: 2, parent_buy_id: buyId
            });

        expect(sellRes.statusCode).toEqual(400);
        // --- FIX: Update expected error message ---
        expect(sellRes.body.message).toBe('Sell quantity exceeds remaining quantity in the selected lot.');
        // --- END FIX ---
    });

    it('should fail to create a SELL transaction with a date before the buy date', async () => {
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SELL-TEST', 'TestEx', 'BUY', 100, 50, '2025-10-05', 100, 100, 2]);
        const buyId = buyRes.lastID;

        const sellRes = await request(app)
            .post('/api/transactions')
            .send({
                ticker: 'SELL-TEST', exchange: 'TestEx', transaction_type: 'SELL',
                quantity: 50, price: 60, transaction_date: '2025-10-04', // Date is before buy date
                account_holder_id: 2, parent_buy_id: buyId
            });

        expect(sellRes.statusCode).toEqual(400);
        expect(sellRes.body.message).toBe('Sell date cannot be before the buy date.');
    });

    it('should successfully delete a SELL and restore the quantity to the parent BUY', async () => {
        // Assume initial quantity remaining was 100, sell reduced it to 60
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['DEL-TEST', 'TestEx', 'BUY', 100, 50, '2025-10-01', 100, 60, 2]);
        const buyId = buyRes.lastID;
        const sellRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['DEL-TEST', 'TestEx', 'SELL', 40, 60, '2025-10-02', buyId, 2]);
        const sellId = sellRes.lastID;

        const deleteRes = await request(app).delete(`/api/transactions/${sellId}`);
        expect(deleteRes.statusCode).toEqual(200);

        const parentBuyLot = await db.get("SELECT * FROM transactions WHERE id = ?", buyId);
        expect(parentBuyLot.quantity_remaining).toBe(100); // Should be restored
    });


    it('should return a 400 error for invalid input data', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .send({
                ticker: 'BAD-DATA', exchange: 'TestEx', transaction_type: 'BUY',
                quantity: 'one-hundred', // Invalid data type
                price: 50, transaction_date: '2025-10-08', account_holder_id: 2
            });
        expect(res.statusCode).toEqual(400);
    });
});