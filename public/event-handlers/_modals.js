// public/event-handlers/_modals.js
// Version Updated (Refresh Manage Modal on child save)
/**
 * @file Initializes all event listeners related to modal dialogs.
 * @module event-handlers/_modals
 */

import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { state } from '../state.js';
import { handleResponse, refreshLedger } from '../api.js';
import { switchView } from './_navigation.js';
import { formatQuantity } from '../ui/formatters.js';
// --- Import the function to refresh the Manage modal ---
import { openAndPopulateManageModal } from './_dashboard_init.js';

// --- Function to handle Selective Sell Modal Submission ---
function initializeSelectiveSellModalHandler() {
    // ... (selective sell handler code remains the same) ...
}


/**
 * Initializes all event listeners related to modal dialogs.
 */
export function initializeModalHandlers() {
    const editModal = document.getElementById('edit-modal');
    const editForm = /** @type {HTMLFormElement} */ (document.getElementById('edit-transaction-form'));
    const sellFromPositionModal = document.getElementById('sell-from-position-modal'); // Get sell modal element
    const sellFromPositionForm = /** @type {HTMLFormElement} */ (document.getElementById('sell-from-position-form'));
    const managePositionModal = document.getElementById('manage-position-modal'); // Get manage modal element

    // --- Generic Modal Closing Listeners ---
    // ... (Closing listeners remain the same) ...
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', e =>
            (/** @type {HTMLElement} */ (e.target)).closest('.modal')?.classList.remove('visible')
        )
    );
    document.querySelectorAll('.modal').forEach(modal => {
         modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.classList.remove('visible');
            }
        });
    })


    // --- Sell From Position Modal (Single Lot) ---
    if(sellFromPositionForm) {
        sellFromPositionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const quantity = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('sell-quantity'))).value);
            const price = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('sell-price'))).value);
            const date = (/** @type {HTMLInputElement} */(document.getElementById('sell-date'))).value;
            console.log('[DEBUG] Selling Quantity from Form:', quantity);
            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !date) { /* ... validation ... */ return; }

            const accountHolderId = (/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value;
            const ticker = document.getElementById('sell-ticker-display').textContent || ''; // Get ticker
            const exchange = document.getElementById('sell-exchange-display').textContent || ''; // Get exchange

            const sellDetails = {
                account_holder_id: accountHolderId,
                parent_buy_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value,
                quantity: quantity,
                price: price,
                transaction_date: date,
                ticker: ticker, // Include ticker
                exchange: exchange, // Include exchange
                transaction_type: 'SELL',
            };
            const submitButton = /** @type {HTMLButtonElement} */ (sellFromPositionForm.querySelector('button[type="submit"]'));
            submitButton.disabled = true;
            try {
                const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sellDetails) });
                await handleResponse(response);
                showToast('Sale logged successfully!', 'success');

                // --- START REFRESH LOGIC ---
                // Check if the manage position modal is currently open
                if (managePositionModal?.classList.contains('visible')) {
                    // Refresh the manage position modal before closing the sell modal
                    await openAndPopulateManageModal(ticker, exchange, accountHolderId);
                }
                // --- END REFRESH LOGIC ---

                sellFromPositionModal?.classList.remove('visible'); // Close sell modal
                await switchView(state.currentView.type, state.currentView.value); // Refresh underlying dashboard/view
            } catch (error) {
                showToast(`Failed to log sale: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // --- Edit Transaction Modal ---
    if(editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
            // ... (Validation logic remains the same) ...
             const quantity = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value);
             const price = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value);
             if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) { showToast('Invalid Quantity or Price.', 'error'); return; }
             const limitUp = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value) || null;
             const limitDown = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value) || null;
             const limitUpExp = (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value || null;
             const limitDownExp = (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value || null;
             if (limitUp && (isNaN(limitUp) || limitUp <= price)) { return showToast('Take Profit must be greater than Price.', 'error'); }
             if (limitUp && !limitUpExp) { return showToast('Take Profit needs an Expiration Date.', 'error'); }
             if (limitDown && (isNaN(limitDown) || limitDown >= price || limitDown <= 0)) { return showToast('Stop Loss must be positive and less than Price.', 'error'); }
             if (limitDown && !limitDownExp) { return showToast('Stop Loss needs an Expiration Date.', 'error'); }


            const accountHolderId = (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value;
            const ticker = (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value.toUpperCase().trim();
            const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value;

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
            };

            const submitButton = /** @type {HTMLButtonElement} */ (editForm.querySelector('button[type="submit"]'));
            submitButton.disabled = true;
            try {
                const response = await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTransaction) });
                await handleResponse(response);
                showToast('Transaction updated!', 'success');

                // --- START REFRESH LOGIC ---
                // Check if the manage position modal is currently open
                if (managePositionModal?.classList.contains('visible')) {
                    // Refresh the manage position modal before closing the edit modal
                    await openAndPopulateManageModal(ticker, exchange, accountHolderId);
                }
                // --- END REFRESH LOGIC ---

                editModal?.classList.remove('visible'); // Close edit modal

                // Refresh appropriate underlying view (Ledger or Dashboard)
                if (state.currentView.type === 'ledger') {
                    await refreshLedger();
                } else if (state.currentView.type === 'dashboard' || state.currentView.type === 'date') {
                    await switchView(state.currentView.type, state.currentView.value);
                }
            } catch (error) {
                showToast(`Error updating transaction: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });

        // --- Edit Modal - Clear Limit Buttons ---
        editModal?.addEventListener('click', (e) => { /* ... remains the same ... */ });

        // --- Edit Modal - Delete Button ---
         const deleteEditBtn = document.getElementById('edit-modal-delete-btn');
         if (deleteEditBtn) {
             deleteEditBtn.addEventListener('click', async () => {
                 // ... (delete logic remains the same, but maybe add refresh for manage modal?) ...
                 const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
                 if (!id) return;
                  // Get details BEFORE deleting for potential refresh
                  const accountHolderId = (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value;
                  const ticker = (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value.toUpperCase().trim();
                  const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value;

                 showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                     try {
                         const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                         await handleResponse(res);

                         showToast('Transaction deleted.', 'success');

                         // --- START REFRESH LOGIC FOR DELETE ---
                         if (managePositionModal?.classList.contains('visible')) {
                             // Refresh manage modal if it was open
                             await openAndPopulateManageModal(ticker, exchange, accountHolderId);
                         }
                         // --- END REFRESH LOGIC FOR DELETE ---

                         editModal?.classList.remove('visible'); // Close edit modal AFTER potential refresh

                         // Refresh underlying view
                         if (state.currentView.type === 'ledger') { await refreshLedger(); }
                         else { await switchView(state.currentView.type, state.currentView.value); }
                     } catch (err) {
                         showToast(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`, 'error');
                     }
                 });
             });
         }
    } // End of editForm handlers

    // --- Initialize Selective Sell Modal Handler ---
    initializeSelectiveSellModalHandler();

} // End of initializeModalHandlers function