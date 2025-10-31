// /public/event-handlers/_modal_edit_transaction.js
/**
 * @file Initializes event handler for the Edit Transaction modal.
 * @module event-handlers/_modal_edit_transaction
 */
import { renderDashboardPage } from '../ui/renderers/_dashboard_render.js';
import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
// UPDATED IMPORTS
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
// END UPDATED IMPORTS
import { switchView } from './_navigation.js';
import { openAndPopulateManageModal } from './_dashboard_init.js';

/**
 * Initializes the event listeners for the Edit Transaction modal form.
 * @returns {void}
 */
export function initializeEditTransactionModalHandler() {
    const editModal = document.getElementById('edit-modal');
    const editForm = /** @type {HTMLFormElement | null} */ (document.getElementById('edit-transaction-form'));
    const managePositionModal = document.getElementById('manage-position-modal');

    if (editForm && editModal) {
        // --- Form Submission ---
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
             // Basic Validation
            const quantityInput = /** @type {HTMLInputElement} */(document.getElementById('edit-quantity'));
            const priceInput = /** @type {HTMLInputElement} */(document.getElementById('edit-price'));
            const limitUpInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'));
            const limitDownInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'));
            const limitUpExpInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'));
            const limitDownExpInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'));

            const quantity = parseFloat(quantityInput.value);
            const price = parseFloat(priceInput.value);
            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
                 showToast('Quantity and Price must be valid positive numbers.', 'error'); return;
            }
            const limitUp = limitUpInput.value ? parseFloat(limitUpInput.value) : null;
            const limitDown = limitDownInput.value ? parseFloat(limitDownInput.value) : null;
            const limitUpExp = limitUpExpInput.value || null;
            const limitDownExp = limitDownExpInput.value || null;

            // Limit validation (only if limits are entered)
            if (limitUp !== null && (isNaN(limitUp) || limitUp <= price)) { return showToast('Take Profit must be greater than Price.', 'error'); }
            if (limitUp !== null && !limitUpExp) { return showToast('Take Profit needs an Expiration Date.', 'error'); }
            if (limitDown !== null && (isNaN(limitDown) || limitDown <= 0 || limitDown >= price)) { return showToast('Stop Loss must be positive and less than Price.', 'error'); }
            if (limitDown !== null && !limitDownExp) { return showToast('Stop Loss needs an Expiration Date.', 'error'); }


            const accountHolderId = (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value;
            const ticker = (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value.toUpperCase().trim();
            const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value;

            if (!accountHolderId || !ticker || !exchange) {
                 showToast('Account Holder, Ticker, and Exchange are required.', 'error'); return;
            }
            
            const adviceSourceId = (/** @type {HTMLSelectElement} */(document.getElementById('edit-advice-source'))).value;

            const updatedTransaction = {
                account_holder_id: accountHolderId,
                ticker: ticker,
                exchange: exchange,
                transaction_type: (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value,
                quantity: quantity,
                price: price,
                transaction_date: (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value,
                limit_price_up: limitUp,
                limit_up_expiration: limitUpExp,
                limit_price_down: limitDown,
                limit_down_expiration: limitDownExp,
                limit_price_up_2: null, // Note: This field is not in the edit modal, so it's set to null
                limit_up_expiration_2: null,
                advice_source_id: adviceSourceId || null
            };

            const submitButton = /** @type {HTMLButtonElement | null} */ (editForm.querySelector('button[type="submit"]'));
            if (submitButton) submitButton.disabled = true;

            try {
                const response = await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTransaction) });
                await handleResponse(response);
                showToast('Transaction updated!', 'success');

                // Refresh Manage Modal if Open
                if (managePositionModal?.classList.contains('visible')) {
                    if (typeof openAndPopulateManageModal === 'function') {
                        await openAndPopulateManageModal(ticker, exchange, accountHolderId);
                    } else {
                         console.warn('openAndPopulateManageModal function not available for refresh.');
                    }
                }

                editModal?.classList.remove('visible'); // Close edit modal

                // Refresh underlying view
                if (state.currentView.type === 'ledger') {
                    await refreshLedger();
                } else if (state.currentView.type === 'dashboard' || state.currentView.type === 'date') {
                    await switchView(state.currentView.type, state.currentView.value);
                }

            } catch (error) {
                const err = /** @type {Error} */ (error);
                showToast(`Error updating transaction: ${err.message}`, 'error');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });

        // --- Edit Modal - Clear Limit Buttons ---
        editModal.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('clear-limit-btn')) {
                 const targetType = target.dataset.target; // 'up' or 'down'
                 if (targetType === 'up') {
                     (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = '';
                     (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = '';
                 } else if (targetType === 'down') {
                     (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = '';
                     (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = '';
                 }
            }
        });

        // --- Edit Modal - Delete Button ---
         const deleteEditBtn = document.getElementById('edit-modal-delete-btn');
         if (deleteEditBtn) {
             deleteEditBtn.addEventListener('click', async () => {
                 const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
                 if (!id) return;
                  // Get details BEFORE deleting for potential refresh
                  const accountHolderId = (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value;
                  const ticker = (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value.toUpperCase().trim();
                  const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value;

                 showConfirmationModal('Delete Transaction?', 'This is permanent and cannot be undone.', async () => {
                     try {
                         const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                         await handleResponse(res);
                         showToast('Transaction deleted.', 'success');

                         // Refresh Manage Modal if Open
                         if (managePositionModal?.classList.contains('visible')) {
                             if (typeof openAndPopulateManageModal === 'function') {
                                 await openAndPopulateManageModal(ticker, exchange, accountHolderId);
                             } else {
                                  console.warn('openAndPopulateManageModal function not available for refresh.');
                             }
                         }

                         editModal?.classList.remove('visible'); // Close edit modal

                         // Refresh underlying view
                    if (state.currentView.type === 'ledger') {
                        await refreshLedger();
                    } else if (state.currentView.type === 'dashboard') {
                        // Call the dashboard renderer directly to force a reload
                        await renderDashboardPage();
                    } else {
                        // Use switchView for other cases (like 'date' view)
                        await switchView(state.currentView.type, state.currentView.value);
                    }
                     } catch (err) {
                         const error = /** @type {Error} */ (err);
                         showToast(`Failed to delete: ${error.message}`, 'error');
                     }
                 });
             });
         }
    } else {
        console.warn("Edit transaction form or modal not found.");
    }
}
