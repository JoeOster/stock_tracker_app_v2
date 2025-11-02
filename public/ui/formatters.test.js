/**
 * @jest-environment jsdom
 */

// Import the functions to be tested
import { formatQuantity, formatAccounting } from './formatters.js';

describe('UI Formatter Functions', () => {
  // --- Tests for formatQuantity ---
  describe('formatQuantity', () => {
    test('should format positive integers', () => {
      expect(formatQuantity(12345)).toBe('12,345');
    });

    test('should format positive decimals', () => {
      expect(formatQuantity(123.456)).toBe('123.456');
      expect(formatQuantity(0.12345)).toBe('0.12345');
      expect(formatQuantity(10.00001)).toBe('10.00001');
    });

    test('should format large numbers with commas', () => {
      expect(formatQuantity(1234567.89)).toBe('1,234,567.89');
    });

    test('should format zero', () => {
      expect(formatQuantity(0)).toBe('0');
    });

    test('should handle string number inputs', () => {
      expect(formatQuantity('1234.5')).toBe('1,234.5');
      expect(formatQuantity('100')).toBe('100');
    });

    test('should handle negative numbers (show absolute value)', () => {
      // Note: Current implementation uses Intl.NumberFormat which handles negatives.
      // Adjust expectation based on desired behavior (e.g., if it *should* show negative)
      expect(formatQuantity(-50)).toBe('-50');
      expect(formatQuantity(-12.34)).toBe('-12.34');
    });

    test('should return empty string for invalid inputs', () => {
      expect(formatQuantity(null)).toBe('');
      expect(formatQuantity(undefined)).toBe('');
      expect(formatQuantity(NaN)).toBe('');
      expect(formatQuantity('abc')).toBe('');
      expect(formatQuantity('')).toBe('');
    });

    test('should respect maximum fraction digits', () => {
      expect(formatQuantity(1.234567)).toBe('1.23457'); // Rounds the 6th digit
    });
  });

  // --- Tests for formatAccounting ---
  describe('formatAccounting', () => {
    test('should format positive currency correctly', () => {
      expect(formatAccounting(1234.56)).toBe('$1,234.56');
      expect(formatAccounting(0.78)).toBe('$0.78');
    });

    test('should format negative currency correctly with parentheses', () => {
      expect(formatAccounting(-1234.56)).toBe('($1,234.56)');
      expect(formatAccounting(-0.78)).toBe('($0.78)');
    });

    test('should format zero currency as $0.00', () => {
      expect(formatAccounting(0)).toBe('$0.00');
      expect(formatAccounting(0.0)).toBe('$0.00');
      expect(formatAccounting(-0.0)).toBe('$0.00');
    });

    test('should handle small numbers near zero correctly', () => {
      expect(formatAccounting(0.004)).toBe('$0.00'); // Rounds down
      expect(formatAccounting(-0.004)).toBe('($0.00)'); // Rounds down towards zero, shows as negative zero
      expect(formatAccounting(-0.005)).toBe('($0.01)'); // Rounds away from zero
    });

    test('should handle string number inputs', () => {
      expect(formatAccounting('1234.56')).toBe('$1,234.56');
      expect(formatAccounting('-789.10')).toBe('($789.10)');
    });

    test('should return empty string for invalid inputs', () => {
      expect(formatAccounting(null)).toBe('');
      expect(formatAccounting(undefined)).toBe('');
      expect(formatAccounting(NaN)).toBe('');
      expect(formatAccounting('abc')).toBe('');
      expect(formatAccounting('')).toBe('');
    });

    // Tests for non-currency formatting
    test('should format positive numbers without currency symbol', () => {
      expect(formatAccounting(12345, false)).toBe('12,345');
      expect(formatAccounting(123.456, false)).toBe('123.456');
    });

    test('should format negative numbers without currency symbol but with parentheses', () => {
      expect(formatAccounting(-12345, false)).toBe('(12,345)');
      expect(formatAccounting(-123.456, false)).toBe('(123.456)');
    });

    test('should format zero without currency symbol as 0', () => {
      expect(formatAccounting(0, false)).toBe('0');
    });
  });
});
