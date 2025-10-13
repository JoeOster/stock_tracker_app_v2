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
    server = app.listen(3003); // Use a different port
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
});

beforeEach(async () => {
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM account_holders WHERE id > 2');
});

describe('Account Management API', () => {
    it('should prevent deleting an account holder that has transactions', async () => {
        const holderRes = await db.run('INSERT INTO account_holders (name) VALUES (?)', ['InUseHolder']);
        const holderId = holderRes.lastID;
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['TEST', 'TestEx', 'BUY', 100, 10, '2025-10-01', holderId]);
        
        const res = await request(app)
            .delete(`/api/accounts/holders/${holderId}`);
            
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Cannot delete an account holder that is in use by transactions.');
    });
});