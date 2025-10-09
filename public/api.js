// public/api.js - v2.13 (Corrected Data Flow)
import { populatePricesFromCache } from './ui/renderers.js';
import { state } from './app-main.js';

export async function updatePricesForView(viewDate, activityMap, priceCache) {
    const allTickersInView = [...new Set(Array.from(activityMap.values()).map(lot => lot.ticker))];
    if (allTickersInView.length === 0) {
        populatePricesFromCache(activityMap, priceCache);
        return;
    }

    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`tr[data-key="${key}"]`);
        if (row) {
            const priceCell = row.querySelector('.current-price');
            if (priceCell) priceCell.innerHTML = '<div class="loader"></div>';
        }
    });

    try {
        const response = await fetch('/api/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: allTickersInView, date: viewDate })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const prices = await response.json();

        // THIS IS THE MISSING LOGIC
        for (const ticker in prices) {
            priceCache.set(ticker, prices[ticker]);
        }

    } catch (error) {
        console.error("An error occurred during batch price update:", error);
    }
}

// This function is used by the manual "Refresh Prices" button
export async function updateAllPrices(activityMap, priceCache) {
    await updatePricesForView(state.currentView.value, activityMap, priceCache);
    populatePricesFromCache(activityMap, priceCache); // Ensure UI is populated after manual refresh
}

