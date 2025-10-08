const request = require('supertest');
const setupApp = require('../server'); // Import the setup function

let app;
let db;

// This runs once before all tests in this file
beforeAll(async () => {
    const server = await setupApp();
    app = server.app;
    db = server.db;
});

// This runs once after all tests in this file are complete
afterAll(async () => {
    await db.close(); // Close the database connection
});

describe('Transaction API Endpoints', () => {

    let transactionId;

    // Test the CREATE functionality
    test('should create a new BUY transaction', async () => {
        const newTransaction = {
            ticker: 'TEST',
            exchange: 'Fidelity',
            transaction_type: 'BUY',
            quantity: 10,
            price: 100,
            transaction_date: '2025-10-08'
        };

        const response = await request(app)
            .post('/api/transactions')
            .send(newTransaction)
            .expect(201); // Expect 'Created' status

        expect(response.body.message).toBe('Success');
    });

    // Test the READ functionality
    test('should fetch all transactions and find the new one', async () => {
        const response = await request(app)
            .get('/api/transactions')
            .expect(200);

        const testTransaction = response.body.find(tx => tx.ticker === 'TEST');
        expect(testTransaction).toBeDefined();
        expect(testTransaction.quantity).toBe(10);
        expect(testTransaction.price).toBe(100);
        
        // Save the ID for the next tests
        transactionId = testTransaction.id;
    });

    // Test the UPDATE functionality
    test('should update the created transaction', async () => {
        const updatedTransaction = {
            ticker: 'TEST',
            exchange: 'Fidelity',
            transaction_type: 'BUY',
            quantity: 15, // Update quantity
            price: 105,   // Update price
            transaction_date: '2025-10-08'
        };

        const response = await request(app)
            .put(`/api/transactions/${transactionId}`)
            .send(updatedTransaction)
            .expect(200);

        expect(response.body.message).toBe('Transaction updated.');

        // Verify the update
        const verifyResponse = await request(app).get('/api/transactions');
        const updated = verifyResponse.body.find(tx => tx.id === transactionId);
        expect(updated.quantity).toBe(15);
        expect(updated.price).toBe(105);
    });

    // Test the DELETE functionality
    test('should delete the transaction', async () => {
        const response = await request(app)
            .delete(`/api/transactions/${transactionId}`)
            .expect(200);

        expect(response.body.message).toBe('Transaction deleted.');

        // Verify it's gone
        const verifyResponse = await request(app).get('/api/transactions');
        const deleted = verifyResponse.body.find(tx => tx.id === transactionId);
        expect(deleted).toBeUndefined();
    });
});

