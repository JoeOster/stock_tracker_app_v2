// public/scheduler.js
import { updatePricesForView } from './api.js';
import { populatePricesFromCache, getUSMarketStatus } from './ui/helpers.js';

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
        let currentIntervalMinutes = isMarketHours ? (state.settings.marketHoursInterval || 2) : (state.settings.afterHoursInterval || 15);
        let currentIntervalMs = currentIntervalMinutes * 60 * 1000;

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

        if (Date.now() >= nextApiCallTimestamp) {
            console.log("Scheduler triggered update for on-screen tickers...");
            
            const tickersToUpdate = [...new Set(Array.from(state.activityMap.values()).map(lot => lot.ticker))];
            
            await updatePricesForView(state.currentView.value, tickersToUpdate);
            populatePricesFromCache(state.activityMap, state.priceCache);
            
            nextApiCallTimestamp = Date.now() + currentIntervalMs;
        }
    }, 5000);
}