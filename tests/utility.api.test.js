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
    db.run('DELETE FROM account_snapshots');
});

describe('Utility API Endpoints', () => {

    describe('Price Fetching', () => {
        it('should return "invalid" for a ticker with no price data', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
            mockedFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 0 }) });
            const res = await request(app)
                .post('/api/utility/prices/batch')
                .send({ tickers: ['INVALIDTICKER'], date: '2025-10-08' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('INVALIDTICKER', 'invalid');
    
            consoleWarnSpy.mockRestore();
        });
    
        it('should fetch the price for INTC', async () => {
            mockedFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ c: 45.50 }) });
            
            const res = await request(app)
                .post('/api/utility/prices/batch')
                .send({ tickers: ['INTC'], date: '2025-10-12' });
                
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('INTC');
            expect(typeof res.body.INTC).toBe('number');
            expect(res.body.INTC).toBeGreaterThan(0);
        });
    });



    describe('Importer Templates', () => {
        it('should return the brokerage templates', async () => {
            const res = await request(app).get('/api/utility/importer-templates');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('brokerageTemplates');
            expect(res.body.brokerageTemplates).toHaveProperty('fidelity');
        });
    });
});