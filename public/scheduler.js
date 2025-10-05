// public/scheduler.js

const SCHEDULED_INTERVAL_MS = 30 * 60 * 1000;
let nextApiCallTimestamp = 0;
let marketOpenCalledForDay = '', marketCloseCalledForDay = '';
let updateAt2300CalledForDay = '';
let updateAt0800CalledForDay = '';

function initializeScheduler() {
    const refreshPricesBtn = document.getElementById('refresh-prices-btn');
    const apiTimerEl = document.getElementById('api-timer');

    setInterval(() => {
        const now = new Date();
        const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const estHours = estTime.getHours();
        const estMinutes = estTime.getMinutes();
        const dayOfWeek = estTime.getDay();
        const todayStr = `${estTime.getFullYear()}-${estTime.getMonth()}-${estTime.getDate()}`;

        if (marketOpenCalledForDay !== todayStr) marketOpenCalledForDay = '';
        if (marketCloseCalledForDay !== todayStr) marketCloseCalledForDay = '';
        if (updateAt2300CalledForDay !== todayStr) updateAt2300CalledForDay = '';
        if (updateAt0800CalledForDay !== todayStr) updateAt0800CalledForDay = '';

        const isTradingDay = dayOfWeek > 0 && dayOfWeek < 6;
        const isMarketHours = isTradingDay && (estHours > 9 || (estHours === 9 && estMinutes >= 30)) && estHours < 16;
        
        let triggerUpdate = false;

        if (isMarketHours) {
            if (refreshPricesBtn.disabled === false) {
                refreshPricesBtn.disabled = true;
                refreshPricesBtn.textContent = 'Auto-Refreshing';
            }
            if (!marketOpenCalledForDay) {
                console.log("Market is open! Triggering initial price update.");
                triggerUpdate = true;
                marketOpenCalledForDay = todayStr;
                nextApiCallTimestamp = Date.now() + SCHEDULED_INTERVAL_MS;
            } else if (Date.now() >= nextApiCallTimestamp) {
                console.log("30-minute scheduled update triggered.");
                triggerUpdate = true;
            }
            let secondsRemaining = Math.max(0, Math.round((nextApiCallTimestamp - Date.now()) / 1000));
            apiTimerEl.textContent = `Next: ${new Date(secondsRemaining * 1000).toISOString().substr(14, 5)}`;
        } else {
            if (refreshPricesBtn.disabled === true && !isApiLimitReached) {
                refreshPricesBtn.disabled = false;
                refreshPricesBtn.textContent = 'Refresh Prices';
            }
            apiTimerEl.textContent = "Market Closed";
            if (isTradingDay && estHours >= 16 && !marketCloseCalledForDay) {
                console.log("Market is closed! Triggering final price update.");
                triggerUpdate = true;
                marketCloseCalledForDay = todayStr;
            }
        }
        
        if (estHours === 23 && updateAt2300CalledForDay !== todayStr) {
            console.log("Scheduled 23:00 EST update triggered.");
            fetch('/api/tasks/update-prices', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) 
            });
            triggerUpdate = true;
            updateAt2300CalledForDay = todayStr;
        }
        if (estHours === 8 && updateAt0800CalledForDay !== todayStr) {
            console.log("Scheduled 08:00 EST update triggered.");
            triggerUpdate = true;
            updateAt0800CalledForDay = todayStr;
        }

        if (triggerUpdate) {
            updateAllPrices();
            if (Date.now() >= nextApiCallTimestamp && isMarketHours) {
                nextApiCallTimestamp = Date.now() + SCHEDULED_INTERVAL_MS;
            }
        }
    }, 1000);
}