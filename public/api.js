// public/api.js

// In api.js
function populatePricesFromCache(activityMap, priceCache) { 
    const portfolioSummary = document.getElementById('portfolio-summary');
    let totalPortfolioValue = 0; 
    activityMap.forEach((stock, key) => { 
        const row = document.querySelector(`#positions-summary-body [data-key="${key}"]`); 
        if (row) { 
            const priceToUse = priceCache.get(stock.ticker) || stock.last_price;
            if (priceToUse !== undefined && priceToUse !== null) { 
                const currentValue = stock.closingQty * priceToUse; 
                const unrealizedPL = currentValue - (stock.closingQty * stock.costBasis); 
                totalPortfolioValue += currentValue;
                if (priceCache.has(stock.ticker)) {
                    row.querySelector('.current-price').innerHTML = formatAccounting(priceToUse);
                }
                row.querySelector('.current-value').innerHTML = formatAccounting(currentValue);
                row.querySelector('.unrealized-pl').innerHTML = formatAccounting(unrealizedPL);
            } 
        } 
    }); 
    const summarySpan = portfolioSummary.querySelector('span'); 
    if (summarySpan) { 
        summarySpan.innerHTML = `<strong>${formatAccounting(totalPortfolioValue)}</strong>`;
    } 
}

async function updateAllPrices(activityMap, priceCache, isApiLimitReached, settings) {
    const portfolioSummary = document.getElementById('portfolio-summary');
    const spinnerCells = document.querySelectorAll('.current-price, .current-value, .unrealized-pl');
    if (isApiLimitReached) {
        spinnerCells.forEach(cell => { if (cell.querySelector('.loader')) { cell.innerHTML = 'API Limit'; } });
        return;
    }
    if (activityMap.size === 0 || !settings.apiKey) {
        portfolioSummary.querySelector('span').innerHTML = '<strong>$0.00</strong>';
        spinnerCells.forEach(el => { if (el.querySelector('.loader')) { el.innerHTML = 'N/A'; } });
        return;
    }
    const priceUpdateTimeout = setTimeout(() => {
        console.warn("Price update timed out after 10 seconds. Replacing spinners with '--'.");
        spinnerCells.forEach(cell => { if (cell.querySelector('.loader')) { cell.innerHTML = '--'; } });
    }, 10000);
    console.log("Fetching latest prices...");
    try {
        const tickersToFetch = [...new Set(Array.from(activityMap.values()).map(s => s.ticker))];
        const prices = await Promise.all(tickersToFetch.map(ticker => fetchStockPrice(ticker, settings)));
        clearTimeout(priceUpdateTimeout);
        const allFailed = prices.every(p => p === null);
        if (allFailed) {
            console.warn("All price fetches failed. Displaying '--'.");
            spinnerCells.forEach(cell => {
                if (cell.querySelector('.loader')) { cell.innerHTML = '--'; }
            });
            return;
        }
        tickersToFetch.forEach((ticker, index) => {
            if (prices[index] !== null) {
                priceCache.set(ticker, prices[index]);
            }
        });
        populatePricesFromCache(activityMap, priceCache);
    } catch (error) {
        clearTimeout(priceUpdateTimeout);
        console.error("An error occurred during updateAllPrices:", error);
    }
}

async function fetchStockPrice(ticker, settings) {
    // --- Primary API: Finnhub ---
    if (settings.finnhubApiKey) {
        try {
            const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${settings.finnhubApiKey}`);
            if (!r.ok) throw new Error(`Finnhub responded with status: ${r.status}`);
            const d = await r.json();
            // Finnhub returns 'c' for current price. A value of 0 often means no data.
            if (d && d.c && d.c > 0) {
                console.log(`Fetched ${ticker} from Finnhub`);
                return d.c; // Return the current price
            }
        } catch (e) {
            console.warn(`Finnhub API failed for ${ticker}:`, e.message, ". Falling back to Alpha Vantage.");
        }
    }

    // --- Backup API: Alpha Vantage ---
    if (settings.alphaVantageApiKey) {
        try {
            const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${settings.alphaVantageApiKey}`);
            const d = await r.json();
            if (d.Note && d.Note.includes("API call frequency")) {
                console.error("Alpha Vantage API Limit Reached!");
                isApiLimitReached = true;
                handleApiLimitReached();
                return null;
            }
            if (d['Global Quote'] && d['Global Quote']['05. price']) {
                console.log(`Fetched ${ticker} from Alpha Vantage (Backup)`);
                return parseFloat(d['Global Quote']['05. price']);
            }
            console.warn(`Alpha Vantage fetch failed for ${ticker}.`);
        } catch (e) {
            console.error(`Alpha Vantage API Error for ${ticker}:`, e);
        }
    }
    
    // If both fail, or no keys are provided
    return null;
}