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
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  });
}

/**
 * Gets an array containing only the most recent trading day (Mon-Fri) in 'YYYY-MM-DD' format.
 * @param {number} [c=1] - The number of trading days to retrieve (modified to default to 1).
 * @returns {string[]} An array containing a single date string.
 */
export function getTradingDays() {
  // Default c to 1
  // --- MODIFIED LOGIC ---
  let d = [];
  let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z'); // Start with today EST
  // Find the most recent trading day (today or previous days)
  while (d.length < 1) {
    // Only loop until one day is found
    const dow = cd.getUTCDay(); // Day of week (0=Sun, 6=Sat)
    if (dow > 0 && dow < 6) {
      // It's a weekday
      d.push(cd.toISOString().split('T')[0]);
    }
    if (d.length < 1) {
      // If we haven't found a trading day yet, go back one day
      cd.setUTCDate(cd.getUTCDate() - 1);
    }
  }
  // No need to reverse since we only get one day
  return d;
  // --- END MODIFIED LOGIC ---

  /* // Original logic for multiple days:
    let d = [];
    let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z');
    while (d.length < c) {
        const dow = cd.getUTCDay();
        if (dow > 0 && dow < 6) { d.push(cd.toISOString().split('T')[0]); }
        cd.setUTCDate(cd.getUTCDate() - 1);
    }
    return d.reverse();
    */
}

/**
 * Retrieves an array of date strings that have been persisted in localStorage within the last 24 hours.
 * @returns {string[]} An array of active persistent date strings.
 */
export function getActivePersistentDates() {
  let persistentDates =
    JSON.parse(localStorage.getItem('persistentDates')) || [];
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const activeDates = persistentDates.filter(
    (d) => d.added > twentyFourHoursAgo
  );
  if (activeDates.length < persistentDates.length) {
    localStorage.setItem('persistentDates', JSON.stringify(activeDates));
  }
  return activeDates.map((d) => d.date);
}

/**
 * Gets the current status of the US stock market.
 * @returns {'Pre-Market' | 'Regular Hours' | 'After-Hours' | 'Closed'} The current market status.
 */
export function getUSMarketStatus() {
  const now = new Date();
  const estTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
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
 * This function essentially does the same as the modified getTradingDays(1).
 * Can be kept for clarity or potentially removed if getTradingDays(1) is used instead.
 * @returns {string} The date string in YYYY-MM-DD format.
 */
export function getMostRecentTradingDay() {
  let checkDate = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  let dayOfWeek = checkDate.getDay();

  // Loop backward until we find a weekday
  while (dayOfWeek === 0 || dayOfWeek === 6) {
    // 0 = Sunday, 6 = Saturday
    checkDate.setDate(checkDate.getDate() - 1);
    dayOfWeek = checkDate.getDay();
  }

  return checkDate.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD
}
