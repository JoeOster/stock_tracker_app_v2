// public/api.js
// Version 0.1.23
/**
 * @file This file centralizes all client-side API (fetch) calls to the server.
 * @module api
 */
import { state, updateState } from './state.js'; // Added updateState import
import { populatePricesFromCache, showToast } from './ui/helpers.js'; // Added showToast
import { renderLedgerPage } from './ui/renderers/_ledger.js';
import { getCurrentESTDateString } from './ui/datetime.js';
// Import journal renderer if needed for price updates, or handle in journal event handler
// import { populateJournalPrices } from './ui/renderers/_journal.js';

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
// public/api.js
// ... (other imports and functions) ...

export async function updatePricesForView(viewDate, tickersToUpdate) {
    console.log("updatePricesForView called with:", { viewDate, tickersToUpdate }); // <-- ADD THIS LINE
    if (!tickersToUpdate || tickersToUpdate.length === 0) {
        console.log("updatePricesForView: Exiting early - no tickers to update."); // <-- ADD/MODIFY THIS LINE
        return;
    }if (!tickersToUpdate || tickersToUpdate.length === 0) return;

    // ... (loading indicators remain the same) ...

    try {
        const isToday = viewDate === getCurrentESTDateString();
        const response = await fetch('/api/utility/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersToUpdate, date: viewDate, allowLive: isToday })
        });
        const pricesData = await handleResponse(response);

        // --- ADD LOGS HERE ---
        console.log("updatePricesForView: Received pricesData:", pricesData); // Log 1: What did the backend send?

        const now = Date.now();
        let pricesUpdated = false;
        for (const ticker in pricesData) {
            console.log("updatePricesForView: Processing ticker:", ticker, pricesData[ticker]); // Log 2: Are we entering the loop? What's the data for this ticker?

            // --- Check the structure right before creating newPriceData ---
             console.log("updatePricesForView: Type of pricesData[ticker]:", typeof pricesData[ticker], "Value:", pricesData[ticker]); // Log 3: Check data structure

            const newPriceData = {
                // Original logic had 'invalid' if price wasn't a number. Let's see what pricesData[ticker] actually is.
                // It seems the backend route /api/utility/prices/batch directly returns the price number or 'invalid', not an object like { price: ..., timestamp: ...}
                // Adjusting based on that backend route's likely output:
                price: (typeof pricesData[ticker] === 'number' && pricesData[ticker] > 0) ? pricesData[ticker] : 'invalid',
                timestamp: now // We don't get a timestamp from this specific backend route currently
            };

            // --- Log the data we're about to cache ---
             console.log("updatePricesForView: Caching data:", newPriceData); // Log 4: What are we actually putting in the cache?

            state.priceCache.set(ticker, newPriceData);
            pricesUpdated = true;
            console.log("updatePricesForView: Cache updated for", ticker, state.priceCache.get(ticker)); // Log 5: Confirm cache update
        }
        if (!pricesUpdated) {
            console.log("updatePricesForView: No valid price data found in response to process."); // Adjusted log message
        }

    } catch (error) {
        console.error("Error inside updatePricesForView:", error); // Log 6: Catch any errors during the process
        showToast(`Price update failed: ${error.message}`, 'error');
        // Mark prices as error in cache
        tickersToUpdate.forEach(ticker => {
             state.priceCache.set(ticker, { price: 'error', timestamp: Date.now() });
        });
    }
}

// ... (rest of api.js) ...


/**
 * Manually triggers a price update for the current view and then re-renders the price-dependent UI elements.
 * @returns {Promise<void>}
 */
export async function updateAllPrices() {
    let tickersToUpdate = [];
    let dateForUpdate = state.currentView.value; // Typically the date tab value

     if (state.currentView.type === 'date' && state.activityMap.size > 0) {
        tickersToUpdate = [...new Set(Array.from(state.activityMap.values()).map(lot => lot.ticker))];
    } else if (state.currentView.type === 'journal' && state.journalEntries?.openEntries) { // Safely access state
        tickersToUpdate = [...new Set(state.journalEntries.openEntries.map(entry => entry.ticker))];
        // Journal might operate on 'today's' prices regardless of a date tab concept
        dateForUpdate = getCurrentESTDateString(); // Assume journal always uses current prices
    }
    // Add other views like watchlist if they need price updates

    if(tickersToUpdate.length > 0 && dateForUpdate) {
        showToast('Refreshing prices...', 'info', 2000);
        await updatePricesForView(dateForUpdate, tickersToUpdate); // Use the determined date

        // Decide which UI update function to call based on the view
         if (state.currentView.type === 'date') {
            populatePricesFromCache(state.activityMap, state.priceCache);
        } else if (state.currentView.type === 'journal') {
            // Need a similar function for the journal page, e.g., populateJournalPrices()
            // It should be implemented in the journal renderer or helper
            // populateJournalPrices(state.journalEntries.openEntries, state.priceCache); // Example call
            console.log("TODO: Implement price population/update logic for Journal view");
             // TEMP: Reload journal page data which includes price fetching
             const { loadJournalPage } = await import('./event-handlers/_journal.js');
             await loadJournalPage();
        }
    } else {
         console.log("No tickers to update or required date context missing.");
         showToast('No prices to refresh for the current view.', 'info');
    }
}

/**
 * Fetches all active pending orders for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of pending order objects.
 */
export async function fetchPendingOrders(holderId) {
    const response = await fetch(`/api/orders/pending?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches all 'UNREAD' notifications for a given account holder.
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of notification objects.
 */
export async function fetchAlerts(holderId) {
    const response = await fetch(`/api/orders/notifications?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily performance summary for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string} holderId - The ID of the account holder.
 * @returns {Promise<object>} A promise that resolves to the performance data.
 */
export async function fetchDailyPerformance(date, holderId) {
    const response = await fetch(`/api/reporting/daily_performance/${date}?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Fetches the daily transactions and end-of-day positions for a given date and account holder.
 * @param {string} date - The date for the report in 'YYYY-MM-DD' format.
 * @param {string} holderId - The ID of the account holder.
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
 * @param {string} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of snapshot objects.
 */
export async function fetchSnapshots(holderId) {
    const response = await fetch(`/api/utility/snapshots?holder=${holderId}`);
    return handleResponse(response);
}

// --- Advice Source API Functions ---

/**
 * Fetches all advice sources for a given account holder.
 * @param {string} holderId - The ID of the account holder.
 * @returns {Promise<any[]>} A promise that resolves to an array of advice source objects.
 */
export async function fetchAdviceSources(holderId) {
    if (!holderId || holderId === 'all') { // Cannot fetch for 'all'
        // console.warn("A specific account holder ID is required to fetch advice sources.");
        return []; // Return empty array if 'all' or no holder selected
        // throw new Error("Account holder ID is required to fetch advice sources.");
    }
    const response = await fetch(`/api/advice-sources?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Adds a new advice source to the database.
 * @param {object} sourceData - The data for the new advice source.
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
 * @param {object} sourceData - The updated data for the advice source.
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
 * @param {string} holderId - The ID of the account holder ('all' not recommended here).
 * @param {'OPEN' | 'CLOSED' | 'EXECUTED' | 'CANCELLED' | null} [status=null] - Optional status to filter by. If null, fetches 'OPEN' by default based on backend logic.
 * @returns {Promise<any[]>} A promise that resolves to an array of journal entry objects.
 */
export async function fetchJournalEntries(holderId, status = null) {
    if (!holderId || holderId === 'all') {
        // Decide whether to throw error or return empty
        console.warn("A specific account holder ID is required to fetch journal entries.");
        return []; // Return empty array if no specific holder
        // throw new Error("A specific account holder ID is required to fetch journal entries.");
    }
    let url = `/api/journal?holder=${holderId}`;
    if (status) {
        url += `&status=${status}`;
    } // If status is null, backend defaults to OPEN
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
 * @returns {Promise<any>} A promise that resolves to the server's response (including the new transaction ID). */ // <-- Fixed JSDoc closing tag
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