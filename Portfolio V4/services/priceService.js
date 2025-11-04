// services/priceService.js
const fetch = require('node-fetch');
// --- FIX: Refined JSDoc import for Bottleneck CommonJS constructor ---
/** @type {typeof import('bottleneck')} */
const Bottleneck = require('bottleneck');

// --- Read both API keys ---
const API_KEYS = [
  process.env.FINNHUB_API_KEY,
  process.env.FINNHUB_API_KEY_2,
].filter(Boolean);
let currentKeyIndex = 0;

// --- Adjust API Calls per Minute ---
const TOTAL_API_CALLS_PER_MINUTE =
  API_KEYS.length > 1 && parseInt(process.env.API_CALLS_PER_MINUTE, 10)
    ? parseInt(process.env.API_CALLS_PER_MINUTE, 10)
    : 60;

const CACHE_EXPIRATION_MS = 60 * 1000;

const priceCache = new Map();
const getTimestamp = () => new Date().toISOString();

// Initialize the rate limiter directly using the imported constructor
const limiter = new Bottleneck({
  // <-- This line will now be correct
  reservoir: TOTAL_API_CALLS_PER_MINUTE,
  reservoirRefreshAmount: TOTAL_API_CALLS_PER_MINUTE,
  reservoirRefreshInterval: 60 * 1000,
  maxConcurrent: API_KEYS.length > 1 ? 4 : 2,
});

/**
 * Disconnects the Bottleneck limiter to allow graceful shutdown.
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  await limiter.disconnect();
};

/**
 * Fetches the price for a single ticker using a specific API key.
 * @param {string} ticker The stock ticker symbol.
 * @param {string} apiKey The Finnhub API key to use.
 * @returns {Promise<number|'invalid'|null>} The price, 'invalid', or null on error.
 */
async function fetchSinglePrice(ticker, apiKey) {
  try {
    if (!apiKey) throw new Error('API key not provided for this request.');
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
    console.log(
      `[${getTimestamp()}] [Price Service] Submitting request for ${ticker} using key ending in ${apiKey.slice(-4)}`
    );
    const apiRes = await fetch(url);
    if (apiRes.ok) {
      const data = await apiRes.json();
      console.log(
        `[${getTimestamp()}] [Price Service] Received data for ${ticker}: ${JSON.stringify(data)}`
      );
      if (data && typeof data.c === 'number' && data.c > 0) {
        return data.c;
      }
      console.warn(
        `[${getTimestamp()}] [Price Service Warning] Ticker '${ticker}' returned invalid price data: ${JSON.stringify(data)}`
      );
      return 'invalid';
    }
    console.error(
      `[${getTimestamp()}] [Price Service Error] API call for ${ticker} failed with status: ${apiRes.status}`
    );
    return 'invalid';
  } catch (error) {
    // @ts-ignore
    console.error(
      `[${getTimestamp()}] [Price Service Error] Error fetching price for ${ticker}:`,
      error.message
    );
    return null;
  }
}

/**
 * @typedef {object} PriceData
 * @property {number|string|null} price - The fetched price ('invalid', null, or number).
 * @property {number} timestamp - The timestamp when the price was fetched or retrieved from cache.
 */

/**
 * Gets prices for a list of tickers, utilizing a cache and a priority-based, rate-limited queue with load balancing.
 * @param {string[]} tickers - An array of ticker symbols.
 * @param {number} [priority=5] - The priority of the job (1-9, with 1 being highest).
 * @returns {Promise<{[ticker: string]: PriceData}>} A map of tickers to PriceData objects.
 */
async function getPrices(tickers, priority = 5) {
  if (API_KEYS.length === 0) {
    console.error(
      `[${getTimestamp()}] [Price Service Error] No API keys configured.`
    );
    /** @type {{[ticker: string]: PriceData}} */
    const results = {};
    tickers.forEach((ticker) => {
      results[ticker] = { price: null, timestamp: Date.now() };
    });
    return results;
  }

  const uniqueTickers = [...new Set(tickers)];
  /** @type {{[ticker: string]: PriceData}} */
  const results = {};
  const tickersToFetch = [];
  const now = Date.now();

  // Check cache first
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

  // Fetch prices for tickers not found in valid cache
  if (tickersToFetch.length > 0) {
    const newCacheTimestamp = Date.now();
    const fetchPromises = tickersToFetch.map((ticker) => {
      const keyToUse = API_KEYS[currentKeyIndex];
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      return limiter.schedule({ priority }, () =>
        fetchSinglePrice(ticker, keyToUse)
      );
    });

    const prices = await Promise.all(fetchPromises);

    tickersToFetch.forEach((ticker, index) => {
      const price = prices[index];
      /** @type {PriceData} */
      const cacheEntry = { price: price, timestamp: newCacheTimestamp };
      priceCache.set(ticker, cacheEntry);
      results[ticker] = cacheEntry;
    });
  }

  return results;
}

module.exports = { getPrices, disconnect };
