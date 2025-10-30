import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
// /public/event-handlers/_ledger.js
// Version 0.1.13 (Fixed TypeScript type error, Improved delete error toast)
/**
 * @file Initializes all event listeners for the Transaction Ledger page.
 * @module event-handlers/_ledger
 */
import { state } from '../state.js';
// FIX: Import handleResponse from api.js
import { refreshLedger, handleResponse } from '../api.js'; // <-- Import handleResponse
import { renderLedgerPage } from '../ui/renderers/_ledger.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';

/**
 * Initializes all event listeners for the Transaction Ledger page.
 */
export function initializeLedgerHandlers() {
    const ledgerTable = document.querySelector('#ledger-table');
    const ledgerFilterTicker = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-ticker'));
    const ledgerFilterStart = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-start'));
    const ledgerFilterEnd = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-end'));
    const ledgerClearFiltersBtn = document.getElementById('ledger-clear-filters-btn');
    const editModal = document.getElementById('edit-modal');

    const applyLedgerFilters = () => renderLedgerPage(state.transactions, state.ledgerSort);
    if(ledgerFilterTicker) ledgerFilterTicker.addEventListener('input', applyLedgerFilters);
    if(ledgerFilterStart) ledgerFilterStart.addEventListener('input', applyLedgerFilters);
    if(ledgerFilterEnd) ledgerFilterEnd.addEventListener('input', applyLedgerFilters);
    if(ledgerClearFiltersBtn) {
        ledgerClearFiltersBtn.addEventListener('click', () => {
            if(ledgerFilterTicker) ledgerFilterTicker.value = '';
            if(ledgerFilterStart) ledgerFilterStart.value = '';
            if(ledgerFilterEnd) ledgerFilterEnd.value = '';
            applyLedgerFilters();
        });
    }

    if(ledgerTable) {
        const thead = ledgerTable.querySelector('thead');
        if (thead) {
            thead.addEventListener('click', (e) => {
                const th = /** @type {HTMLElement} */ ((/** @type {HTMLElement} */ (e.target)).closest('th[data-sort]'));
                if (!th || !th.dataset.sort) return; // Added check for dataset.sort

                const newColumn = th.dataset.sort;
                let newDirection = 'asc'; // Default direction

                // Check current sort state and toggle direction
                if (state.ledgerSort.column === newColumn && state.ledgerSort.direction === 'asc') {
                    newDirection = 'desc';
                }

                // --- FIX: Explicitly cast the type for TypeScript ---
                state.ledgerSort = {
                    column: newColumn,
                    direction: /** @type {'asc' | 'desc'} */ (newDirection) // Cast here
                };
                // --- END FIX ---

                renderLedgerPage(state.transactions, state.ledgerSort);
            });
        }

        const tbody = ledgerTable.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const target = /** @type {HTMLElement} */ (e.target);

                // --- Delete Button Logic ---
                const deleteBtn = /** @type {HTMLElement} */ (target.closest('.delete-btn'));
                if (deleteBtn && deleteBtn.dataset.id) { // Added check for dataset.id
                    const id = deleteBtn.dataset.id;
                    showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                        try {
                            const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                            // handleResponse will throw on error, extracting server message
                            await handleResponse(res); // Use handleResponse from api.js
                            showToast('Transaction deleted.', 'success');
                            await refreshLedger(); // Refresh data after successful delete
                        } catch (err) {
                             // Display specific error message
                            showToast(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`, 'error');
                        }
                    });
                }

                // --- Edit Button Logic ---
                const editBtn = /** @type {HTMLElement} */ (target.closest('.modify-btn'));
                if (editBtn && editBtn.dataset.id) { // Added check for dataset.id
                    const id = editBtn.dataset.id;
                    // Find the transaction data from the current state
                    const tx = state.transactions.find(t => String(t.id) === id); // Use string comparison

                    if (tx && editModal) {
                        // --- Populate Modal Fields ---
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value = String(tx.id);
                        (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value = String(tx.account_holder_id);
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value = tx.transaction_date;
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value = tx.ticker;
                        (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value = tx.exchange;
                        (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value = tx.transaction_type;
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value = String(tx.quantity);
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value = String(tx.price);
                        // Handle potential null values for limits/expirations
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = String(tx.limit_price_up ?? '');
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = tx.limit_up_expiration ?? '';
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = String(tx.limit_price_down ?? '');
                        (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = tx.limit_down_expiration ?? '';

                        // --- Show/Hide Sections & Set Title ---
                        const coreFields = /** @type {HTMLElement | null} */ (document.getElementById('edit-core-fields'));
                        const limitFields = /** @type {HTMLElement | null} */ (document.getElementById('edit-limit-fields'));
                        const modalTitle = document.getElementById('edit-modal-title');
                        if (modalTitle) modalTitle.textContent = 'Edit Transaction';
                        if (coreFields) coreFields.style.display = 'block'; // Show core fields by default
                        if (limitFields) limitFields.style.display = 'none'; // Hide limit fields initially

                         // --- Ensure fields are editable (might have been disabled by Dashboard modal use) ---
                         const editTickerInput = /** @type {HTMLInputElement | null} */(document.getElementById('edit-ticker'));
                         const editTypeSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('edit-type'));
                         if (editTickerInput) editTickerInput.readOnly = false;
                         if (editTypeSelect) editTypeSelect.disabled = false;

                        editModal.classList.add('visible'); // Show the modal
                    } else if (!tx) {
                        console.warn(`Could not find transaction data in state for ID: ${id}`);
                        showToast('Could not load transaction details for editing.', 'error');
                    }
                }
            });
        }
    }
}

