/**
 * @jest-environment jsdom
 */

import { renderDailyReport } from './_dailyReport.js';
import { state } from '../../app-main.js';

// Mock the entire app-main module to control the state
jest.mock('../../app-main.js', () => ({
    state: {
        selectedAccountHolderId: '2',
        allAccountHolders: [
            { id: 1, name: 'Primary' },
            { id: 2, name: 'Joe' },
        ],
    },
}));

// Mock the global fetch function
global.fetch = jest.fn();

// Mock the helpers to provide controlled return values
jest.mock('../helpers.js', () => ({
    formatQuantity: (num) => num.toString(),
    formatAccounting: (num) => (num ? `$${num.toFixed(2)}` : '--'),
}));


describe('renderDailyReport', () => {
    beforeEach(() => {
        // Reset fetch mocks and DOM before each test
        fetch.mockClear();
        document.body.innerHTML = `
            <div id="table-title"></div>
            <div id="daily-performance-summary"></div>
            <div id="header-daily-summary"></div>
            <table id="stock-table">
                <tbody id="log-body"></tbody>
            </table>
            <table id="positions-summary-table">
                <tbody id="positions-summary-body"></tbody>
            </table>
        `;
    });

    it('should render transaction and position data correctly on successful API calls', async () => {
        const mockDate = '2025-10-10';
        const mockActivityMap = new Map();

        // FIX: Use mockImplementation for more robust fetch mocking
        fetch.mockImplementation((url) => {
            if (url.includes('/api/reporting/daily_performance/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ dailyChange: 100, previousValue: 10000 }),
                });
            }
            if (url.includes('/api/reporting/positions/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        dailyTransactions: [
                            { ticker: 'AAPL', exchange: 'Fidelity', transaction_type: 'BUY', quantity: 10, price: 150.00, realizedPL: 0 },
                            { ticker: 'GOOG', exchange: 'Fidelity', transaction_type: 'SELL', quantity: 5, price: 2800.00, realizedPL: 500, parent_buy_price: 2700.00 },
                        ],
                        endOfDayPositions: [
                            { id: 1, ticker: 'AAPL', exchange: 'Fidelity', purchase_date: '2025-10-09', cost_basis: 145.00, quantity_remaining: 10 },
                        ],
                    }),
                });
            }
            return Promise.reject(new Error(`Unhandled fetch mock for URL: ${url}`));
        });

        await renderDailyReport(mockDate, mockActivityMap);
        
        const logBody = document.getElementById('log-body');
        expect(logBody.rows.length).toBe(2);
        expect(logBody.textContent).toContain('AAPL');
        expect(logBody.textContent).toContain('GOOG');

        const summaryBody = document.getElementById('positions-summary-body');
        expect(summaryBody.rows.length).toBe(1);
        expect(summaryBody.querySelector('tr').dataset.key).toBe('lot-1');

        expect(mockActivityMap.size).toBe(1);
        expect(mockActivityMap.has('lot-1')).toBe(true);
    });

    it('should display an error message if the API call fails', async () => {
        const mockDate = '2025-10-10';
        const mockActivityMap = new Map();

        // FIX: Use mockImplementation to simulate a specific endpoint failing
        fetch.mockImplementation((url) => {
            if (url.includes('/api/reporting/daily_performance/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ dailyChange: 100, previousValue: 10000 }),
                });
            }
            if (url.includes('/api/reporting/positions/')) {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                });
            }
            return Promise.reject(new Error(`Unhandled fetch mock for URL: ${url}`));
        });

        await renderDailyReport(mockDate, mockActivityMap);

        const logBody = document.getElementById('log-body');
        const summaryBody = document.getElementById('positions-summary-body');

        expect(logBody.textContent).toContain('Error loading transaction data.');
        expect(summaryBody.textContent).toContain('Error loading position data.');
    });
});