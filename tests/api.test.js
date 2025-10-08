const request = require('supertest');
const setupApp = require('../server'); // Use the setup function

let app;
let db;
let server;

beforeAll(async () => {
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
        
        // Fetch the transaction to get its ID for later tests
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
                quantity: 110, // Changed quantity
                price: 55,     // Changed price
                transaction_date: '2025-10-08',
                account_holder_id: 2
            });
        expect(res.statusCode).toEqual(200);

        const updatedTx = await db.get('SELECT * FROM transactions WHERE id = ?', newTransactionId);
        expect(updatedTx.quantity).toEqual(110);
        expect(updatedTx.price).toEqual(55);
    });

    // --- THIS IS THE NEW TEST CASE ---
    it('should correctly update a BUY transaction that has child SELLs', async () => {
        // Step 1: Create a BUY lot
        const buyRes = await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SALE-TEST', 'TestEx', 'BUY', 200, 10, '2025-10-01', 200, 200, 2]);
        const buyId = buyRes.lastID;

        // Step 2: Create a SELL transaction from that lot
        await db.run('UPDATE transactions SET quantity_remaining = 180 WHERE id = ?', [buyId]); // Manually update remaining
        await db.run('INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, parent_buy_id, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['SALE-TEST', 'TestEx', 'SELL', 20, 12, '2025-10-02', buyId, 2]);

        // Step 3: Now, update the original BUY transaction via the API (e.g., a correction)
        const updateRes = await request(app)
            .put(`/api/transactions/${buyId}`)
            .send({
                ticker: 'SALE-TEST',
                exchange: 'TestEx',
                transaction_type: 'BUY',
                quantity: 205, // Correcting original quantity
                price: 10,
                transaction_date: '2025-10-01',
                account_holder_id: 2
            });
        expect(updateRes.statusCode).toEqual(200);

        // Step 4: Verify the server-side calculation is correct
        const finalTx = await db.get('SELECT * FROM transactions WHERE id = ?', buyId);
        expect(finalTx.original_quantity).toEqual(205); // The new original quantity
        expect(finalTx.quantity_remaining).toEqual(185); // The new remaining quantity (205 - 20)
    });

    it('should delete the transaction', async () => {
        const res = await request(app).delete(`/api/transactions/${newTransactionId}`);
        expect(res.statusCode).toEqual(200);

        const deletedTx = await db.get('SELECT * FROM transactions WHERE id = ?', newTransactionId);
        expect(deletedTx).toBeUndefined();
    });
});

