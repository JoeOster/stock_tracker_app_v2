// services/priceFetcher.js

const fetch = require('node-fetch');

// A simple queue to manage outgoing API requests.
const requestQueue = [];
let isProcessing = false;

const API_KEY = process.env.FINNHUB_API_KEY;
// FIX: Increased delay to stay within typical free-tier API rate limits (60 calls/minute).
const API_RATE_LIMIT_DELAY = 1100; // Milliseconds to wait between each API call.

/**
 * Processes the request queue one by one, fetching the price for each ticker.
 * Includes a delay to respect API rate limits.
 * @returns {Promise<void>}
 */
async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    while (requestQueue.length > 0) {
        const { ticker, resolve } = requestQueue.shift();
        try {
            if (!API_KEY) {
                throw new Error("API key not configured on server.");
            }
            const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data && data.c > 0) {
                    resolve(data.c);
                } else {
                    console.warn(`[Price Fetch Warning] Ticker '${ticker}' returned a null or zero price. It may be an invalid symbol.`);
                    resolve('invalid');
                }
            } else {
                console.error(`[Price Fetch Error] API call for ${ticker} failed with status: ${apiRes.status}`);
                resolve(null);
            }
        } catch (error) {
            console.error(`[Price Fetch Error] Error fetching price for ${ticker}:`, error);
            resolve(null);
        }
        // Wait before processing the next item in the queue.
        await new Promise(res => setTimeout(res, API_RATE_LIMIT_DELAY));
    }

    isProcessing = false;
}

/**
 * Fetches the current price for a single stock ticker by adding it to a rate-limited queue.
 * @param {string} ticker - The stock ticker symbol.
 * @returns {Promise<number|string|null>} A promise that resolves to the price (number), 'invalid' for a bad ticker, or null for an error.
 */
function getPrice(ticker) {
    return new Promise((resolve) => {
        requestQueue.push({ ticker, resolve });
        if (!isProcessing) {
            processQueue();
        }
    });
}

/**
 * Fetches prices for a batch of tickers using the rate-limited queue.
 * @param {string[]} tickers - An array of ticker symbols.
 * @returns {Promise<{[ticker: string]: number|string|null}>} A promise that resolves to an object mapping tickers to their prices.
 */
async function getBatchPrices(tickers) {
    /** @type {{[ticker: string]: number|string|null}} */
    const prices = {};
    const pricePromises = tickers.map(ticker => getPrice(ticker));
    const resolvedPrices = await Promise.all(pricePromises);

    tickers.forEach((ticker, index) => {
        prices[ticker] = resolvedPrices[index];
    });

    return prices;
}

module.exports = { getPrice, getBatchPrices };