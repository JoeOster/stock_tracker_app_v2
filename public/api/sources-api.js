// /public/api/sources-api.js
/**
 * @file API calls related to advice sources and their details.
 * @module api/sources-api
 */

// --- ADD THESE IMPORTS (if they are missing) ---
import { updatePricesForView } from './price-api.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
// --- END ADD ---

import { updateState } from '../state.js';
import { handleResponse } from './api-helpers.js';

/**
 * @typedef {object} AdviceSourcePostBody
 * @property {string|number} account_holder_id
 * @property {string} name
 * @property {string} type
 * @property {string|null} [description]
 * @property {string|null} [url]
 * @property {string|null} [contact_person]
 * @property {string|null} [contact_email]
 * @property {string|null} [contact_phone]
 * @property {string|null} [contact_app_type]
 * @property {string|null} [contact_app_handle]
 * @property {string|null} [image_path]
 */

 /**
 * @typedef {object} AdviceSourcePutBody
 * @property {string} name
 * @property {string} type
 * @property {string|null} [description]
 * @property {string|null} [url]
 * @property {string|null} [contact_person]
 * @property {string|null} [contact_email]
 * @property {string|null} [contact_phone]
 * @property {string|null} [contact_app_type]
 * @property {string|null} [contact_app_handle]
 * @property {string|null} [image_path]
 */

/**
 * Fetches all advice sources for a given account holder.
 * @async
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<any[]>} A promise that resolves to an array of advice source objects.
 */
export async function fetchAdviceSources(holderId) {
    if (!holderId || holderId === 'all') {
        return [];
    }
    const response = await fetch(`/api/advice-sources?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Adds a new advice source to the database.
 * @async
 * @param {AdviceSourcePostBody} sourceData - The data for the new advice source.
 * @returns {Promise<any>} A promise that resolves to the newly created advice source object.
 */
export async function addAdviceSource(sourceData) {
    const response = await fetch('/api/advice-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceData)
    });
    return handleResponse(response);
}

/**
 * Updates an existing advice source.
 * @async
 * @param {string|number} id - The ID of the advice source to update.
 * @param {AdviceSourcePutBody} sourceData - The updated data for the advice source.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function updateAdviceSource(id, sourceData) {
    const response = await fetch(`/api/advice-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceData)
    });
    return handleResponse(response);
}

/**
 * Deletes an advice source.
 * @async
 * @param {string|number} id - The ID of the advice source to delete.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function deleteAdviceSource(id) {
    const response = await fetch(`/api/advice-sources/${id}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}

/**
 * Fetches detailed information about an advice source, including linked items.
 * @async
 * @param {string|number} sourceId - The ID of the advice source.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<{source: object, journalEntries: any[], watchlistItems: any[], linkedTransactions: any[], documents: any[], sourceNotes: any[], summaryStats: object}>} A promise resolving to the complete details object.
 */
export async function fetchSourceDetails(sourceId, holderId) {
    if (!sourceId || !holderId || holderId === 'all') {
        throw new Error("Source ID and a specific Account Holder ID are required.");
    }
    const response = await fetch(`/api/sources/${sourceId}/details?holder=${holderId}`);
    const data = await handleResponse(response);
    
    // Store watchlist items in state for price updates
    if (data && data.watchlistItems) {
        updateState({ researchWatchlistItems: data.watchlistItems });
    } else {
        updateState({ researchWatchlistItems: [] }); // Clear if none found
    }

    // --- ADD THIS BLOCK TO FETCH PRICES ---
    if (data) {
        const journalTickers = data.journalEntries ? data.journalEntries.map(j => j.ticker) : [];
        const watchlistTickers = data.watchlistItems ? data.watchlistItems.map(w => w.ticker) : [];
        const openLots = data.linkedTransactions ? data.linkedTransactions.filter(tx => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001) : [];
        const openLotTickers = openLots.map(lot => lot.ticker);

        const allTickers = [...new Set([...journalTickers, ...watchlistTickers, ...openLotTickers])];

        if (allTickers.length > 0) {
            // This will populate state.priceCache before the modal renders
            await updatePricesForView(getCurrentESTDateString(), allTickers);
        }
    }
    // --- END ADD ---

    return data;
}

/**
 * Adds a note to a specific advice source.
 * @async
 * @param {string|number} sourceId - The ID of the advice source.
 * @param {string|number} holderId - The ID of the account holder.
 * @param {string} noteContent - The text content of the note.
 * @returns {Promise<any>} The response from the server (likely the new note object).
 */
export async function addSourceNote(sourceId, holderId, noteContent) {
    if (!sourceId || !holderId || !noteContent || holderId === 'all') {
        throw new Error("Missing required fields: source ID, holder ID, and note content.");
    }
    const response = await fetch(`/api/sources/${sourceId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId: holderId, note_content: noteContent })
    });
    return handleResponse(response);
}

/**
 * Deletes a specific note associated with an advice source.
 * @async
 * @param {string|number} sourceId - The ID of the advice source.
 * @param {string|number} noteId - The ID of the note to delete.
 * @param {string|number} holderId - The ID of the account holder (for verification).
 * @returns {Promise<any>} The response from the server.
 */
export async function deleteSourceNote(sourceId, noteId, holderId) {
    if (!sourceId || !noteId || !holderId || holderId === 'all') {
        throw new Error("Missing required fields: source ID, note ID, and holder ID.");
    }
     // Pass holderId in the body for verification on the backend
    const response = await fetch(`/api/sources/${sourceId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId: holderId }) // Pass holderId in body
    });
    return handleResponse(response);
}

/**
 * Updates the content of a specific note.
 * @async
 * @param {string|number} sourceId - The ID of the advice source the note belongs to.
 * @param {string|number} noteId - The ID of the note to update.
 * @param {string|number} holderId - The ID of the account holder (for verification).
 * @param {string} noteContent - The new text content for the note.
 * @returns {Promise<any>} The response from the server.
 */
export async function updateSourceNote(sourceId, noteId, holderId, noteContent) {
    if (!sourceId || !noteId || !holderId || holderId === 'all' || noteContent === undefined || noteContent === null) {
        throw new Error("Missing required fields: source ID, note ID, holder ID, and note content.");
    }
    const response = await fetch(`/api/sources/${sourceId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId: holderId, note_content: noteContent })
    });
    return handleResponse(response);
}