// in public/scheduler.js
import { updatePricesForView } from './api.js';
import { populatePricesFromCache, getUSMarketStatus } from './ui/helpers.js';

/**
 * Timestamp for the next scheduled API call. This is used to control the refresh rate.
 * @type {number}
 */
let nextApiCallTimestamp = 0;

/**
 * Initializes a scheduler that periodically checks and updates stock prices based on market hours.
 * The scheduler runs every 5 seconds but only triggers an API call when the defined interval has passed.
 * @param {import('./app-main.js').AppState} state - The main application state object.
 * @returns {void}
 */
export function initializeScheduler(state) {
    const refreshPricesBtn = /** @type {HTMLButtonElement} */ (document.getElementById('refresh-prices-btn'));
    const apiTimerEl = document.getElementById('api-timer');

    setInterval(async () => {
        // Pause the scheduler if not on the main date view or if there are no open positions.
        if (state.currentView.type !== 'date' || state.activityMap.size === 0) {
            apiTimerEl.textContent = "Auto-refresh paused";
            if (refreshPricesBtn) refreshPricesBtn.disabled = false;
            return;
        }

        const marketStatus = getUSMarketStatus();
        const isMarketHours = (marketStatus === 'Regular Hours');

        let triggerUpdate = false;
        // Determine the refresh interval based on market status and user settings.
        let currentIntervalMinutes = isMarketHours ? 2 : 15; // Defaulting to 2 and 15
        if (state.settings) {
            currentIntervalMinutes = isMarketHours ? state.settings.marketHoursInterval : state.settings.afterHoursInterval;
        }
        let currentIntervalMs = currentIntervalMinutes * 60 * 1000;

        // Check if the current time has passed the next scheduled update time.
        if (Date.now() >= nextApiCallTimestamp) {
            triggerUpdate = true;
        }

        // Update the UI timer display.
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

        // If it's time to update, fetch prices and reset the timer.
        if (triggerUpdate) {
            console.log("Scheduler triggered update...");
            const viewDate = state.currentView.value;
            await updatePricesForView(viewDate, state.activityMap, state.priceCache);
            
            populatePricesFromCache(state.activityMap, state.priceCache);
            
            // Set the timestamp for the next API call.
            nextApiCallTimestamp = Date.now() + currentIntervalMs;
        }
    }, 5000); // The interval check runs every 5 seconds.
}