// /public/ui/datetime.js
/**
 * @file Contains all UI helper functions related to dates and times.
 * @module ui/datetime
 */

/**
 * Gets the current date as a string in 'YYYY-MM-DD' format for the America/New_York timezone.
 * @returns {string} The current date string.
 */
export function getCurrentESTDateString() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Gets an array of the last N trading days (Mon-Fri) in 'YYYY-MM-DD' format.
 * @param {number} c - The number of trading days to retrieve.
 * @returns {string[]} An array of date strings.
 */
export function getTradingDays(c) {
    let d = [];
    let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z');
    while (d.length < c) {
        const dow = cd.getUTCDay();
        if (dow > 0 && dow < 6) { d.push(cd.toISOString().split('T')[0]); }
        cd.setUTCDate(cd.getUTCDate() - 1);
    }
    return d.reverse();
}

/**
 * Retrieves an array of date strings that have been persisted in localStorage within the last 24 hours.
 * @returns {string[]} An array of active persistent date strings.
 */
export function getActivePersistentDates() {
    let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeDates = persistentDates.filter(d => d.added > twentyFourHoursAgo);
    if (activeDates.length < persistentDates.length) { localStorage.setItem('persistentDates', JSON.stringify(activeDates)); }
    return activeDates.map(d => d.date);
}

/**
 * Gets the current status of the US stock market.
 * @returns {'Pre-Market' | 'Regular Hours' | 'After-Hours' | 'Closed'} The current market status.
 */
export function getUSMarketStatus() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const dayOfWeek = estTime.getDay();
    const hour = estTime.getHours();
    const minute = estTime.getMinutes();

    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;
    if (!isWeekday) {
        return 'Closed';
    }

    if (hour < 4) return 'Closed';
    if (hour < 9 || (hour === 9 && minute < 30)) return 'Pre-Market';
    if (hour < 16) return 'Regular Hours';
    if (hour < 20) return 'After-Hours';

    return 'Closed';
}

/**
 * Gets the date string for the most recent trading day (Mon-Fri).
 * @returns {string} The date string in YYYY-MM-DD format.
 */
export function getMostRecentTradingDay() {
    let checkDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    let dayOfWeek = checkDate.getDay();

    if (dayOfWeek === 0) {
        checkDate.setDate(checkDate.getDate() - 2);
    }
    else if (dayOfWeek === 6) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return checkDate.toLocaleDateString('en-CA');
}