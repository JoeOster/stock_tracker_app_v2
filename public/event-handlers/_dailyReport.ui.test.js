/**
 * @jest-environment jsdom
 */
import { initializeDailyReportHandlers } from './_dailyReport.js';
import { state } from '../state.js';

// Mock the state module
jest.mock('../state.js', () => ({
    state: {
        activityMap: new Map(),
        priceCache: new Map(),
        settings: {
            takeProfitPercent: 10,
            stopLossPercent: 10,
        },
        // We still provide a mock currentView, as it's good practice
        currentView: { type: 'date', value: '2025-10-10' }
    },
}));

// Mock the helpers to prevent modals from appearing
jest.mock('../ui/helpers.js', () => ({
    ...jest.requireActual('../ui/helpers.js'),
    showConfirmationModal: jest.fn(),
    showToast: jest.fn(),
}));

// FIX: Completely mock the renderers module. The file we're testing (_dailyReport.js)
// only needs `renderDailyReport` to exist, so we provide a dummy version.
// This prevents the real renderers.js from loading _tabs.js and causing the error.
jest.mock('../ui/renderers.js', () => ({
    renderDailyReport: jest.fn(),
}));


describe('Daily Report Interactions', () => {
    it('should open the sell modal when a sell button is clicked', () => {
        // 1. Set up the DOM with a fake table row and sell button
        document.body.innerHTML = `
            <div id="daily-report-container">
                <table>
                    <tbody id="positions-summary-body">
                        <tr data-key="lot-123">
                            <td><button class="sell-from-lot-btn" data-buy-id="123" data-ticker="AAPL" data-exchange="TestEx" data-quantity="10"></button></td>
                        </tr>
                    </tbody>
                </table>
                <div id="sell-from-position-modal" class="modal">
                     <input id="sell-parent-buy-id">
                     <p id="sell-ticker-display"></p>
                     <p id="sell-exchange-display"></p>
                     <input id="sell-quantity">
                     <input id="sell-date">
                     <input id="sell-account-holder-id">
                </div>
            </div>
        `;
        // 2. Set up the necessary state
        state.activityMap.set('lot-123', { id: 123, ticker: 'AAPL', quantity_remaining: 10, account_holder_id: 2 });

        // 3. Initialize the event handlers for the page
        initializeDailyReportHandlers();

        // 4. Simulate a user click
        const sellButton = /** @type {HTMLButtonElement} */ (document.querySelector('.sell-from-lot-btn'));
        sellButton.click();

        // 5. Assert that the modal is now visible
        const modal = document.getElementById('sell-from-position-modal');
        expect(modal.classList.contains('visible')).toBe(true);
    });
});