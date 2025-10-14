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
    server = app.listen(3006); // Use a different port
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
    // The global teardown.js will handle disconnecting the price service
});

beforeEach(async () => {
    // Clear all relevant tables before each test
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM exchanges WHERE id > 4'); // Keep the default exchanges
    await db.run('DELETE FROM account_holders WHERE id > 1'); // Keep the primary holder
});

describe('Account Holders API', () => {

    it('should create a new account holder successfully', async () => {
        const res = await request(app)
            .post('/api/accounts/holders')
            .send({ name: 'New Holder' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('New Holder');
    });

    it('should fail to create an account holder with an empty name', async () => {
        const res = await request(app)
            .post('/api/accounts/holders')
            .send({ name: '  ' }); // Empty name
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Account holder name cannot be empty.');
    });

    it('should fetch all account holders', async () => {
        await db.run("INSERT INTO account_holders (name) VALUES ('Holder A'), ('Holder B')");
        const res = await request(app).get('/api/accounts/holders');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(3); // Including the 'Primary' default
    });

    it('should update an account holder successfully', async () => {
        const holderRes = await db.run('INSERT INTO account_holders (name) VALUES (?)', ['To Be Updated']);
        const holderId = holderRes.lastID;

        const res = await request(app)
            .put(`/api/accounts/holders/${holderId}`)
            .send({ name: 'Updated Name' });
        expect(res.statusCode).toEqual(200);

        const updatedHolder = await db.get('SELECT * FROM account_holders WHERE id = ?', holderId);
        expect(updatedHolder.name).toBe('Updated Name');
    });

    it('should delete an unused account holder successfully', async () => {
        const holderRes = await db.run('INSERT INTO account_holders (name) VALUES (?)', ['To Be Deleted']);
        const holderId = holderRes.lastID;

        const res = await request(app).delete(`/api/accounts/holders/${holderId}`);
        expect(res.statusCode).toEqual(200);

        const deletedHolder = await db.get('SELECT * FROM account_holders WHERE id = ?', holderId);
        expect(deletedHolder).toBeUndefined();
    });

    it('should prevent deleting the primary account holder (ID 1)', async () => {
        const res = await request(app).delete('/api/accounts/holders/1');
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Cannot delete the default Primary account holder.');
    });

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

describe('Exchanges API', () => {

    it('should create a new exchange successfully', async () => {
        const res = await request(app)
            .post('/api/accounts/exchanges')
            .send({ name: 'New Exchange' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toBe('New Exchange');
    });

    it('should prevent deleting an exchange that is in use', async () => {
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['TEST', 'Fidelity', 'BUY', 10, 10, '2025-10-01', 1]);
        
        const fidelity = await db.get("SELECT id FROM exchanges WHERE name = 'Fidelity'");

        const res = await request(app).delete(`/api/accounts/exchanges/${fidelity.id}`);
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Cannot delete an exchange that is currently in use by transactions.');
    });
});