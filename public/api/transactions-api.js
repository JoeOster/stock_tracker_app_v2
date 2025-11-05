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
    const holderId =
      state.selectedAccountHolderId === 'all'
        ? 'all'
        : String(state.selectedAccountHolderId);
    const res = await fetch(`/api/transactions?holder=${holderId}`);
    const transactions = await handleResponse(res);
    updateState({ transactions: transactions }); // Update state

    // Only render the ledger page if the ledger view is currently active
    if (state.currentView.type === 'ledger') {
      renderLedgerPage(state.transactions, state.ledgerSort);
    }
  } catch (error) {
    console.error('Failed to refresh ledger:', error);
    // @ts-ignore
    showToast(`Failed to refresh ledger: ${error.message}`, 'error');
    updateState({ transactions: [] }); // Clear state on error
    // Only render the ledger page if the ledger view is currently active
    if (state.currentView.type === 'ledger') {
      renderLedgerPage([], state.ledgerSort); // Render empty ledger
    }
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
    throw new Error(
      'Buy ID and a specific Account Holder ID are required to fetch sales.'
    );
  }
  const response = await fetch(
    `/api/transactions/sales/${buyId}?holder=${holderId}`
  );
  return handleResponse(response);
}

// --- ADDED: New function for Task 1.3 ---
/**
 * Fetches the combined sales history for multiple parent BUY lot IDs.
 * @async
 * @param {Array<string|number>} lotIds - An array of parent BUY transaction IDs.
 * @param {string|number} holderId - The ID of the account holder.
 * @returns {Promise<any[]>} A promise resolving to a combined array of sales transaction objects with calculated P/L.
 */
export async function fetchBatchSalesHistory(lotIds, holderId) {
  if (!lotIds || lotIds.length === 0) {
    return []; // Nothing to fetch
  }
  if (!holderId || holderId === 'all') {
    throw new Error(
      'A specific Account Holder ID is required to fetch sales history.'
    );
  }

  const response = await fetch('/api/transactions/sales/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lotIds: lotIds, holderId: holderId }),
  });
  return handleResponse(response);
}
// --- END ADDED ---

/**
 * Fetches a single transaction by its ID from the local state.
 * @async
 * @param {string|number} transactionId - The ID of the transaction to fetch.
 * @param {string|number} holderId - The account holder ID (for verification).
 * @returns {Promise<any>} A promise resolving to the transaction object.
 */
export async function fetchTransactionById(transactionId, holderId) {
  // We are fetching from the state here, as the backend endpoint for a single transaction doesn't exist yet.
  // This is sufficient for the modal's needs.
  console.log(
    `[API] Fetching Tx ID ${transactionId} for holder ${holderId} from state...`
  );
  if (!state.transactions || state.transactions.length === 0) {
    console.log('[API] State transactions empty, calling refreshLedger...');
    await refreshLedger(); // Ensure we have transactions
  }
  // Find the transaction in the *full* ledger state
  const tx = state.transactions.find(
    (t) =>
      String(t.id) === String(transactionId) &&
      String(t.account_holder_id) === String(holderId)
  );

  if (!tx) {
    // Fallback: Check dashboard open lots if not found in ledger
    const dashLot = state.dashboardOpenLots.find(
      (t) =>
        String(t.id) === String(transactionId) &&
        String(t.account_holder_id) === String(holderId)
    );
    if (dashLot) {
      console.warn(
        `[API] Found Tx ID ${transactionId} in dashboard state, but not ledger state.`
      );
      return dashLot;
    }

    throw new Error(
      'Transaction not found or does not belong to this account holder.'
    );
  }
  return tx;
}

/**
 * Deletes a transaction by its ID.
 * @async
 * @param {string|number} transactionId - The ID of the transaction to delete.
 * @param {string|number} holderId - The account holder ID (for verification).
 * @returns {Promise<any>} A promise resolving to the server's response.
 */
export async function deleteTransaction(transactionId, holderId) {
  // The backend route /api/transactions/:id handles the deletion.
  const response = await fetch(`/api/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_holder_id: holderId }),
  });
  return handleResponse(response);
}
