// /public/api/watchlist-api.js
/**
 * @file API calls related to the 'Trade Idea' watchlist.
 * @module api/watchlist-api
 */
import { handleResponse } from './api-helpers.js';

/**
 * Fetches all 'Trade Idea' watchlist items for a specific holder.
 * @async
 * @param {string|number} holderId - The account holder's ID.
 * @returns {Promise<any[]>} A promise that resolves to an array of watchlist items.
 */
export async function fetchWatchlistIdeas(holderId) {
  if (!holderId || holderId === 'all') {
    console.warn('[API] fetchWatchlistIdeas requires a specific holderId.');
    return [];
  }
  const response = await fetch(`/api/watchlist/ideas/${holderId}`);
  return handleResponse(response);
}

/**
 * Adds a new 'Trade Idea' to the watchlist.
 * @async
 * @param {object} ideaData - The data for the new trade idea.
 * @returns {Promise<any>} A promise that resolves to the server's response.
 */
export async function addWatchlistIdea(ideaData) {
  const response = await fetch('/api/watchlist/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ideaData),
  });
  return handleResponse(response);
}

/**
 * Closes (archives) a 'Trade Idea' watchlist item by its ID.
 * @async
 * @param {string|number} itemId - The ID of the watchlist item.
 * @returns {Promise<any>} A promise that resolves to the server's response.
 */
export async function closeWatchlistIdea(itemId) {
  const response = await fetch(`/api/watchlist/ideas/${itemId}/close`, {
    method: 'PATCH',
  });
  return handleResponse(response);
}

// --- ADDED: New functions for simple 'WATCH' type tickers ---

/**
 * Fetches all simple 'WATCH' tickers for a specific holder.
 * @async
 * @param {string|number} holderId - The account holder's ID.
 * @returns {Promise<any[]>} A promise that resolves to an array of {id, ticker} objects.
 */
export async function fetchSimpleWatchlist(holderId) {
  if (!holderId || holderId === 'all') {
    console.warn('[API] fetchSimpleWatchlist requires a specific holderId.');
    return [];
  }
  const response = await fetch(`/api/watchlist/simple/${holderId}`);
  return handleResponse(response);
}

/**
 * Adds a new 'WATCH' ticker to the simple watchlist.
 * @async
 * @param {string} ticker - The ticker symbol to add.
 * @param {string|number} holderId - The account holder's ID.
 * @returns {Promise<any>} A promise that resolves to the server's response.
 */
export async function addSimpleWatchedTicker(ticker, holderId) {
  if (!ticker || !holderId || holderId === 'all') {
    throw new Error('Ticker and a specific Account Holder ID are required.');
  }
  const response = await fetch('/api/watchlist/simple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: ticker.toUpperCase(),
      account_holder_id: holderId,
    }),
  });
  return handleResponse(response);
}

/**
 * Deletes a 'WATCH' ticker from the simple watchlist by its ID.
 * @async
 * @param {string|number} itemId - The ID of the watchlist item.
 * @returns {Promise<any>} A promise that resolves to the server's response.
 */
export async function deleteSimpleWatchedTicker(itemId) {
  const response = await fetch(`/api/watchlist/simple/${itemId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}
// --- END ADDED ---
