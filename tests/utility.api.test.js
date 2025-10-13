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
    server = app.listen(3005); // Use a different port
});

afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) await db.close();
});

beforeEach(() => {
    mockedFetch.mockClear();
});

describe('Utility API Endpoints', () => {
    it('should return "invalid" for a ticker with no price data', async () => {
        // Temporarily spy on console.warn and do nothing with it
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        mockedFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 0 }) });
        const res = await request(app)
            .post('/api/utility/prices/batch')
            .send({ tickers: ['INVALIDTICKER'], date: '2025-10-08' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('INVALIDTICKER', 'invalid');

        // Restore the original console.warn
        consoleWarnSpy.mockRestore();
    });

    // New test for fetching a real ticker
    it('should fetch the price for INTC', async () => {
        // Mock a realistic price for INTC
        mockedFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 45.50 }) });
        
        const res = await request(app)
            .post('/api/utility/prices/batch')
            .send({ tickers: ['INTC'], date: '2025-10-12' }); // Using a recent date
            
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('INTC');
        expect(typeof res.body.INTC).toBe('number');
        expect(res.body.INTC).toBeGreaterThan(0);
    });
});