// public/api.js
import { populatePricesFromCache } from './ui/renderers.js';
import { state } from './app-main.js';

// --- Main function for fetching prices ---
export async function updatePricesForView(viewDate, activityMap, priceCache) {
    const allTickersInView = [...new Set(Array.from(activityMap.values()).map(lot => lot.ticker))];
    if (allTickersInView.length === 0) {
        populatePricesFromCache(activityMap, priceCache); // Call to clear out old prices if any
        return;
    }

    // Show spinners for all relevant rows before fetching
    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`#positions-summary-body tr[data-key="${key}"]`);
        if (row) {
            const priceCell = row.querySelector('.current-price');
            if (priceCell) priceCell.innerHTML = '<div class="loader"></div>';
        }
    });

    try {
        // Make a single batch request to the server
        const response = await fetch('/api/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: allTickersInView, date: viewDate })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const prices = await response.json(); // e.g., { "AAPL": 150.5, "MSFT": 300.2 }

        // Update the cache with the batch-fetched prices
        for (const ticker in prices) {
            priceCache.set(ticker, prices[ticker]);
        }

    } catch (error) {
        console.error("An error occurred during batch price update:", error);
    } finally {
        // Always repopulate to replace spinners with prices or '--' on failure
        populatePricesFromCache(activityMap, priceCache);
    }
}


// This function is used by the manual "Refresh Prices" button
export async function updateAllPrices(activityMap, priceCache) {
    await updatePricesForView(state.currentView.value, activityMap, priceCache);
}