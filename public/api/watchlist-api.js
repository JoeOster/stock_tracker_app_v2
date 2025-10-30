// /public/api/watchlist-api.js
/**
 * @file API calls related to the watchlist (Trade Ideas).
 * @module api/watchlist-api
 */

import { handleResponse } from './api-helpers.js';

/**
 * @typedef {object} WatchlistPostBody
 * @property {string|number} account_holder_id
 * @property {string} ticker
 * @property {string|number|null} [advice_source_id]
 * @property {number|null} [rec_entry_low]
 * @property {number|null} [rec_entry_high]
 * @property {number|null} [rec_tp1]
 * @property {number|null} [rec_tp2]
 * @property {number|null} [rec_stop_loss]
 */

/**
 * Adds a ticker to the watchlist, optionally linking it to an advice source and guidelines.
 * @async
 * @param {string|number} accountHolderId - The account holder ID.
 * @param {string} ticker - The ticker symbol to add.
 * @param {string|number|null} [adviceSourceId=null] - Optional ID of the advice source to link.
 * @param {number|null} [recEntryLow=null] - Optional recommended entry price low.
 * @param {number|null} [recEntryHigh=null] - Optional recommended entry price high.
 * @param {number|null} [recTp1=null] - Optional recommended take profit 1.
 * @param {number|null} [recTp2=null] - Optional recommended take profit 2.
 * @param {number|null} [recStopLoss=null] - Optional recommended stop loss.
 * @returns {Promise<any>} The response from the server.
 */
export async function addWatchlistItem(accountHolderId, ticker, adviceSourceId = null, recEntryLow = null, recEntryHigh = null, recTp1 = null, recTp2 = null, recStopLoss = null) {
    /** @type {WatchlistPostBody} */
    const body = {
        account_holder_id: accountHolderId,
        ticker: ticker,
        advice_source_id: adviceSourceId,
        rec_entry_low: recEntryLow,
        rec_entry_high: recEntryHigh,
        rec_tp1: recTp1,
        rec_tp2: recTp2,
        rec_stop_loss: recStopLoss
    };

    const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return handleResponse(response);
}

/**
 * Deletes (archives) a watchlist item by its ID.
 * @async
 * @param {string|number} itemId - The ID of the watchlist item to delete.
 * @returns {Promise<any>} The response from the server.
 */
export async function deleteWatchlistItem(itemId) {
    const response = await fetch(`/api/watchlist/${itemId}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}
