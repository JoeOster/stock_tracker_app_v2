const request = require('supertest');
const setupApp = require('../server'); // Use the setup function

let app;
let db;
let server;

beforeAll(async () => {
    // Set the environment to 'test'
    process.env.NODE_ENV = 'test';
    const { app: runningApp, db: database } = await setupApp();
    app = runningApp;
    db = database;
    server = app.listen(3001); // Use a different port for tests
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) {
        await db.close();
    }
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
                account_holder_id: 2 // Assuming 'Joe' is ID 2
            });
        expect(res.statusCode).toEqual(201);
        
        const transactions = await db.all('SELECT * FROM transactions WHERE ticker = ?', 'TEST');
        newTransactionId = transactions[0].id;
        expect(newTransactionId).toBeDefined();
    });

    it('should fetch all transactions and find the new one', async () => {
        const res = await request(app).get('/api/transactions?holder=2');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThan(0);
        const found = res.body.find(tx => tx.id === newTransactionId);
        expect(found).toBeDefined();
        expect(found.ticker).toEqual('TEST');
    });

    it('should update the created transaction', async () => {
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
        expect(updatedTx.price).toEqual(55);
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
        const res = await request(app).delete(`/api/transactions/${newTransactionId}`);
        expect(res.statusCode).toEqual(200);

        const deletedTx = await db.get('SELECT * FROM transactions WHERE id = ?', newTransactionId);
        expect(deletedTx).toBeUndefined();
    });
});

// --- NEW TEST SUITE FOR ACCOUNT HOLDERS ---
describe('Account Holder API Endpoints', () => {
    let newHolderId;

    it('should create a new account holder', async () => {
        const res = await request(app)
            .post('/api/account_holders')
            .send({ name: 'Test Holder' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        newHolderId = res.body.id;
    });

    it('should fetch all account holders and find the new one', async () => {
        const res = await request(app).get('/api/account_holders');
        expect(res.statusCode).toEqual(200);
        const found = res.body.find(holder => holder.id === newHolderId);
        expect(found).toBeDefined();
        expect(found.name).toEqual('Test Holder');
    });

    it('should update an account holder', async () => {
        const res = await request(app)
            .put(`/api/account_holders/${newHolderId}`)
            .send({ name: 'Updated Test Holder' });
        expect(res.statusCode).toEqual(200);

        const updatedHolder = await db.get('SELECT * FROM account_holders WHERE id = ?', newHolderId);
        expect(updatedHolder.name).toEqual('Updated Test Holder');
    });
    
    it('should prevent deleting an account holder that is in use', async () => {
        // Create a transaction linked to our new holder
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ['INUSE', 'TestEx', 'BUY', 1, 1, '2025-10-01', newHolderId]);

        const res = await request(app).delete(`/api/account_holders/${newHolderId}`);
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toContain('in use by transactions');
    });

    it('should delete an unused account holder', async () => {
        // First, create a new, unused holder
        const newHolderRes = await request(app).post('/api/account_holders').send({ name: 'Deletable Holder' });
        const deletableId = newHolderRes.body.id;

        // Now, delete it
        const res = await request(app).delete(`/api/account_holders/${deletableId}`);
        expect(res.statusCode).toEqual(200);

        const deletedHolder = await db.get('SELECT * FROM account_holders WHERE id = ?', deletableId);
        expect(deletedHolder).toBeUndefined();
    });
});

