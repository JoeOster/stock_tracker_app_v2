// services/priceService.js
const fetch = require('node-fetch');

const API_KEY = process.env.FINNHUB_API_KEY;
const API_CALLS_PER_MINUTE = parseInt(process.env.API_CALLS_PER_MINUTE, 10) || 25; // Default to a safer 25
const CACHE_EXPIRATION_MS = 60 * 1000; // Cache prices for 1 minute

// --- In-memory cache and rate limiting state ---
const priceCache = new Map();
let apiCallTimestamps = [];

const getTimestamp = () => new Date().toISOString();

async function waitForRateLimit() {
    const now = Date.now();
    apiCallTimestamps = apiCallTimestamps.filter(ts => now - ts < 60000);
    if (apiCallTimestamps.length >= API_CALLS_PER_MINUTE) {
        const oldestCall = apiCallTimestamps[0];
        const timeToWait = 60000 - (now - oldestCall);
        console.warn(`[${getTimestamp()}] [Price Service] Rate limit reached. Waiting for ${timeToWait}ms...`);
        await new Promise(res => setTimeout(res, timeToWait));
        await waitForRateLimit();
    }
}

async function fetchSinglePrice(ticker) {
    await waitForRateLimit();
    apiCallTimestamps.push(Date.now());
    try {
        if (!API_KEY) throw new Error("API key not configured on server.");
        const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
        console.log(`[${getTimestamp()}] [Price Service] Submitting request for ${ticker}`); // Logging restored
        const apiRes = await fetch(url);
        if (apiRes.ok) {
            const data = await apiRes.json();
            console.log(`[${getTimestamp()}] [Price Service] Received data for ${ticker}: ${JSON.stringify(data)}`); // Logging restored
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
 * Gets prices for a list of tickers, utilizing a cache and rate-limited fetching.
 * @param {string[]} tickers - An array of ticker symbols.
 * @returns {Promise<{[ticker: string]: {price: number|string|null, timestamp: number}}>}
 */
async function getPrices(tickers) {
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
        for (const ticker of tickersToFetch) {
            const price = await fetchSinglePrice(ticker);
            const cacheEntry = { price, timestamp: newCacheTimestamp };
            priceCache.set(ticker, cacheEntry);
            results[ticker] = cacheEntry;
        }
    }

    return results;
}

module.exports = { getPrices };