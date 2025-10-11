// in public/scheduler.js
import { updatePricesForView } from './api.js';
import { populatePricesFromCache, getUSMarketStatus } from './ui/helpers.js'; // Import the new function

let nextApiCallTimestamp = 0;

export function initializeScheduler(state) {
    const refreshPricesBtn = document.getElementById('refresh-prices-btn');
    const apiTimerEl = document.getElementById('api-timer');

    setInterval(async () => {
        if (state.currentView.type !== 'date' || state.activityMap.size === 0) {
            apiTimerEl.textContent = "Auto-refresh paused";
            if (refreshPricesBtn) refreshPricesBtn.disabled = false;
            return;
        }

        const marketStatus = getUSMarketStatus();
        const isMarketHours = (marketStatus === 'Regular Hours');

        let triggerUpdate = false;
        let currentIntervalMinutes = isMarketHours ? 2 : 15; // Defaulting to 2 and 15
        if (state.settings) {
            currentIntervalMinutes = isMarketHours ? state.settings.marketHoursInterval : state.settings.afterHoursInterval;
        }
        let currentIntervalMs = currentIntervalMinutes * 60 * 1000;

        if (Date.now() >= nextApiCallTimestamp) {
            triggerUpdate = true;
        }

        if (isMarketHours) {
            if (refreshPricesBtn && !refreshPricesBtn.disabled) {
                refreshPricesBtn.disabled = true;
                refreshPricesBtn.textContent = 'Auto-Refreshing';
            }
            let secondsRemaining = Math.max(0, Math.round((nextApiCallTimestamp - Date.now()) / 1000));
            apiTimerEl.innerHTML = `Next: <span class="positive">${new Date(secondsRemaining * 1000).toISOString().substr(14, 5)}</span>`;
        } else {
             if (refreshPricesBtn && refreshPricesBtn.disabled) {
                refreshPricesBtn.disabled = false;
                refreshPricesBtn.textContent = 'Refresh Prices';
            }
            apiTimerEl.textContent = marketStatus;
        }

        if (triggerUpdate) {
            console.log("Scheduler triggered update...");
            const viewDate = state.currentView.value;
            await updatePricesForView(viewDate, state.activityMap, state.priceCache);
            
            populatePricesFromCache(state.activityMap, state.priceCache);
            
            nextApiCallTimestamp = Date.now() + currentIntervalMs;
        }
    }, 5000); // The interval runs every 5 seconds
}