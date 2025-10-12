// public/api.js
import { state } from './app-main.js';
import { populatePricesFromCache } from './ui/helpers.js';

/**
 * Fetches the latest market prices for all unique tickers in the current view and updates the price cache.
 * It shows spinners in the price cells before fetching.
 * @param {string} viewDate - The date for which to fetch historical prices if needed.
 * @param {Map<string, object>} activityMap - A map of open positions for the current view.
 * @param {Map<string, number|string>} priceCache - The application's price cache to update.
 * @returns {Promise<void>}
 */
export async function updatePricesForView(viewDate, activityMap, priceCache) {
    const allTickersInView = [...new Set(Array.from(activityMap.values()).map(lot => lot.ticker))];
    if (allTickersInView.length === 0) {
        return; // Nothing to fetch
    }

    // Show spinners for all relevant rows before fetching
    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`tr[data-key="${key}"]`);
        if (row) {
            const priceCell = row.querySelector('.current-price');
            if (priceCell) priceCell.innerHTML = '<div class="loader"></div>';
        }
    });

    try {
        const response = await fetch('/api/utility/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: allTickersInView, date: viewDate })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const prices = await response.json();

        // Update the cache with the batch-fetched prices
        for (const ticker in prices) {
            priceCache.set(ticker, prices[ticker]);
        }

    } catch (error) {
        console.error("An error occurred during batch price update:", error);
    }
}

/**
 * Manually triggers a price update for the current view and then re-renders the price-dependent UI elements.
 * This is typically used by a "Refresh Prices" button.
 * @param {Map<string, object>} activityMap - A map of open positions for the current view.
 * @param {Map<string, number|string>} priceCache - The application's price cache.
 * @returns {Promise<void>}
 */
export async function updateAllPrices(activityMap, priceCache) {
    await updatePricesForView(state.currentView.value, activityMap, priceCache);
    // After fetching, we must explicitly call the populator
    populatePricesFromCache(activityMap, priceCache);
}