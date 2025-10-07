// api.js - v2.3
async function updatePricesForView(viewDate, activityMap, priceCache) {
    const allTickersInView = [...new Set(Array.from(activityMap.values()).map(lot => lot.ticker))];
    if (allTickersInView.length === 0) {
        populatePricesFromCache(activityMap, priceCache);
        return;
    }

    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`#positions-summary-body tr[data-key="${key}"]`);
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

        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        const prices = await response.json();

        for (const ticker in prices) {
            priceCache.set(ticker, prices[ticker]);
        }
    } catch (error) {
        console.error("An error occurred during batch price update:", error);
    } finally {
        populatePricesFromCache(activityMap, priceCache);
    }
}

async function updateAllPrices(activityMap, priceCache, currentView) {
    await updatePricesForView(currentView.value, activityMap, priceCache);
}