// public/scheduler.js
import { updatePricesForView } from './api.js';
import { populatePricesFromCache } from './ui/helpers.js';
// --- FIX: Add import for getCurrentESTDateString ---
import { getUSMarketStatus, getCurrentESTDateString } from './ui/datetime.js'; // <-- Added getCurrentESTDateString
import { state } from './state.js';

let nextApiCallTimestamp = 0;

/**
 * Initializes the price update scheduler.
 * @param {import('./state.js').AppState} appState - The application state.
 */
export function initializeScheduler(appState) {
    // --- FIX: Cast to HTMLButtonElement ---
    const refreshPricesBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('refresh-prices-btn'));
    const apiTimerEl = document.getElementById('api-timer');

    if (!apiTimerEl) {
        console.error("API Timer element not found.");
        return;
    }

    setInterval(async () => {
        const needsLiveUpdates = (appState.currentView.type === 'date' && appState.activityMap.size > 0) ||
                                 (appState.currentView.type === 'journal' && appState.journalEntries?.openEntries?.length > 0);

        if (!needsLiveUpdates) {
            apiTimerEl.textContent = "Auto-refresh paused";
            if (refreshPricesBtn) refreshPricesBtn.disabled = false; // <-- Access disabled
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
            if (refreshPricesBtn && !refreshPricesBtn.disabled) { // <-- Access disabled
                refreshPricesBtn.disabled = true; // <-- Access disabled
                refreshPricesBtn.textContent = 'Auto-Refreshing';
            }
            let secondsRemaining = Math.max(0, Math.round((nextApiCallTimestamp - Date.now()) / 1000));
            const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
            const seconds = (secondsRemaining % 60).toString().padStart(2, '0');
            apiTimerEl.innerHTML = ` Next: <span class="positive">${minutes}:${seconds}</span>`;
        } else {
            if (refreshPricesBtn && refreshPricesBtn.disabled) { // <-- Access disabled
                refreshPricesBtn.disabled = false; // <-- Access disabled
                refreshPricesBtn.textContent = 'Refresh Prices';
            }
            apiTimerEl.textContent = marketStatus;
        }

        if (Date.now() >= nextApiCallTimestamp) {
            console.log(`[${new Date().toISOString()}] Scheduler triggered update for on-screen tickers...`);

            let tickersToUpdate = [];
            // --- FIX: Use imported getCurrentESTDateString ---
            let dateForUpdate = appState.currentView.value || getCurrentESTDateString();

             if (appState.currentView.type === 'date' && appState.activityMap.size > 0) {
                 tickersToUpdate = [...new Set(Array.from(appState.activityMap.values()).map(lot => lot.ticker))];
                 dateForUpdate = appState.currentView.value; // Keep specific date for daily view
            } else if (appState.currentView.type === 'journal' && appState.journalEntries?.openEntries?.length > 0) {
                 tickersToUpdate = [...new Set(appState.journalEntries.openEntries.map(entry => entry.ticker))];
                 // --- FIX: Use imported getCurrentESTDateString ---
                 dateForUpdate = getCurrentESTDateString(); // Journal uses current date
            }

            if (tickersToUpdate.length > 0 && dateForUpdate) {
                try {
                    await updatePricesForView(dateForUpdate, tickersToUpdate);

                    if (appState.currentView.type === 'date') {
                        populatePricesFromCache(appState.activityMap, appState.priceCache);
                    } else if (appState.currentView.type === 'journal') {
                         console.log("TODO: Need to call function to populate journal prices after update.");
                         const { loadJournalPage } = await import('./event-handlers/_journal.js');
                         await loadJournalPage();
                    }
                } catch (error) {
                    console.error("Scheduler failed during price update:", error);
                    apiTimerEl.innerHTML = `<span class="negative">Update Failed</span>`;
                }
            } else {
                 console.log(`[${new Date().toISOString()}] Scheduler: No tickers to update for current view.`);
            }

            nextApiCallTimestamp = Date.now() + currentIntervalMs;
        }
    }, 5000);
}