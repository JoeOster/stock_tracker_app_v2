// public/scheduler.js
/**
 * @file Manages the application's price update scheduler.
 * @module scheduler
 */

import { updatePricesForView } from './api.js';
import { populatePricesFromCache } from './ui/helpers.js';
import { getUSMarketStatus, getCurrentESTDateString } from './ui/datetime.js';
import { state } from './state.js';

/** @type {number} */
let nextApiCallTimestamp = 0;

/**
 * The main scheduler function that runs on an interval.
 * @param {import('./state.js').AppState} appState - The application state.
 * @returns {Promise<void>}
 */
async function runScheduler(appState) {
    const refreshPricesBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('refresh-prices-btn'));
    const apiTimerEl = document.getElementById('api-timer');

    if (!apiTimerEl) {
        console.error("API Timer element not found.");
        return;
    }

    // Determine if the current view needs live updates
    const needsLiveUpdates = (appState.currentView.type === 'date' && appState.activityMap.size > 0) ||
                             (appState.currentView.type === 'research'); // Research tab always updates

    if (!needsLiveUpdates) {
        apiTimerEl.textContent = "Auto-refresh paused";
        if (refreshPricesBtn) {
            refreshPricesBtn.disabled = false;
            refreshPricesBtn.textContent = 'Refresh Prices';
        }
        nextApiCallTimestamp = 0;
        return;
    }

    const marketStatus = getUSMarketStatus();
    const isMarketHours = (marketStatus === 'Regular Hours');

    const marketHoursIntervalMinutes = appState.settings.marketHoursInterval || 2;
    const afterHoursIntervalMinutes = appState.settings.afterHoursInterval || 15;

    let currentIntervalMinutes = isMarketHours ? marketHoursIntervalMinutes : afterHoursIntervalMinutes;
    let currentIntervalMs = currentIntervalMinutes * 60 * 1000;

    if (isMarketHours) {
        if (refreshPricesBtn && !refreshPricesBtn.disabled) {
            refreshPricesBtn.disabled = true;
            refreshPricesBtn.textContent = 'Auto-Refreshing';
        }
        let secondsRemaining = Math.max(0, Math.round((nextApiCallTimestamp - Date.now()) / 1000));
        const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
        const seconds = (secondsRemaining % 60).toString().padStart(2, '0');
        apiTimerEl.innerHTML = ` Next: <span class="positive">${minutes}:${seconds}</span>`;
    } else {
        if (refreshPricesBtn && refreshPricesBtn.disabled) {
            refreshPricesBtn.disabled = false;
            refreshPricesBtn.textContent = 'Refresh Prices';
        }
        apiTimerEl.textContent = marketStatus;
    }

    if (Date.now() >= nextApiCallTimestamp) {
        console.log(`[${new Date().toISOString()}] Scheduler triggered update for on-screen tickers...`);

        let tickersToUpdate = [];
        let dateForUpdate = appState.currentView.value || getCurrentESTDateString();

         if (appState.currentView.type === 'date' && appState.activityMap.size > 0) {
             tickersToUpdate = [...new Set(Array.from(appState.activityMap.values()).map(lot => lot.ticker))];
             dateForUpdate = appState.currentView.value; // Keep specific date for daily view
        } else if (appState.currentView.type === 'research') {
             const journalTickers = appState.journalEntries?.openEntries ? appState.journalEntries.openEntries.map(entry => entry.ticker) : [];
             const recommendedTickers = appState.researchWatchlistItems ? appState.researchWatchlistItems.map(item => item.ticker) : [];
             tickersToUpdate = [...new Set([...journalTickers, ...recommendedTickers])];
             dateForUpdate = getCurrentESTDateString(); // Research uses current date
        }

        if (tickersToUpdate.length > 0 && dateForUpdate) {
            try {
                await updatePricesForView(dateForUpdate, tickersToUpdate);

                if (appState.currentView.type === 'date') {
                    populatePricesFromCache(appState.activityMap, appState.priceCache);
                } else if (appState.currentView.type === 'research') {
                     // Re-load the research page to update all components (journal and recommended trades)
                     const { loadResearchPage } = await import('./event-handlers/_research.js');
                     await loadResearchPage();
                }
            } catch (error) {
                console.error("Scheduler failed during price update:", error);
                apiTimerEl.innerHTML = `<span class="negative">Update Failed</span>`;
            }
        } else {
             // console.log(`[${new Date().toISOString()}] Scheduler: No tickers to update for current view.`);
        }

        nextApiCallTimestamp = Date.now() + currentIntervalMs;
    }
}

/**
 * Initializes the price update scheduler.
 * @param {import('./state.js').AppState} appState - The application state.
 * @returns {void}
 */
export function initializeScheduler(appState) {
    setInterval(() => runScheduler(appState), 5000); // Check every 5 seconds
}