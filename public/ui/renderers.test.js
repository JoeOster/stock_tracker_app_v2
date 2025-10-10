/**
 * @jest-environment jsdom
 */

import { renderTabs, populatePricesFromCache } from './renderers.js';

// --- FIX: Mock the entire helpers module first ---
jest.mock('./helpers.js', () => ({
    getTradingDays: jest.fn(),
    getActivePersistentDates: jest.fn(),
    formatAccounting: jest.fn(),
}));

// --- FIX: After mocking, use require to get the mocked functions ---
const { getTradingDays, getActivePersistentDates, formatAccounting } = require('./helpers.js');

// Mock the app-main module to break potential circular dependencies
jest.mock('../app-main.js', () => ({
    state: {
        settings: { theme: 'light' },
        allAccountHolders: [],
        selectedAccountHolderId: 'all'
    },
}));



// In public/ui/renderers.test.js
describe('renderTabs', () => {
    // Define a single source of truth for the test
    const MOCK_DATE_TABS_COUNT = 2;
    const STATIC_TABS = ['Charts', 'Ledger', 'New Orders', 'Alerts', 'Snapshots'];
    const TOTAL_TABS_EXPECTED = MOCK_DATE_TABS_COUNT + STATIC_TABS.length;

    beforeEach(() => {
        document.body.innerHTML = '<div id="tabs-container"></div>';
        // Use unique mock dates to prevent de-duplication
        getTradingDays.mockReturnValue(['2025-10-01', '2025-10-02']); 
        getActivePersistentDates.mockReturnValue([]);
    });

    it('should render all static and dynamic tabs correctly', () => {
        const mockCurrentView = { type: 'date', value: '2025-10-08' };
        renderTabs(mockCurrentView);
        const tabsContainer = document.getElementById('tabs-container');
        const tabs = tabsContainer.querySelectorAll('.tab');

        expect(tabs.length).toBe(TOTAL_TABS_EXPECTED);

        STATIC_TABS.forEach(tabName => {
            expect(tabsContainer.textContent).toContain(tabName);
        });
    });

    it('should correctly apply the "active" class to the current view tab', () => {
        const mockCurrentView = { type: 'charts', value: null };
        renderTabs(mockCurrentView);
        const activeTab = document.querySelector('.tab.active');
        expect(activeTab).not.toBeNull();
        expect(activeTab.textContent).toBe('Charts');
    });
});

describe('populatePricesFromCache', () => {
    beforeEach(() => {
        // Clear mock and set up the mock return value for this test suite
        formatAccounting.mockClear();
        formatAccounting.mockImplementation((num) => {
            if (num === null || num === undefined) return '--';
            const isNegative = num < 0;
            const formatted = `\$${Math.abs(num).toFixed(2)}`;
            return isNegative ? `(${formatted})` : formatted;
        });

        // Setup the mock DOM
        document.body.innerHTML = `
            <table>
                <tbody>
                    <tr data-key="lot-1">
                        <td class="unrealized-pl-dollar"></td>
                    </tr>
                </tbody>
                <tfoot><tr><td id="unrealized-pl-total"></td></tr></tfoot>
            </table>
        `;
    });

    it('should correctly calculate and render unrealized P/L', () => {
        const activityMap = new Map([['lot-1', { ticker: 'AAPL', quantity_remaining: 10, cost_basis: 100 }]]);
        const priceCache = new Map([['AAPL', 115]]);

        populatePricesFromCache(activityMap, priceCache);

        // Expected P/L = (115 - 100) * 10 = 150
        const plCell = document.querySelector('.unrealized-pl-dollar');
        expect(plCell.textContent).toBe('$150.00');
    });
});