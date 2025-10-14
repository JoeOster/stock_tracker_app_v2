// services/priceService.js
const fetch = require('node-fetch');
const Bottleneck = require('bottleneck');

const API_KEY = process.env.FINNHUB_API_KEY;
const API_CALLS_PER_MINUTE = parseInt(process.env.API_CALLS_PER_MINUTE, 10) || 60;
const CACHE_EXPIRATION_MS = 60 * 1000; // Cache prices for 1 minute

const priceCache = new Map();
const getTimestamp = () => new Date().toISOString();

// Initialize the new rate limiter
const limiter = new Bottleneck({
    reservoir: API_CALLS_PER_MINUTE,
    reservoirRefreshAmount: API_CALLS_PER_MINUTE,
    reservoirRefreshInterval: 60 * 1000,
    maxConcurrent: 2 // Max 2 API calls at the same time
});

// FIX: Add a disconnect function to stop the limiter's timers
const disconnect = () => {
    limiter.disconnect();
};

async function fetchSinglePrice(ticker) {
    try {
        if (!API_KEY) throw new Error("API key not configured on server.");
        const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
        console.log(`[${getTimestamp()}] [Price Service] Submitting request for ${ticker}`);
        const apiRes = await fetch(url);
        if (apiRes.ok) {
            const data = await apiRes.json();
            console.log(`[${getTimestamp()}] [Price Service] Received data for ${ticker}: ${JSON.stringify(data)}`);
            if (data && data.c > 0) return data.c;
            console.warn(`[${getTimestamp()}] [Price Service Warning] Ticker '${ticker}' returned a null or zero price.`);
            return 'invalid';
        }
        console.error(`[${getTimestamp()}] [Price Service Error] API call for ${ticker} failed with status: ${apiRes.status}`);
        return null;
    } catch (error) {
        console.error(`[${getTimestamp()}] [Price Service Error] Error fetching price for ${ticker}:`, error.message);
        return null;
    }
}

/**
 * Gets prices for a list of tickers, utilizing a cache and a priority-based, rate-limited queue.
 * @param {string[]} tickers - An array of ticker symbols.
 * @param {number} [priority=5] - The priority of the job (1-9, with 1 being highest).
 * @returns {Promise<{[ticker: string]: {price: number|string|null, timestamp: number}}>}
 */
async function getPrices(tickers, priority = 5) {
    const uniqueTickers = [...new Set(tickers)];
    const results = {};
    const tickersToFetch = [];
    const now = Date.now();

    for (const ticker of uniqueTickers) {
        if (priceCache.has(ticker)) {
            const cached = priceCache.get(ticker);
            if (now - cached.timestamp < CACHE_EXPIRATION_MS) {
                results[ticker] = cached;
            } else {
                tickersToFetch.push(ticker);
            }
        } else {
            tickersToFetch.push(ticker);
        }
    }

    if (tickersToFetch.length > 0) {
        const newCacheTimestamp = Date.now();
        // Schedule all fetches with the specified priority
        const fetchPromises = tickersToFetch.map(ticker =>
            limiter.schedule({ priority }, () => fetchSinglePrice(ticker))
        );

        const prices = await Promise.all(fetchPromises);
        
        tickersToFetch.forEach((ticker, index) => {
            const price = prices[index];
            const cacheEntry = { price, timestamp: newCacheTimestamp };
            priceCache.set(ticker, cacheEntry);
            results[ticker] = cacheEntry;
        });
    }

    return results;
}

module.exports = { getPrices, disconnect };