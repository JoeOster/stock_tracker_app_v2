// /public/api/transactions-api.js
/**
 * @file API calls related to transactions and the ledger.
 * @module api/transactions-api
 */

import { state, updateState } from '../state.js';
import { renderLedgerPage } from '../ui/renderers/_ledger.js';
import { showToast } from '../ui/helpers.js';
import { handleResponse } from './api-helpers.js';

/**
 * Fetches the latest transactions and re-renders the ledger view.
 * @async
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
 * Fetches the sales history for a specific parent BUY lot ID.
 * @async
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
