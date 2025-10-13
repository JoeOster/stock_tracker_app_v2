// public/event-handlers/_ledger.js
import { state } from '../state.js';
import { refreshLedger } from '../app-main.js';
import { renderLedger } from '../ui/renderers.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';

/**
 * Initializes all event listeners for the Transaction Ledger page.
 * This includes table filtering, sorting, and actions for editing or deleting individual transactions.
 * @returns {void}
 */
export function initializeLedgerHandlers() {
    const ledgerTable = document.querySelector('#ledger-table');
    const ledgerFilterTicker = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-ticker'));
    const ledgerFilterStart = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-start'));
    const ledgerFilterEnd = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-end'));
    const ledgerClearFiltersBtn = document.getElementById('ledger-clear-filters-btn');
    const editModal = document.getElementById('edit-modal');

    // --- Ledger Filter Listeners ---
    const applyLedgerFilters = () => renderLedger(state.allTransactions, state.ledgerSort);
    if(ledgerFilterTicker) ledgerFilterTicker.addEventListener('input', applyLedgerFilters);
    if(ledgerFilterStart) ledgerFilterStart.addEventListener('input', applyLedgerFilters);
    if(ledgerFilterEnd) ledgerFilterEnd.addEventListener('input', applyLedgerFilters);
    if(ledgerClearFiltersBtn) {
        ledgerClearFiltersBtn.addEventListener('click', () => {
            ledgerFilterTicker.value = '';
            ledgerFilterStart.value = '';
            ledgerFilterEnd.value = '';
            applyLedgerFilters();
        });
    }

    // --- Ledger Table Listeners (Sorting, Edit, Delete) ---
    if(ledgerTable) {
        // Handles sorting when a table header is clicked.
        ledgerTable.querySelector('thead').addEventListener('click', (e) => {
            const th = /** @type {HTMLElement} */ ((/** @type {HTMLElement} */ (e.target)).closest('th[data-sort]'));
            if (!th) return;
            const newColumn = th.dataset.sort;
            let newDirection = 'asc';
            if (state.ledgerSort.column === newColumn && state.ledgerSort.direction === 'asc') { newDirection = 'desc'; }
            state.ledgerSort = { column: newColumn, direction: newDirection };
            renderLedger(state.allTransactions, state.ledgerSort);
        });

        // Handles edit and delete button clicks within the table body.
        ledgerTable.querySelector('tbody').addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);

            // --- Delete Button Handler ---
            const deleteBtn = /** @type {HTMLElement} */ (target.closest('.delete-btn'));
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                    try {
                        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Server error');
                        showToast('Transaction deleted.', 'success');
                        await refreshLedger();
                    } catch (err) { showToast('Failed to delete.', 'error'); }
                });
            }

            // --- Edit Button Handler ---
            const editBtn = /** @type {HTMLElement} */ (target.closest('.modify-btn'));
            if (editBtn) {
                const id = editBtn.dataset.id;
                const tx = state.allTransactions.find(t => t.id == id);
                if (tx) {
                    // Populate the shared edit modal with the transaction's data.
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value = String(tx.id);
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value = String(tx.account_holder_id);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value = tx.transaction_date;
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value = tx.ticker;
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value = tx.exchange;
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value = tx.transaction_type;
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value = String(tx.quantity);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value = String(tx.price);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = String(tx.limit_price_up || '');
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = tx.limit_up_expiration || '';
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = String(tx.limit_price_down || '');
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = tx.limit_down_expiration || '';
                    
                    // Configure modal for editing core transaction details.
                    const coreFields = /** @type {HTMLElement} */ (document.getElementById('edit-core-fields'));
                    const limitFields = /** @type {HTMLElement} */ (document.getElementById('edit-limit-fields'));
                    const modalTitle = document.getElementById('edit-modal-title');
                    modalTitle.textContent = 'Edit Transaction';
                    coreFields.style.display = 'block';
                    limitFields.style.display = 'none';
                    editModal.classList.add('visible');
                }
            }
        });
    }
}