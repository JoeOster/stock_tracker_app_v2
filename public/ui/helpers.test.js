/**
 * @jest-environment jsdom
 */

// FIX: Import functions from their new, correct locations.
import { populatePricesFromCache } from './helpers.js';
import { formatAccounting, formatQuantity } from './formatters.js';
import { getTradingDays } from './datetime.js';

describe('formatAccounting', () => {
    it('should format positive currency values correctly', () => {
        expect(formatAccounting(1234.56)).toBe('$1,234.56');
    });

    it('should format negative currency values with parentheses', () => {
        expect(formatAccounting(-1234.56)).toBe('($1,234.56)');
    });

    it('should handle zero values with a specific placeholder', () => {
        expect(formatAccounting(0)).toBe('$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-');
    });

    it('should return an empty string for null or undefined input', () => {
        expect(formatAccounting(null)).toBe('');
        expect(formatAccounting(undefined)).toBe('');
    });
});

describe('formatQuantity', () => {
    it('should format whole numbers without decimal points', () => {
        expect(formatQuantity(100)).toBe('100');
    });

    it('should format fractional numbers with decimal points', () => {
        expect(formatQuantity(123.456)).toBe('123.456');
    });

    it('should handle zero correctly', () => {
        expect(formatQuantity(0)).toBe('0');
    });

    it('should return an empty string for null or undefined input', () => {
        expect(formatQuantity(null)).toBe('');
        expect(formatQuantity(undefined)).toBe('');
    });
});

describe('getTradingDays', () => {
    beforeAll(() => {
        jest.useFakeTimers().setSystemTime(new Date('2025-10-12T12:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should return the correct preceding trading days, skipping weekends', () => {
        const result = getTradingDays(3);
        const expected = ['2025-10-08', '2025-10-09', '2025-10-10'];
        expect(result).toEqual(expected);
    });
});

describe('populatePricesFromCache', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <table>
                <tbody>
                    <tr data-key="lot-1">
                        <td class="current-price"></td>
                        <td class="numeric unrealized-pl-combined"></td>
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
        const priceCache = new Map([['AAPL', { price: 115, timestamp: Date.now() }]]);

        populatePricesFromCache(activityMap, priceCache);

        const plCell = document.querySelector('.unrealized-pl-combined');
        
        expect(plCell.textContent).toBe('$150.00 | 15.00%'); 
        expect(plCell.classList.contains('positive')).toBe(true);

        const totalPlCell = document.getElementById('unrealized-pl-total');
        expect(totalPlCell.textContent).toBe('$150.00');
    });
});