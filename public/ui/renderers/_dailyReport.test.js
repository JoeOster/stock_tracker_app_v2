// Portfolio Tracker V3.0.5
// public/ui/renderers/_dailyReport.test.js

/**
 * @jest-environment jsdom
 */

// FIX: Import the correctly named function 'renderDailyReportPage'.
import { renderDailyReportPage } from './_dailyReport.js';
import { state } from '../../state.js';

// Mock the state module directly
jest.mock('../../state.js', () => ({
    state: {
        selectedAccountHolderId: '2',
        allAccountHolders: [
            { id: 1, name: 'Primary' },
            { id: 2, name: 'Joe' },
        ],
    },
}));

// Mock the helpers to provide controlled return values
jest.mock('../helpers.js', () => ({
    formatQuantity: (num) => num.toString(),
    formatAccounting: (num) => (num ? `$${num.toFixed(2)}` : '--'),
    getTradingDays: jest.fn(() => ['2025-10-10']),
}));


describe('renderDailyReportPage', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="table-title"></div>
            <div id="daily-performance-summary"></div>
            <div id="header-daily-summary"></div>
            <table id="stock-table">
                <tbody id="log-body"></tbody>
                <tbody id="positions-summary-body"></tbody>
            </table>
        `;
    });

    it('should render transaction and position data correctly when data is provided', () => {
        const mockDate = '2025-10-10';
        const mockActivityMap = new Map();
        const mockPerfData = { dailyChange: 100, previousValue: 10000 };
        const mockPositionData = {
            dailyTransactions: [
                { ticker: 'AAPL', exchange: 'Fidelity', transaction_type: 'BUY', quantity: 10, price: 150.00, realizedPL: 0 },
                { ticker: 'GOOG', exchange: 'Fidelity', transaction_type: 'SELL', quantity: 5, price: 2800.00, realizedPL: 500, parent_buy_price: 2700.00 },
            ],
            endOfDayPositions: [
                { id: 1, ticker: 'AAPL', exchange: 'Fidelity', purchase_date: '2025-10-09', cost_basis: 145.00, quantity_remaining: 10 },
            ],
        };

        // FIX: Call the correctly named function.
        renderDailyReportPage(mockDate, mockActivityMap, mockPerfData, mockPositionData);

        const logBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('log-body'));
        expect(logBody.rows.length).toBe(2);
        expect(logBody.textContent).toContain('AAPL');
        expect(logBody.textContent).toContain('GOOG');

        const summaryBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('positions-summary-body'));
        expect(summaryBody.rows.length).toBe(1);
        expect(summaryBody.querySelector('tr').dataset.key).toBe('lot-1');

        expect(mockActivityMap.size).toBe(1);
        expect(mockActivityMap.has('lot-1')).toBe(true);
    });

    it('should display "no data" messages if data is null or empty', () => {
        const mockDate = '2025-10-10';
        const mockActivityMap = new Map();

        // FIX: Call the correctly named function.
        renderDailyReportPage(mockDate, mockActivityMap, null, null);

        const logBody = document.getElementById('log-body');
        const summaryBody = document.getElementById('positions-summary-body');

        expect(logBody.textContent).toContain('No transactions logged for this day.');
        expect(summaryBody.textContent).toContain('No open positions at the end of this day.');
    });
});