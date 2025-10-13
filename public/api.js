// public/api.js
import { state } from './state.js';
import { populatePricesFromCache, getCurrentESTDateString } from './ui/helpers.js';

/**
 * Fetches the latest market prices for a given list of tickers and updates the price cache.
 * It intelligently decides whether to fetch live data or rely on cached historical data based on the date.
 * @param {string} viewDate - The date for which to fetch prices.
 * @param {string[]} tickersToUpdate - The specific list of tickers to fetch.
 * @returns {Promise<void>}
 */
export async function updatePricesForView(viewDate, tickersToUpdate) {
    if (!tickersToUpdate || tickersToUpdate.length === 0) {
        return; // Nothing to fetch
    }

    // Show spinners for all relevant rows before fetching
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


        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const prices = await response.json();

        // Update the cache with the batch-fetched prices
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
 * @throws {Error} If the server response is not ok.
 */
export async function fetchPendingOrders(holderId) {
    const response = await fetch(`/api/orders/pending?holder=${holderId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch pending orders from the server.');
    }
    return await response.json();
}

/**
 * Fetches all 'UNREAD' notifications for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of notification objects.
 * @throws {Error} If the server response is not ok.
 */
export async function fetchAlerts(holderId) {
    const response = await fetch(`/api/orders/notifications?holder=${holderId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch alerts.');
    }
    return await response.json();
}

/**
 * Fetches the daily performance summary for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string} holderId - The ID of the account holder.
 * @returns {Promise<object>} A promise that resolves to the performance data.
 * @throws {Error} If the server response is not ok.
 */
export async function fetchDailyPerformance(date, holderId) {
    const response = await fetch(`/api/reporting/daily_performance/${date}?holder=${holderId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch daily performance data.');
    }
    return await response.json();
}

/**
 * Fetches the daily transactions and end-of-day positions for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string} holderId - The ID of the account holder.
 * @returns {Promise<{dailyTransactions: any[], endOfDayPositions: any[]}>} A promise that resolves to an object containing dailyTransactions and endOfDayPositions.
 * @throws {Error} If the server response is not ok or the data structure is invalid.
 */
export async function fetchPositions(date, holderId) {
    const response = await fetch(`/api/reporting/positions/${date}?holder=${holderId}`);
    if (!response.ok) {
        throw new Error(`Server returned status ${response.status} for position data.`);
    }
    const data = await response.json();
    if (!data || !data.dailyTransactions || !data.endOfDayPositions) {
        throw new Error("Invalid data structure received for position data.");
    }
    return data;
}

/**
 * Fetches all account value snapshots for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of snapshot objects.
 * @throws {Error} If the server response is not ok.
 */
export async function fetchSnapshots(holderId) {
    const response = await fetch(`/api/utility/snapshots?holder=${holderId}`);
    if (!response.ok) {
        throw new Error('Could not fetch snapshots.');
    }
    return await response.json();
}