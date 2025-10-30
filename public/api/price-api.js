// /public/api/price-api.js
/**
 * @file API calls related to price fetching and caching.
 * @module api/price-api
 */

import { state } from '../state.js';
import { populatePricesFromCache, showToast } from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { handleResponse } from './api-helpers.js';

/**
 * @typedef {object} PriceData
 * @property {number|string|null} price - The fetched price ('invalid', null, or number).
 * @property {number|null} previousPrice - The previous price, if available.
 * @property {number} timestamp - The timestamp when the price was fetched or retrieved from cache.
 */

/**
 * Fetches the latest market prices for a given list of tickers and updates the price cache.
 * @async
 * @param {string} viewDate - The date for which to fetch prices (YYYY-MM-DD).
 * @param {string[]} tickersToUpdate - The specific list of tickers to fetch.
 * @returns {Promise<void>}
 */
export async function updatePricesForView(viewDate, tickersToUpdate) {
    if (!tickersToUpdate || tickersToUpdate.length === 0) {
        return;
    }

    try {
        const isToday = viewDate === getCurrentESTDateString();
        const response = await fetch('/api/utility/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersToUpdate, date: viewDate, allowLive: isToday })
        });
        const pricesData = await handleResponse(response);

        const now = Date.now();
        for (const ticker in pricesData) {
            const currentCached = state.priceCache.get(ticker);
            const previousPrice = (currentCached && typeof currentCached.price === 'number') ? currentCached.price : null;

            const newPriceValue = pricesData[ticker];
            const newPrice = (typeof newPriceValue === 'number' && newPriceValue > 0) ? newPriceValue : 'invalid';

            /** @type {PriceData} */
            const newPriceData = {
                price: newPrice,
                previousPrice: newPrice === 'invalid' ? currentCached?.previousPrice : previousPrice,
                timestamp: now
            };

            state.priceCache.set(ticker, newPriceData);
        }
    } catch (error) {
        console.error("Error inside updatePricesForView:", error);
        // @ts-ignore
        showToast(`Price update failed: ${error.message}`, 'error');
        tickersToUpdate.forEach(ticker => {
             const existingPrevious = state.priceCache.get(ticker)?.previousPrice;
             // @ts-ignore
             state.priceCache.set(ticker, { price: 'error', previousPrice: existingPrevious ?? null, timestamp: Date.now() });
        });
    }
}


/**
 * Manually triggers a price update for the current view and then re-renders the price-dependent UI elements.
 * @async
 * @returns {Promise<void>}
 */
export async function updateAllPrices() {
    let tickersToUpdate = [];
    let dateForUpdate = state.currentView.value;

     if (state.currentView.type === 'dashboard' && state.dashboardOpenLots.length > 0) {
        tickersToUpdate = [...new Set(state.dashboardOpenLots.map(lot => lot.ticker))];
        dateForUpdate = getCurrentESTDateString(); 
    }
    else if (state.currentView.type === 'date' && state.activityMap.size > 0) {
        tickersToUpdate = [...new Set(Array.from(state.activityMap.values()).map(lot => lot.ticker))];
    } else if (state.currentView.type === 'research') {
        const journalTickers = state.journalEntries?.openEntries ? state.journalEntries.openEntries.map(entry => entry.ticker) : [];
        const recommendedTickers = state.researchWatchlistItems ? state.researchWatchlistItems.map(item => item.ticker) : [];
        tickersToUpdate = [...new Set([...journalTickers, ...recommendedTickers])];
        dateForUpdate = getCurrentESTDateString(); 
    }

    if(tickersToUpdate.length > 0 && dateForUpdate) {
        showToast('Refreshing prices...', 'info', 2000);
        await updatePricesForView(dateForUpdate, tickersToUpdate); 

         if (state.currentView.type === 'dashboard') {
             const { renderDashboardPage } = await import('../ui/renderers/_dashboard_render.js');
             await renderDashboardPage();
         }
         else if (state.currentView.type === 'date') {
            populatePricesFromCache(state.activityMap, state.priceCache);
        } else if (state.currentView.type === 'research') {
             const researchModule = await import('../event-handlers/_research.js');
             if (researchModule.loadResearchPage) {
                 await researchModule.loadResearchPage();
             }
        }
    } else {
         showToast('No prices to refresh for the current view.', 'info');
    }
}
