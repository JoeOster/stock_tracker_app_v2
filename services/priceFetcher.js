// services/priceFetcher.js

const fetch = require('node-fetch');

const API_KEY = process.env.FINNHUB_API_KEY;
// Read the rate limit from environment variables, defaulting to 60.
const API_CALLS_PER_MINUTE = parseInt(process.env.API_CALLS_PER_MINUTE, 10) || 60;

// --- Rate Limiting State ---
let apiCallTimestamps = [];

/**
 * Checks if an API call can be made and waits if the rate limit has been reached.
 */
async function waitForRateLimit() {
    const now = Date.now();
    // Remove timestamps older than one minute.
    apiCallTimestamps = apiCallTimestamps.filter(ts => now - ts < 60000);

    if (apiCallTimestamps.length >= API_CALLS_PER_MINUTE) {
        const oldestCall = apiCallTimestamps[0];
        const timeToWait = 60000 - (now - oldestCall);
        console.warn(`[Price Fetch] Rate limit reached. Waiting for ${timeToWait}ms...`);
        await new Promise(res => setTimeout(res, timeToWait));
        // Recursively check again after waiting, in case of concurrent requests.
        await waitForRateLimit();
    }
}

/**
 * Fetches the current price for a single stock ticker, respecting the rate limit.
 * @param {string} ticker - The stock ticker symbol.
 * @returns {Promise<number|string|null>} A promise that resolves to the price, 'invalid', or null.
 */
async function getPrice(ticker) {
    await waitForRateLimit();
    apiCallTimestamps.push(Date.now());

    try {
        if (!API_KEY) {
            throw new Error("API key not configured on server.");
        }
        const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
        if (apiRes.ok) {
            const data = await apiRes.json();
            if (data && data.c > 0) {
                return data.c;
            } else {
                console.warn(`[Price Fetch Warning] Ticker '${ticker}' returned a null or zero price.`);
                return 'invalid';
            }
        } else {
            console.error(`[Price Fetch Error] API call for ${ticker} failed with status: ${apiRes.status}`);
            return null;
        }
    } catch (error) {
        console.error(`[Price Fetch Error] Error fetching price for ${ticker}:`, error);
        return null;
    }
}

/**
 * Fetches prices for a batch of tickers by sending requests in parallel.
 * The rate limiter will automatically handle throttling.
 * @param {string[]} tickers - An array of ticker symbols.
 * @returns {Promise<{[ticker: string]: number|string|null}>} A promise that resolves to an object mapping tickers to their prices.
 */
async function getBatchPrices(tickers) {
    /** @type {{[ticker: string]: number|string|null}} */
    const allPrices = {};
    const uniqueTickers = [...new Set(tickers)];

    const pricePromises = uniqueTickers.map(ticker => getPrice(ticker));
    const resolvedPrices = await Promise.all(pricePromises);

    uniqueTickers.forEach((ticker, index) => {
        allPrices[ticker] = resolvedPrices[index];
    });

    return allPrices;
}

module.exports = { getPrice, getBatchPrices };