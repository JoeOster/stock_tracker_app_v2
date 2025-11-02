// /public/api/reporting-api.js
/**
 * @file API calls related to reports and snapshots.
 * @module api/reporting-api
 */

import { handleResponse } from './api-helpers.js';

/**
 * Fetches the daily performance summary for a given date and account holder.
 * @async
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<object>} A promise that resolves to the performance data.
 */
export async function fetchDailyPerformance(date, holderId) {
    const response = await fetch(`/api/reporting/daily_performance/${date}?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily transactions and end-of-day positions for a given date and account holder.
 * @async
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<{dailyTransactions: any[], endOfDayPositions: any[]}>} A promise that resolves to an object containing dailyTransactions and endOfDayPositions.
 */
export async function fetchPositions(date, holderId) {
    const response = await fetch(`/api/reporting/positions/${date}?holder=${holderId}`);
    const data = await handleResponse(response);
    // Add a check for the expected structure
    if (!data || !Array.isArray(data.dailyTransactions) || !Array.isArray(data.endOfDayPositions)) {
        console.error("Received invalid data structure for position data:", data);
        throw new Error("Invalid data structure received for position data.");
    }
    return data;
}

// --- REMOVED: fetchSnapshots function ---