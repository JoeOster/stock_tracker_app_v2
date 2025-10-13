/**
 * @jest-environment jsdom
 */
import { initializeDailyReportHandlers } from './_dailyReport.js';
import { state } from '../state.js';

// Mock the entire state module
jest.mock('../state.js', () => ({
    state: {
        activityMap: new Map(),
        priceCache: new Map(),
        settings: {
            takeProfitPercent: 10,
            stopLossPercent: 10,
        },
    },
}));

// Mock the helpers to prevent actual modals from appearing
jest.mock('../ui/helpers.js', () => ({
    ...jest.requireActual('../ui/helpers.js'), // Import and retain default behavior
    showConfirmationModal: jest.fn(), // Mock the confirmation modal
    showToast: jest.fn(), // Mock the toast notifications
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
        const sellButton = document.querySelector('.sell-from-lot-btn');
        sellButton.click();

        // 5. Assert that the modal is now visible
        const modal = document.getElementById('sell-from-position-modal');
        expect(modal.classList.contains('visible')).toBe(true);
    });
});