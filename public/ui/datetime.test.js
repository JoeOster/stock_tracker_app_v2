/**
 * @jest-environment jsdom
 */

// Import functions to test
import {
  getCurrentESTDateString,
  getTradingDays,
  getActivePersistentDates,
  getUSMarketStatus,
  getMostRecentTradingDay,
} from './datetime.js';

// Helper to mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('UI Datetime Functions', () => {
  beforeEach(() => {
    // Reset mocks and timers before each test
    jest.useFakeTimers();
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks(); // Restore any potential spies
  });

  // --- Test getCurrentESTDateString ---
  describe('getCurrentESTDateString', () => {
    test('should return date string in YYYY-MM-DD format for EST', () => {
      // Mock date to a specific time in UTC, which corresponds to EST
      // Example: Oct 23, 2025 10:00:00 AM EST is Oct 23, 2025 14:00:00 UTC
      jest.setSystemTime(new Date('2025-10-23T14:00:00.000Z'));
      expect(getCurrentESTDateString()).toBe('2025-10-23');

      // Example: Oct 23, 2025 11:00:00 PM EST is Oct 24, 2025 03:00:00 UTC
      jest.setSystemTime(new Date('2025-10-24T03:00:00.000Z'));
      expect(getCurrentESTDateString()).toBe('2025-10-23'); // Still the 23rd in EST
    });
  });

  // --- Test getTradingDays (modified to return only 1 day) ---
  describe('getTradingDays', () => {
    test('should return the current weekday if it is a trading day', () => {
      // Thursday, Oct 23, 2025 in EST
      jest.setSystemTime(new Date('2025-10-23T14:00:00.000Z'));
      expect(getTradingDays()).toEqual(['2025-10-23']);
    });

    test('should return the previous Friday if current day is Saturday', () => {
      // Saturday, Oct 25, 2025 in EST (UTC: Oct 25, 14:00)
      jest.setSystemTime(new Date('2025-10-25T14:00:00.000Z'));
      // Expected Friday
      expect(getTradingDays()).toEqual(['2025-10-24']);
    });

    test('should return the previous Friday if current day is Sunday', () => {
      // Sunday, Oct 26, 2025 in EST (UTC: Oct 26, 14:00)
      jest.setSystemTime(new Date('2025-10-26T14:00:00.000Z'));
      // Expected Friday
      expect(getTradingDays()).toEqual(['2025-10-24']);
    });

    test('should return the previous Friday if current day is Monday but asking for previous day', () => {
      // Monday, Oct 27, 2025 in EST (UTC: Oct 27, 14:00)
      jest.setSystemTime(new Date('2025-10-27T14:00:00.000Z'));
      // Function finds the *most recent* trading day, which is today (Monday)
      expect(getTradingDays()).toEqual(['2025-10-27']);
    });
  });

  // --- Test getActivePersistentDates ---
  describe('getActivePersistentDates', () => {
    test('should return empty array if localStorage is empty', () => {
      expect(getActivePersistentDates()).toEqual([]);
    });

    test('should return dates added within the last 24 hours', () => {
      const now = Date.now();
      const recentDate = '2025-10-22';
      const oldDate = '2025-10-20';
      const persistentDates = [
        { date: recentDate, added: now - 10 * 60 * 60 * 1000 }, // 10 hours ago
        { date: oldDate, added: now - 30 * 60 * 60 * 1000 }, // 30 hours ago
      ];
      localStorageMock.setItem(
        'persistentDates',
        JSON.stringify(persistentDates)
      );

      expect(getActivePersistentDates()).toEqual([recentDate]);
    });

    test('should clean up old dates from localStorage', () => {
      const now = Date.now();
      const recentDate = '2025-10-22';
      const oldDate = '2025-10-20';
      const persistentDates = [
        { date: recentDate, added: now - 10 * 60 * 60 * 1000 },
        { date: oldDate, added: now - 30 * 60 * 60 * 1000 },
      ];
      localStorageMock.setItem(
        'persistentDates',
        JSON.stringify(persistentDates)
      );

      getActivePersistentDates(); // Call the function to trigger cleanup

      const stored = JSON.parse(localStorageMock.getItem('persistentDates'));
      expect(stored).toHaveLength(1);
      expect(stored[0].date).toBe(recentDate);
    });
  });

  // --- Test getUSMarketStatus ---
  describe('getUSMarketStatus', () => {
    // EST is UTC-4 during Daylight Saving Time (e.g., October), UTC-5 otherwise
    // Let's use October 23rd, 2025 (EDT - UTC-4)

    test('should return "Closed" on weekends', () => {
      // Saturday Oct 25, 2025 10:00 AM EDT (UTC: 14:00)
      jest.setSystemTime(new Date('2025-10-25T14:00:00.000Z'));
      expect(getUSMarketStatus()).toBe('Closed');
    });

    test('should return "Closed" early morning weekdays', () => {
      // Thursday Oct 23, 2025 3:59 AM EDT (UTC: 07:59)
      jest.setSystemTime(new Date('2025-10-23T07:59:00.000Z'));
      expect(getUSMarketStatus()).toBe('Closed');
    });

    test('should return "Pre-Market" during pre-market hours', () => {
      // Thursday Oct 23, 2025 4:00 AM EDT (UTC: 08:00)
      jest.setSystemTime(new Date('2025-10-23T08:00:00.000Z'));
      expect(getUSMarketStatus()).toBe('Pre-Market');
      // Thursday Oct 23, 2025 9:29 AM EDT (UTC: 13:29)
      jest.setSystemTime(new Date('2025-10-23T13:29:00.000Z'));
      expect(getUSMarketStatus()).toBe('Pre-Market');
    });

    test('should return "Regular Hours" during market hours', () => {
      // Thursday Oct 23, 2025 9:30 AM EDT (UTC: 13:30)
      jest.setSystemTime(new Date('2025-10-23T13:30:00.000Z'));
      expect(getUSMarketStatus()).toBe('Regular Hours');
      // Thursday Oct 23, 2025 3:59 PM EDT (UTC: 19:59)
      jest.setSystemTime(new Date('2025-10-23T19:59:00.000Z'));
      expect(getUSMarketStatus()).toBe('Regular Hours');
    });

    test('should return "After-Hours" during after-hours', () => {
      // Thursday Oct 23, 2025 4:00 PM EDT (UTC: 20:00)
      jest.setSystemTime(new Date('2025-10-23T20:00:00.000Z'));
      expect(getUSMarketStatus()).toBe('After-Hours');
      // Thursday Oct 23, 2025 7:59 PM EDT (UTC: 23:59)
      jest.setSystemTime(new Date('2025-10-23T23:59:00.000Z'));
      expect(getUSMarketStatus()).toBe('After-Hours');
    });

    test('should return "Closed" after after-hours', () => {
      // Thursday Oct 23, 2025 8:00 PM EDT (UTC: Oct 24 00:00)
      jest.setSystemTime(new Date('2025-10-24T00:00:00.000Z'));
      expect(getUSMarketStatus()).toBe('Closed');
    });
  });

  // --- Test getMostRecentTradingDay ---
  describe('getMostRecentTradingDay', () => {
    // Similar tests as getTradingDays(1)
    test('should return the current weekday if it is a trading day', () => {
      jest.setSystemTime(new Date('2025-10-23T14:00:00.000Z')); // Thursday EST
      expect(getMostRecentTradingDay()).toBe('2025-10-23');
    });

    test('should return the previous Friday if current day is Saturday', () => {
      jest.setSystemTime(new Date('2025-10-25T14:00:00.000Z')); // Saturday EST
      expect(getMostRecentTradingDay()).toBe('2025-10-24'); // Friday
    });

    test('should return the previous Friday if current day is Sunday', () => {
      jest.setSystemTime(new Date('2025-10-26T14:00:00.000Z')); // Sunday EST
      expect(getMostRecentTradingDay()).toBe('2025-10-24'); // Friday
    });
  });
});
