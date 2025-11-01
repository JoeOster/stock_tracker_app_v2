// /public/event-handlers/_research_sources_handlers.js
/**
 * @file This file is now primarily for handling actions that
 * require opening OTHER modals from the Source Details modal,
 * such as the 'Edit Transaction' modal.
 * @module event-handlers/_research_sources_handlers
 */

import { state } from '../state.js';
// All logic for journal, notes, and docs has been
// moved to their respective _research_sources_actions_*.js files.

/**
 * Populates the 'Edit Transaction' modal with data from a transaction row.
 * @param {string} transactionId - The ID of the transaction to edit.
 */
function populateAndShowEditModal(transactionId) {
    const tx = state.transactions.find(t => String(t.id) === transactionId);
    const editModal = document.getElementById('edit-modal');
    if (!tx || !editModal) {
        console.error(`Transaction not found in state with ID: ${transactionId}`);
        return;
    }

    // --- Populate Modal Fields ---
    (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value = String(tx.id);
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value = String(tx.account_holder_id);
    (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value = tx.transaction_date;
    (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value = tx.ticker;
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value = tx.exchange;
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value = tx.transaction_type;
    (/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value = String(tx.quantity);
    (/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value = String(tx.price);
    
    // Limits
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = String(tx.limit_price_up ?? '');
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = tx.limit_up_expiration ?? '';
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = String(tx.limit_price_down ?? '');
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = tx.limit_down_expiration ?? '';
    
    // Advice Source
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-advice-source'))).value = String(tx.advice_source_id ?? '');

    // --- Show/Hide Sections & Set Title ---
    const coreFields = /** @type {HTMLElement | null} */ (document.getElementById('edit-core-fields'));
    const limitFields = /** @type {HTMLElement | null} */ (document.getElementById('edit-limit-fields'));
    const modalTitle = document.getElementById('edit-modal-title');
    
    if (modalTitle) modalTitle.textContent = 'Edit Transaction';
    if (coreFields) coreFields.style.display = 'block';
    // Hide limit fields; this modal is for basic edits.
    // Full limit editing is on the Dashboard/Ledger.
    if (limitFields) limitFields.style.display = 'none';

    // --- Disable fields that shouldn't be edited from this context ---
    const editTickerInput = /** @type {HTMLInputElement | null} */(document.getElementById('edit-ticker'));
    const editTypeSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('edit-type'));
    if (editTickerInput) editTickerInput.readOnly = true; // Don't allow changing ticker
    if (editTypeSelect) editTypeSelect.disabled = true; // Don't allow changing type

    editModal.classList.add('visible'); // Show the modal
}


/**
 * Initializes click handlers for the Source Details modal that
 * need to open OTHER modals (e.g., Edit Transaction).
 * @param {HTMLElement} contentArea - The content area of the modal.
 */
export function initializeSourceModalSubHandlers(contentArea) {
    contentArea.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        
        // --- Edit Transaction Button ---
        const editTxBtn = target.closest('.edit-transaction-btn');
        if (editTxBtn) {
            const transactionId = (/** @type {HTMLElement} */(editTxBtn)).dataset.id;
            if (transactionId) {
                populateAndShowEditModal(transactionId);
            }
            return;
        }
    });
}