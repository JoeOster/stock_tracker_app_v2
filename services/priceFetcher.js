// services/priceFetcher.js

const fetch = require('node-fetch');

const API_KEY = process.env.FINNHUB_API_KEY;
// Read the rate limit from environment variables, defaulting to 60.
const API_CALLS_PER_MINUTE = parseInt(process.env.API_CALLS_PER_MINUTE, 10) || 60;

// --- Rate Limiting State ---
let apiCallTimestamps = [];

/**
 * Gets a formatted timestamp string.
 * @returns {string} The timestamp.
 */
const getTimestamp = () => new Date().toISOString();

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
        console.warn(`[${getTimestamp()}] [Price Fetch] Rate limit reached. Waiting for ${timeToWait}ms...`);
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
        const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
        console.log(`[${getTimestamp()}] [Price Fetch] Submitting request for ${ticker}`);
        const apiRes = await fetch(url);
        if (apiRes.ok) {
            const data = await apiRes.json();
            console.log(`[${getTimestamp()}] [Price Fetch] Received data for ${ticker}: ${JSON.stringify(data)}`);
            if (data && data.c > 0) {
                return data.c;
            } else {
                console.warn(`[${getTimestamp()}] [Price Fetch Warning] Ticker '${ticker}' returned a null or zero price.`);
                return 'invalid';
            }
        } else {
            console.error(`[${getTimestamp()}] [Price Fetch Error] API call for ${ticker} failed with status: ${apiRes.status}`);
            return null;
        }
    } catch (error) {
        console.error(`[${getTimestamp()}] [Price Fetch Error] Error fetching price for ${ticker}:`, error.message);
        return null;
    }
}

/**
 * Fetches prices for a batch of tickers sequentially to respect rate limits.
 * @param {string[]} tickers - An array of ticker symbols.
 * @returns {Promise<{[ticker: string]: number|string|null}>} A promise that resolves to an object mapping tickers to their prices.
 */
async function getBatchPrices(tickers) {
    /** @type {{[ticker: string]: number|string|null}} */
    const allPrices = {};
    const uniqueTickers = [...new Set(tickers)];

    for (const ticker of uniqueTickers) {
        try {
            allPrices[ticker] = await getPrice(ticker);
        } catch (error) {
            console.error(`[${getTimestamp()}] [Batch Price Fetch Error] Failed to process price for ${ticker}:`, error.message);
            allPrices[ticker] = null;
        }
    }

    return allPrices;
}

module.exports = { getPrice, getBatchPrices };