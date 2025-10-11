/**
 * @jest-environment jsdom
 */

import { renderDailyReport, populatePricesFromCache } from './_dailyReport.js';
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
    formatQuantity: jest.fn((num) => num.toString()),
    formatAccounting: jest.fn((num) => (num || num === 0 ? `$${Number(num).toFixed(2)}` : '--')),
}));

const { formatAccounting } = require('../helpers.js');

describe('renderDailyReport', () => {
    beforeEach(() => {
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

        fetch.mockResolvedValue({
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

        await renderDailyReport(mockDate, mockActivityMap);
        
        const logBody = document.getElementById('log-body');
        expect(logBody.rows.length).toBe(2);
        expect(logBody.textContent).toContain('AAPL');

        const summaryBody = document.getElementById('positions-summary-body');
        expect(summaryBody.rows.length).toBe(1);
        expect(summaryBody.querySelector('tr').dataset.key).toBe('lot-1');

        expect(mockActivityMap.size).toBe(1);
    });

    it('should display an error message if the API call fails', async () => {
        const mockDate = '2025-10-10';
        const mockActivityMap = new Map();

        fetch.mockResolvedValue({ ok: false, status: 500 });

        await renderDailyReport(mockDate, mockActivityMap);

        const logBody = document.getElementById('log-body');
        expect(logBody.textContent).toContain('Error loading transaction data.');
    });
});

describe('populatePricesFromCache', () => {
    beforeEach(() => {
        formatAccounting.mockClear();
        formatAccounting.mockImplementation((num) => {
            if (num === null || num === undefined) return '--';
            const isNegative = num < 0;
            const formatted = `$${Math.abs(num).toFixed(2)}`;
            return isNegative ? `(${formatted})` : formatted;
        });

        document.body.innerHTML = `
            <table>
                <tbody>
                    <tr data-key="lot-1">
                        <td class="current-price"></td>
                        <td class="unrealized-pl-dollar"></td>
                        <td class="unrealized-pl-percent"></td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr><td id="unrealized-pl-total"></td></tr>
                </tfoot>
            </table>
            <div id="total-value-summary"><span></span></div>
        `;
    });

    it('should correctly calculate and render unrealized P/L', () => {
        const activityMap = new Map([['lot-1', { ticker: 'AAPL', quantity_remaining: 10, cost_basis: 100 }]]);
        const priceCache = new Map([['AAPL', 115]]);

        populatePricesFromCache(activityMap, priceCache);

        const plCell = document.querySelector('.unrealized-pl-dollar');
        expect(plCell.textContent).toBe('$150.00');
        expect(plCell.classList.contains('positive')).toBe(true);

        const totalPlCell = document.getElementById('unrealized-pl-total');
        expect(totalPlCell.textContent).toBe('$150.00');
    });
});