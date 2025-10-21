// Portfolio Tracker V3.0.6
// public/ui/renderers/_dailyReport.test.js

/**
 * @jest-environment jsdom
 */

// Import the correctly named function 'renderDailyReportPage'.
import { renderDailyReportPage } from './_dailyReport.js';
import { state } from '../../state.js'; // Assuming state mock is needed
import { getCurrentESTDateString } from '../datetime.js'; // Import for date checks

// --- Mocks ---
// Mock state (can be simple for this test)
jest.mock('../../state.js', () => ({
    state: {
        selectedAccountHolderId: '2', // Example ID
        settings: { theme: 'light' }, // Needed for styling checks maybe
        priceCache: new Map(), // Mock price cache
        activityMap: new Map(), // Mock activity map (renderer clears it anyway)
    },
}));

// Mock formatters and datetime helpers
jest.mock('../formatters.js', () => ({
    formatQuantity: (num) => num?.toString() || '', // Simple mock
    formatAccounting: (num) => (num !== null && num !== undefined && !isNaN(num) ? `$${Number(num).toFixed(2)}` : '--'), // Simple mock
}));
jest.mock('../datetime.js', () => ({
    getCurrentESTDateString: jest.fn(() => '2025-10-20'), // Mock current date
}));

// Mock API (not strictly needed if renderer doesn't fetch, but good practice)
jest.mock('../../api.js', () => ({
    fetchPositions: jest.fn(),
    fetchDailyPerformance: jest.fn(),
    updatePricesForView: jest.fn(),
}));

// --- Test Suite ---
describe('renderDailyReportPage (Historical View)', () => {

    // Define mock data for a HISTORICAL date
    const mockHistoricalDate = '2025-10-17'; // Different from mocked getCurrentESTDateString
    const mockPositionData = {
        dailyTransactions: [
            { id: 1, ticker: 'AAPL', exchange: 'Fidelity', transaction_type: 'BUY', quantity: 10, price: 150.00, realizedPL: null, transaction_date: mockHistoricalDate },
            { id: 2, ticker: 'GOOG', exchange: 'Fidelity', transaction_type: 'SELL', quantity: 5, price: 2800.00, realizedPL: 500, parent_buy_price: 2700.00, transaction_date: mockHistoricalDate },
        ],
        endOfDayPositions: [
            { id: 3, ticker: 'AAPL', exchange: 'Fidelity', purchase_date: '2025-10-09', cost_basis: 145.00, original_quantity: 10, quantity_remaining: 10, limit_price_up: 180, limit_price_down: 140, account_holder_id: 2 },
            { id: 4, ticker: 'MSFT', exchange: 'Robinhood', purchase_date: '2025-10-10', cost_basis: 300.00, original_quantity: 5, quantity_remaining: 5, limit_price_up: null, limit_price_down: null, account_holder_id: 2 },
        ],
    };

    beforeEach(() => {
        // --- Setup Simplified DOM based on _dailyReport.html for HISTORICAL view ---
        document.body.innerHTML = `
            <div id="daily-report-container">
                <h2 id="table-title"></h2>
                <div id="daily-performance-summary"></div>
                <table id="stock-table">
                    <thead>
                        <tr><th colspan="7">Daily Transaction Log</th></tr> <tr>
                            <th>Ticker</th>
                            <th>Exchange</th>
                            <th class="center-align">Action</th>
                            <th class="numeric">Qty</th>
                            <th class="numeric">Price</th>
                            <th class="numeric">Realized P/L</th>
                            </tr>
                    </thead>
                    <tbody id="log-body"></tbody>
                    <thead>
                        <tr><th colspan="8" id="positions-summary-title">Open Lots</th></tr> <tr>
                             <th>Ticker</th>
                            <th>Exchange</th>
                            <th>Purchase Date</th>
                            <th class="numeric">Basis</th>
                            <th class="numeric">Qty</th>
                            <th class="numeric">Current Price</th>
                            <th class="numeric">Unrealized P/L ($ | %)</th>
                            <th class="numeric">Limits (Up/Down)</th>
                             </tr>
                    </thead>
                    <tbody id="positions-summary-body"></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7">Total Unrealized P/L</td> <td id="unrealized-pl-total" class="numeric">--</td>
                            </tr>
                    </tfoot>
                </table>
                 <div id="portfolio-summary">
                    <button id="refresh-prices-btn">Refresh Prices</button>
                 </div>
            </div>
        `;
        // Clear mocks used by the renderer
        state.activityMap.clear();
    });

    test('should render historical transaction and position data correctly (no actions/checkbox)', () => {
        // Pass a historical date and mock data
        renderDailyReportPage(mockHistoricalDate, state.activityMap, null, mockPositionData);

        const logBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('log-body'));
        const summaryBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('positions-summary-body'));

        // Check number of rows rendered
        expect(logBody.rows.length).toBe(mockPositionData.dailyTransactions.length); // Should render 2 log rows
        expect(summaryBody.rows.length).toBe(mockPositionData.endOfDayPositions.length); // Should render 2 position rows

        // Check content (basic checks)
        expect(logBody.textContent).toContain('AAPL');
        expect(logBody.textContent).toContain('GOOG');
        expect(summaryBody.textContent).toContain('AAPL');
        expect(summaryBody.textContent).toContain('MSFT');

        // Check that action buttons are NOT present
        expect(logBody.querySelector('.actions-cell')).toBeNull();
        expect(summaryBody.querySelector('.actions-cell')).toBeNull();
        expect(logBody.querySelector('.reconciliation-checkbox-cell')).toBeNull();
        expect(summaryBody.querySelector('.reconciliation-checkbox-cell')).toBeNull();

        // Check if activityMap remains empty for historical dates
        expect(state.activityMap.size).toBe(0);
    });

    test('should display "no data" messages if historical data is null or empty', () => {
        // Pass historical date and null data
        renderDailyReportPage(mockHistoricalDate, state.activityMap, null, null);

        const logBody = document.getElementById('log-body');
        const summaryBody = document.getElementById('positions-summary-body');

        // Check for "No data" messages
        expect(logBody.textContent).toContain('No transactions logged for this day.');
        expect(summaryBody.textContent).toContain('No open positions at the end of this day.');
        // Check colspans (adjust based on historical column count)
        expect(logBody.querySelector('td')?.colSpan).toBe(7); // Log historical colspan
        expect(summaryBody.querySelector('td')?.colSpan).toBe(8); // Summary historical colspan
    });
});