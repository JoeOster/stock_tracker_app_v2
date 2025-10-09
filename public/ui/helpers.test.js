/**
 * @jest-environment jsdom
 */

import { formatAccounting, getTradingDays } from './helpers.js';

describe('formatAccounting', () => {
    it('should format positive currency values correctly', () => {
        expect(formatAccounting(1234.56)).toBe('$1,234.56');
    });

    it('should format negative currency values with parentheses', () => {
        expect(formatAccounting(-1234.56)).toBe('($1,234.56)');
    });

    it('should handle zero values with a specific placeholder', () => {
        // Note: The result includes non-breaking spaces for alignment
        expect(formatAccounting(0)).toBe('$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-');
    });

    it('should return an empty string for null or undefined input', () => {
        expect(formatAccounting(null)).toBe('');
        expect(formatAccounting(undefined)).toBe('');
    });
});

describe('getTradingDays', () => {
    // We use fake timers to control the "current" date for a predictable test
    beforeAll(() => {
        // Set the system time to a Sunday to test weekend skipping
        jest.useFakeTimers().setSystemTime(new Date('2025-10-12T12:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should return the correct preceding trading days, skipping weekends', () => {
        // Get the 3 trading days before Sunday, Oct 12th
        const result = getTradingDays(3);

        // Expected result is Wed, Thu, Fri
        const expected = ['2025-10-08', '2025-10-09', '2025-10-10'];
        
        expect(result).toEqual(expected);
    });
});