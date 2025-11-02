/**
 * @jest-environment jsdom
 */

// Import functions
import {
  populatePricesFromCache,
  showToast,
  showConfirmationModal,
} from './helpers.js';
// Removed unused import: import { getTradingDays } from './datetime.js';

// --- Mocks ---
jest.mock('./formatters.js', () => ({
  // Correct path
  formatAccounting: jest.fn((num) =>
    num === null || num === undefined || isNaN(num)
      ? '--'
      : num === 0
        ? '$0.00'
        : num < 0
          ? `($${Math.abs(num).toFixed(2)})`
          : `$${num.toFixed(2)}`
  ),
  formatQuantity: jest.fn((num) =>
    num === null || num === undefined || isNaN(num) ? '' : String(num)
  ),
}));
jest.mock('./datetime.js', () => ({
  // Correct path
  getTradingDays: jest.fn(),
  getCurrentESTDateString: jest.fn(() => '2025-10-20'), // Provide a mock implementation
}));

// --- FIX: Correct the relative path to _journal_settings.js ---
jest.mock('../event-handlers/_journal_settings.js', () => ({
  // Go up one level
  fetchAndStoreAdviceSources: jest.fn().mockResolvedValue(undefined),
}));
// --- FIX: Correct the path to journal-settings.js ---
jest.mock('./journal-settings.js', () => ({
  // Correct path relative to helpers.test.js
  renderAdviceSourceManagementList: jest.fn(),
}));

// --- Re-import AFTER mocking to get the mocked versions ---
// We need to re-require to get the mocked versions for clearing/checking later
const { formatAccounting } = require('./formatters');

// --- Test Suites ---
describe('UI Helper Functions', () => {
  describe('showToast', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="toast-container"></div>';
      jest.useFakeTimers(); // Use fake timers for toast duration
    });
    afterEach(() => {
      jest.clearAllTimers(); // Clear timers after each test
      jest.useRealTimers();
    });

    test('should append a toast element to the container', () => {
      showToast('Test Info', 'info', 5000);
      const container = document.getElementById('toast-container');
      expect(container?.childElementCount).toBe(1);
      const toast = container?.querySelector('.toast');
      expect(toast).not.toBeNull();
      expect(toast?.textContent).toBe('Test Info');
      expect(toast?.classList.contains('toast-info')).toBe(true);
    });

    test('should remove the toast after the specified duration', () => {
      showToast('Test Success', 'success', 3000);
      const container = document.getElementById('toast-container');
      expect(container?.childElementCount).toBe(1);

      // Fast-forward time
      jest.advanceTimersByTime(3000 + 500); // duration + fadeOut animation

      expect(container?.childElementCount).toBe(0);
    });
  });

  describe('showConfirmationModal', () => {
    test('should make the confirmation modal visible', () => {
      document.body.innerHTML = `
                <div id="confirm-modal" class="modal">
                    <h2 id="confirm-modal-title"></h2>
                    <p id="confirm-modal-body"></p>
                    <button id="confirm-modal-confirm-btn"></button>
                    <button id="confirm-modal-cancel-btn"></button>
                </div>`;
      const modal = document.getElementById('confirm-modal');
      const confirmCallback = jest.fn();

      expect(modal?.classList.contains('visible')).toBe(false);
      showConfirmationModal('Test Title', 'Test Body', confirmCallback);
      expect(modal?.classList.contains('visible')).toBe(true);
    });
  });

  describe('populatePricesFromCache', () => {
    beforeEach(() => {
      // Clear the imported mock function
      formatAccounting.mockClear();

      document.body.innerHTML = `
                <div id="total-value-summary"><span></span></div>
                <table>
                    <tbody>
                        <tr data-key="lot-1"><td class="current-price"></td><td class="numeric unrealized-pl-combined"></td></tr>
                        <tr data-key="lot-2"><td class="current-price"></td><td class="numeric unrealized-pl-combined"></td></tr>
                        <tr data-key="lot-3"><td class="current-price"></td><td class="numeric unrealized-pl-combined"></td></tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="1" id="unrealized-pl-total"></td></tr>
                    </tfoot>
                </table>
            `;
    });

    test('should correctly calculate and render positive P/L', () => {
      const activityMap = new Map([
        ['lot-1', { ticker: 'AAPL', quantity_remaining: 10, cost_basis: 100 }],
      ]);
      const priceCache = new Map([
        ['AAPL', { price: 115, timestamp: Date.now() }],
      ]);
      populatePricesFromCache(activityMap, priceCache);
      const plCell = document.querySelector(
        'tr[data-key="lot-1"] .unrealized-pl-combined'
      );
      expect(plCell?.textContent).toContain('15.00%');
      expect(formatAccounting).toHaveBeenCalledWith(115); // current price
      expect(formatAccounting).toHaveBeenCalledWith(150); // unrealized PL
      expect(formatAccounting).toHaveBeenCalledWith(1150); // total value for this lot contributing to portfolio total
    });

    test('should correctly calculate and render negative P/L', () => {
      const activityMap = new Map([
        ['lot-2', { ticker: 'MSFT', quantity_remaining: 5, cost_basis: 200 }],
      ]);
      const priceCache = new Map([
        ['MSFT', { price: 180, timestamp: Date.now() }],
      ]);
      populatePricesFromCache(activityMap, priceCache);
      const plCell = document.querySelector(
        'tr[data-key="lot-2"] .unrealized-pl-combined'
      );
      expect(plCell?.textContent).toContain('-10.00%');
      expect(formatAccounting).toHaveBeenCalledWith(180); // current price
      expect(formatAccounting).toHaveBeenCalledWith(-100); // unrealized PL
      expect(formatAccounting).toHaveBeenCalledWith(900); // total value for this lot
    });

    test('should handle invalid price data in cache', () => {
      const activityMap = new Map([
        ['lot-3', { ticker: 'BAD', quantity_remaining: 5, cost_basis: 50 }],
      ]);
      const priceCache = new Map([
        ['BAD', { price: 'invalid', timestamp: Date.now() }],
      ]);
      populatePricesFromCache(activityMap, priceCache);
      const priceCell = document.querySelector(
        'tr[data-key="lot-3"] .current-price'
      );
      const plCell = document.querySelector(
        'tr[data-key="lot-3"] .unrealized-pl-combined'
      );
      const totalValueSpan = document.querySelector(
        '#total-value-summary span'
      );
      expect(priceCell?.innerHTML).toContain('Invalid');
      expect(plCell?.textContent).toBe('--');
      expect(formatAccounting).toHaveBeenCalledWith(0); // Total P/L (sum of P/Ls, which is 0 here)
      // Expect totalPortfolioValue to be calculated using cost basis fallback
      expect(formatAccounting).toHaveBeenCalledWith(250); // Total Value (5 * 50)
      expect(totalValueSpan?.textContent).toContain('$250.00'); // Check summary span reflects fallback value
    });
  });

  describe('sortTableByColumn', () => {
    // Add tests later
  });
});
