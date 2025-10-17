// /public/event-handlers/_ledger.js
// Version 0.1.11
/**
 * @file Initializes all event listeners for the Transaction Ledger page.
 * @module event-handlers/_ledger
 */
import { state } from '../state.js';
import { refreshLedger } from '../api.js';
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
                if (!th) return;
                const newColumn = th.dataset.sort;
                let newDirection = 'asc';
                if (state.ledgerSort.column === newColumn && state.ledgerSort.direction === 'asc') { newDirection = 'desc'; }
                state.ledgerSort = { column: newColumn, direction: newDirection };
                renderLedgerPage(state.transactions, state.ledgerSort);
            });
        }
        
        const tbody = ledgerTable.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const target = /** @type {HTMLElement} */ (e.target);

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

                const editBtn = /** @type {HTMLElement} */ (target.closest('.modify-btn'));
                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const tx = state.transactions.find(t => t.id == id);
                    if (tx && editModal) {
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
                        
                        const coreFields = /** @type {HTMLElement} */ (document.getElementById('edit-core-fields'));
                        const limitFields = /** @type {HTMLElement} */ (document.getElementById('edit-limit-fields'));
                        const modalTitle = document.getElementById('edit-modal-title');
                        if (modalTitle) modalTitle.textContent = 'Edit Transaction';
                        if (coreFields) coreFields.style.display = 'block';
                        if (limitFields) limitFields.style.display = 'none';
                        editModal.classList.add('visible');
                    }
                }
            });
        }
    }
}