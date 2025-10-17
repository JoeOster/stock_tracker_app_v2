// public/api.js
// Version 0.1.21
/**
 * @file This file centralizes all client-side API (fetch) calls to the server.
 * @module api
 */
import { state } from './state.js';
import { populatePricesFromCache, getCurrentESTDateString } from './ui/helpers.js';
import { renderLedgerPage } from './ui/renderers/_ledger.js';

/**
 * A helper function to handle fetch responses, throwing an error with a server message if not ok.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<any>} A promise that resolves to the JSON body of the response.
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server responded with status: ${response.status}` }));
        throw new Error(errorData.message || 'An unknown error occurred.');
    }
    return response.json();
}

/**
 * Fetches the latest transactions and re-renders the ledger view.
 * @returns {Promise<void>}
 */
export async function refreshLedger() {
    try {
        const res = await fetch(`/api/transactions?holder=${state.selectedAccountHolderId}`);
        state.transactions = await handleResponse(res);
        renderLedgerPage(state.transactions, state.ledgerSort);
    } catch (error) { 
        console.error("Failed to refresh ledger:", error); 
        renderLedgerPage([], state.ledgerSort);
    }
}


/**
 * Fetches the latest market prices for a given list of tickers and updates the price cache.
 * @param {string} viewDate - The date for which to fetch prices.
 * @param {string[]} tickersToUpdate - The specific list of tickers to fetch.
 * @returns {Promise<void>}
 */
export async function updatePricesForView(viewDate, tickersToUpdate) {
    if (!tickersToUpdate || tickersToUpdate.length === 0) return;

    state.activityMap.forEach((lot, key) => {
        if (tickersToUpdate.includes(lot.ticker)) {
            const row = document.querySelector(`tr[data-key="${key}"]`);
            if (row) {
                const priceCell = row.querySelector('.current-price');
                if (priceCell) priceCell.innerHTML = '<div class="loader"></div>';
            }
        }
    });

    try {
        const isToday = viewDate === getCurrentESTDateString();
        const response = await fetch('/api/utility/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersToUpdate, date: viewDate, allowLive: isToday })
        });
        const prices = await handleResponse(response);
        for (const ticker in prices) {
            state.priceCache.set(ticker, prices[ticker]);
        }
    } catch (error) {
        console.error("An error occurred during batch price update:", error);
    }
}


/**
 * Manually triggers a price update for the current view and then re-renders the price-dependent UI elements.
 * @returns {Promise<void>}
 */
export async function updateAllPrices() {
    const tickersToUpdate = [...new Set(Array.from(state.activityMap.values()).map(lot => lot.ticker))];
    await updatePricesForView(state.currentView.value, tickersToUpdate);
    populatePricesFromCache(state.activityMap, state.priceCache);
}

/**
 * Fetches all active pending orders for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of pending order objects.
 */
export async function fetchPendingOrders(holderId) {
    const response = await fetch(`/api/orders/pending?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches all 'UNREAD' notifications for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of notification objects.
 */
export async function fetchAlerts(holderId) {
    const response = await fetch(`/api/orders/notifications?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily performance summary for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string} holderId - The ID of the account holder.
 * @returns {Promise<object>} A promise that resolves to the performance data.
 */
export async function fetchDailyPerformance(date, holderId) {
    const response = await fetch(`/api/reporting/daily_performance/${date}?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily transactions and end-of-day positions for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string} holderId - The ID of the account holder.
 * @returns {Promise<{dailyTransactions: any[], endOfDayPositions: any[]}>} A promise that resolves to an object containing dailyTransactions and endOfDayPositions.
 */
export async function fetchPositions(date, holderId) {
    const response = await fetch(`/api/reporting/positions/${date}?holder=${holderId}`);
    const data = await handleResponse(response);
    if (!data || !data.dailyTransactions || !data.endOfDayPositions) {
        throw new Error("Invalid data structure received for position data.");
    }
    return data;
}

/**
 * Fetches all account value snapshots for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of snapshot objects.
 */
export async function fetchSnapshots(holderId) {
    const response = await fetch(`/api/utility/snapshots?holder=${holderId}`);
    return handleResponse(response);
}