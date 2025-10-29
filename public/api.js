// /public/api.js
/**
 * @file This file centralizes all client-side API (fetch) calls to the server.
 * @module api
 */
import { state, updateState } from './state.js';
import { populatePricesFromCache, showToast } from './ui/helpers.js';
import { renderLedgerPage } from './ui/renderers/_ledger.js';
import { getCurrentESTDateString } from './ui/datetime.js';
// import { populateJournalPrices } from './ui/renderers/_journal.js'; // Import if created

/**
 * @typedef {object} PriceData
 * @property {number|string|null} price - The fetched price ('invalid', null, or number).
 * @property {number|null} previousPrice - The previous price, if available.
 * @property {number} timestamp - The timestamp when the price was fetched or retrieved from cache.
 */

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
 * @typedef {object} DocumentData
 * @property {string|number|null} journal_entry_id - The journal entry ID (nullable).
 * @property {string|number|null} advice_source_id - The advice source ID (nullable).
 * @property {string|number} account_holder_id - The account holder ID.
 * @property {string} external_link - The URL of the document.
 * @property {string} [title] - Optional title.
 * @property {string} [document_type] - Optional type (e.g., 'Chart').
 * @property {string} [description] - Optional description.
 */

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
 * A helper function to handle fetch responses, throwing an error with a server message if not ok.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<any>} A promise that resolves to the JSON body of the response.
 * @throws {Error} Throws an error with the server message if the response is not ok.
 */
export async function handleResponse(response) {
    if (!response.ok) {
        // Try to parse JSON error, fallback to status text
        const errorData = await response.json().catch(() => ({ message: response.statusText || `Server responded with status: ${response.status}` }));
        throw new Error(errorData.message || 'An unknown error occurred.');
    }
    // Handle cases where the response might be empty (e.g., successful DELETE with 204 No Content)
    if (response.status === 204) {
        return { message: 'Operation successful.' }; // Return a success object
    }
    // Handle text/plain responses (like some DELETEs might send)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/plain')) {
        const text = await response.text();
        try {
            // Try to parse if it's JSON disguised as text
            return JSON.parse(text);
        } catch (e) {
            // Return plain text message
            return { message: text };
        }
    }
    return response.json(); // Otherwise, parse JSON body
}

/**
 * Fetches the latest transactions and re-renders the ledger view.
 * @returns {Promise<void>}
 */
export async function refreshLedger() {
    try {
        const holderId = state.selectedAccountHolderId === 'all' ? 'all' : String(state.selectedAccountHolderId);
        const res = await fetch(`/api/transactions?holder=${holderId}`);
        const transactions = await handleResponse(res);
        updateState({ transactions: transactions }); // Update state
        renderLedgerPage(state.transactions, state.ledgerSort);
    } catch (error) {
        console.error("Failed to refresh ledger:", error);
        // @ts-ignore
        showToast(`Failed to refresh ledger: ${error.message}`, 'error');
        updateState({ transactions: [] }); // Clear state on error
        renderLedgerPage([], state.ledgerSort); // Render empty ledger
    }
}


/**
 * Fetches the latest market prices for a given list of tickers and updates the price cache.
 * @param {string} viewDate - The date for which to fetch prices (YYYY-MM-DD).
 * @param {string[]} tickersToUpdate - The specific list of tickers to fetch.
 * @returns {Promise<void>}
 */
export async function updatePricesForView(viewDate, tickersToUpdate) {
    // console.log("updatePricesForView called with:", { viewDate, tickersToUpdate });
    if (!tickersToUpdate || tickersToUpdate.length === 0) {
        // console.log("updatePricesForView: Exiting early - no tickers to update.");
        return;
    }

    try {
        const isToday = viewDate === getCurrentESTDateString();
        const response = await fetch('/api/utility/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersToUpdate, date: viewDate, allowLive: isToday })
        });
        const pricesData = await handleResponse(response);
        // console.log("updatePricesForView: Received pricesData:", pricesData);

        const now = Date.now();
        let pricesUpdated = false;
        for (const ticker in pricesData) {
            // console.log("updatePricesForView: Processing ticker:", ticker, pricesData[ticker]);

            // --- Store previous price ---
            const currentCached = state.priceCache.get(ticker);
            const previousPrice = (currentCached && typeof currentCached.price === 'number') ? currentCached.price : null;
            // --- End store previous price ---

            // Determine the new price, defaulting to 'invalid'
            const newPriceValue = pricesData[ticker];
            const newPrice = (typeof newPriceValue === 'number' && newPriceValue > 0) ? newPriceValue : 'invalid';

            /** @type {PriceData} */
            const newPriceData = {
                price: newPrice,
                // Keep the old 'previousPrice' if the new price is invalid, otherwise use the 'previousPrice' we just captured
                previousPrice: newPrice === 'invalid' ? currentCached?.previousPrice : previousPrice,
                timestamp: now
            };
            // console.log("updatePricesForView: Caching data:", newPriceData);

            state.priceCache.set(ticker, newPriceData);
            pricesUpdated = true;
            // console.log("updatePricesForView: Cache updated for", ticker, state.priceCache.get(ticker));
        }
        if (!pricesUpdated) {
            // console.log("updatePricesForView: No valid price data found in response to process.");
        }

    } catch (error) {
        console.error("Error inside updatePricesForView:", error);
        // @ts-ignore
        showToast(`Price update failed: ${error.message}`, 'error');
        // Mark prices as error in cache
        tickersToUpdate.forEach(ticker => {
             // Preserve previous price on error if possible
             const existingPrevious = state.priceCache.get(ticker)?.previousPrice;
             // @ts-ignore
             state.priceCache.set(ticker, { price: 'error', previousPrice: existingPrevious ?? null, timestamp: Date.now() });
        });
    }
}


/**
 * Manually triggers a price update for the current view and then re-renders the price-dependent UI elements.
 * @returns {Promise<void>}
 */
export async function updateAllPrices() {
    let tickersToUpdate = [];
    let dateForUpdate = state.currentView.value;

     if (state.currentView.type === 'dashboard' && state.dashboardOpenLots.length > 0) { // Check dashboard state
        tickersToUpdate = [...new Set(state.dashboardOpenLots.map(lot => lot.ticker))];
        dateForUpdate = getCurrentESTDateString(); // Dashboard always uses current prices
    }
    else if (state.currentView.type === 'date' && state.activityMap.size > 0) {
        tickersToUpdate = [...new Set(Array.from(state.activityMap.values()).map(lot => lot.ticker))];
        // dateForUpdate is already set to state.currentView.value for 'date' type
    } else if (state.currentView.type === 'research') {
        // <-- MODIFIED: Combine tickers from journal AND recommended trades -->
        const journalTickers = state.journalEntries?.openEntries ? state.journalEntries.openEntries.map(entry => entry.ticker) : [];
        const recommendedTickers = state.researchWatchlistItems ? state.researchWatchlistItems.map(item => item.ticker) : [];
        tickersToUpdate = [...new Set([...journalTickers, ...recommendedTickers])];
        dateForUpdate = getCurrentESTDateString(); // Research tab always uses current prices
    }
    // Add other views like watchlist if they need price updates

    if(tickersToUpdate.length > 0 && dateForUpdate) {
        showToast('Refreshing prices...', 'info', 2000);
        await updatePricesForView(dateForUpdate, tickersToUpdate); // Use the determined date

        // Decide which UI update function to call based on the view
         if (state.currentView.type === 'dashboard') {
             // Dashboard re-renders fully on refresh click, which includes price population
             const { renderDashboardPage } = await import('./ui/renderers/_dashboard_render.js');
             await renderDashboardPage();
         }
         else if (state.currentView.type === 'date') {
            populatePricesFromCache(state.activityMap, state.priceCache);
        } else if (state.currentView.type === 'research') {
             // Need to call the specific loader/renderer for the active research sub-tab
             const researchModule = await import('./event-handlers/_research.js');
             if (researchModule.loadResearchPage) {
                 await researchModule.loadResearchPage();
             }
        }
        // Add other views if necessary
    } else {
         console.log("No tickers to update or required date context missing.");
         showToast('No prices to refresh for the current view.', 'info');
    }
}

/**
 * Fetches all active pending orders for a given account holder.
 * @param {string|number} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of pending order objects.
 */
export async function fetchPendingOrders(holderId) {
    const response = await fetch(`/api/orders/pending?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches all 'UNREAD' notifications for a given account holder.
 * @param {string|number} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of notification objects.
 */
export async function fetchAlerts(holderId) {
    const response = await fetch(`/api/orders/notifications?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily performance summary for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<object>} A promise that resolves to the performance data.
 */
export async function fetchDailyPerformance(date, holderId) {
    const response = await fetch(`/api/reporting/daily_performance/${date}?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily transactions and end-of-day positions for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<{dailyTransactions: any[], endOfDayPositions: any[]}>} A promise that resolves to an object containing dailyTransactions and endOfDayPositions.
 */
export async function fetchPositions(date, holderId) {
    const response = await fetch(`/api/reporting/positions/${date}?holder=${holderId}`);
    const data = await handleResponse(response);
    // Add a check for the expected structure
    if (!data || !Array.isArray(data.dailyTransactions) || !Array.isArray(data.endOfDayPositions)) {
        console.error("Received invalid data structure for position data:", data);
        throw new Error("Invalid data structure received for position data.");
    }
    return data;
}

/**
 * Fetches all account value snapshots for a given account holder.
 * @param {string|number} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of snapshot objects.
 */
export async function fetchSnapshots(holderId) {
    const response = await fetch(`/api/utility/snapshots?holder=${holderId}`);
    return handleResponse(response);
}

// --- Advice Source API Functions ---

/**
 * Fetches all advice sources for a given account holder.
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
 * @param {string|number} id - The ID of the advice source to delete.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function deleteAdviceSource(id) {
    const response = await fetch(`/api/advice-sources/${id}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}

// --- Journal Entry API Functions ---

/**
 * Fetches journal entries for a given account holder, optionally filtering by status.
 * @param {string|number} holderId - The ID of the account holder ('all' not recommended here).
 * @param {'OPEN' | 'CLOSED' | 'EXECUTED' | 'CANCELLED' | null} [status=null] - Optional status to filter by.
 * @returns {Promise<any[]>} A promise that resolves to an array of journal entry objects.
 */
export async function fetchJournalEntries(holderId, status = null) {
    if (!holderId || holderId === 'all') {
        console.warn("A specific account holder ID is required to fetch journal entries.");
        return [];
    }
    let url = `/api/journal?holder=${holderId}`;
    if (status) {
        url += `&status=${status}`;
    }
    const response = await fetch(url);
    return handleResponse(response);
}

/**
 * Adds a new journal entry to the database.
 * @param {object} entryData - The data for the new journal entry.
 * @returns {Promise<any>} A promise that resolves to the newly created journal entry object.
 */
export async function addJournalEntry(entryData) {
    const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
    });
    return handleResponse(response);
}

/**
 * Updates an existing journal entry.
 * @param {string|number} id - The ID of the journal entry to update.
 * @param {object} updateData - An object containing the fields to update.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function updateJournalEntry(id, updateData) {
    const response = await fetch(`/api/journal/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    });
    return handleResponse(response);
}

/**
 * Executes an open journal entry, creating a real transaction.
 * @param {string|number} id - The ID of the journal entry to execute.
 * @param {object} executionData - Details of the execution (date, price, account_holder_id).
 * @param {string} executionData.execution_date - The actual date the trade was executed (YYYY-MM-DD).
 * @param {number} executionData.execution_price - The actual price the trade was executed at.
 * @param {string|number} executionData.account_holder_id - The account holder performing the execution.
 * @returns {Promise<any>} A promise that resolves to the server's response (including the new transaction ID). */
export async function executeJournalEntry(id, executionData) {
     const response = await fetch(`/api/journal/${id}/execute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionData)
    });
    return handleResponse(response);
}


/**
 * Deletes a journal entry.
 * @param {string|number} id - The ID of the journal entry to delete.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function deleteJournalEntry(id) {
    const response = await fetch(`/api/journal/${id}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}

/**
 * Fetches the sales history for a specific parent BUY lot ID.
 * @param {string|number} buyId - The ID of the parent BUY transaction.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<any[]>} A promise resolving to an array of sales transaction objects with calculated P/L.
 */
export async function fetchSalesForLot(buyId, holderId) {
    if (!buyId || !holderId || holderId === 'all') {
        throw new Error("Buy ID and a specific Account Holder ID are required to fetch sales.");
    }
    const response = await fetch(`/api/transactions/sales/${buyId}?holder=${holderId}`);
    return handleResponse(response);
}

// --- Source Details API ---

/**
 * Fetches detailed information about an advice source, including linked items.
 * @param {string|number} sourceId - The ID of the advice source.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<{source: object, journalEntries: any[], watchlistItems: any[], documents: any[], sourceNotes: any[]}>}
 */
export async function fetchSourceDetails(sourceId, holderId) {
    if (!sourceId || !holderId || holderId === 'all') {
        throw new Error("Source ID and a specific Account Holder ID are required.");
    }
    const response = await fetch(`/api/sources/${sourceId}/details?holder=${holderId}`);
    const data = await handleResponse(response);
    // <-- MODIFIED: Store watchlist items in state -->
    if (data && data.watchlistItems) {
        updateState({ researchWatchlistItems: data.watchlistItems });
    } else {
        updateState({ researchWatchlistItems: [] }); // Clear if none found
    }
    return data;
}

// --- Watchlist Item API ---

/**
 * Adds a ticker to the watchlist, optionally linking it to an advice source and guidelines.
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
 * Deletes a watchlist item by its ID.
 * @param {string|number} itemId - The ID of the watchlist item to delete.
 * @returns {Promise<any>} The response from the server.
 */
export async function deleteWatchlistItem(itemId) {
    const response = await fetch(`/api/watchlist/${itemId}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}


// --- Document Link API ---

/**
 * Adds a document link, associating it with either a journal entry or an advice source.
 * @param {DocumentData} documentData - The document data.
 * @returns {Promise<any>} The response from the server.
 */
export async function addDocument(documentData) {
    // @ts-ignore
    if (!documentData.account_holder_id || (!documentData.journal_entry_id && !documentData.advice_source_id) || !documentData.external_link) {
        throw new Error("Missing required fields: account holder, link, and either journal or source ID.");
    }
    const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
    });
    return handleResponse(response);
}

/**
 * Deletes a document link by its ID.
 * @param {string|number} documentId - The ID of the document link to delete.
 * @returns {Promise<any>} The response from the server.
 */
export async function deleteDocument(documentId) {
    const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}

// --- Source Note API ---

/**
 * Adds a note to a specific advice source.
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

/**
 * Adds a new pending order to the database.
 * @param {object} orderData - The data for the new pending order.
 * @param {string|number} orderData.account_holder_id - The account holder ID.
 * @param {string} orderData.ticker - The ticker symbol.
 * @param {string} orderData.exchange - The target exchange.
 * @param {string} orderData.order_type - Type of order (e.g., 'BUY_LIMIT').
 * @param {number} orderData.limit_price - The price for the limit order.
 * @param {number} orderData.quantity - The number of shares.
 * @param {string} orderData.created_date - The date the order was created (YYYY-MM-DD).
 * @param {string|null} [orderData.expiration_date=null] - Optional expiration date (YYYY-MM-DD).
 * @param {string|null} [orderData.notes=null] - Optional user notes.
 * @param {string|number|null} [orderData.advice_source_id=null] - Optional linked advice source ID.
 * @returns {Promise<any>} A promise that resolves to the server's response (e.g., success message).
 */
export async function addPendingOrder(orderData) {
    // Basic validation on the client side for required fields
    if (!orderData.account_holder_id || !orderData.ticker || !orderData.exchange ||
        !orderData.order_type || !orderData.limit_price || !orderData.quantity ||
        !orderData.created_date) {
        throw new Error("Missing required fields for pending order.");
    }

    const response = await fetch('/api/orders/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData) // Send the complete order data object
    });
    return handleResponse(response); // Use the existing handleResponse helper
}