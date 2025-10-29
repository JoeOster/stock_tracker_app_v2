// public/event-handlers/_modals.js
/**
 * @file Initializes all event listeners related to modal dialogs.
 * @module event-handlers/_modals
 */

import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { state } from '../state.js';
import { handleResponse, refreshLedger } from '../api.js';
import { switchView } from './_navigation.js';
import { formatQuantity } from '../ui/formatters.js';
// Import the function to refresh the Manage modal
import { openAndPopulateManageModal } from './_dashboard_init.js'; // Assuming this export exists

/**
 * Initializes the event listener for the Selective Sell modal form submission.
 * @returns {void}
 */
function initializeSelectiveSellModalHandler() {
    const selectiveSellForm = /** @type {HTMLFormElement | null} */ (document.getElementById('selective-sell-form'));
    const selectiveSellModal = document.getElementById('selective-sell-modal'); // Get modal element

    if (selectiveSellForm && selectiveSellModal) {
        selectiveSellForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = /** @type {HTMLButtonElement | null} */ (selectiveSellForm.querySelector('#selective-sell-submit-btn'));
            if (!submitButton) return;

            // --- Get Form Values ---
            const ticker = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-ticker'))).value;
            const exchange = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-exchange'))).value;
            const accountHolderId = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-account-holder-id'))).value;
            const totalQuantityToSell = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('selective-sell-total-quantity'))).value);
            const price = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('selective-sell-price'))).value);
            const date = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-date'))).value;

            // --- Get Lot Quantities ---
            const lotsBody = document.getElementById('selective-sell-lots-body');
            const lotInputs = lotsBody ? Array.from(lotsBody.querySelectorAll('.selective-sell-lot-qty')) : [];
            const lotsPayload = lotInputs.map(input => ({
                parent_buy_id: (/** @type {HTMLInputElement} */(input)).dataset.lotId,
                quantity_to_sell: parseFloat((/** @type {HTMLInputElement} */(input)).value) || 0 // Default to 0 if empty/invalid
            })).filter(lot => lot.quantity_to_sell > 0); // Only send lots with quantity > 0

            // --- Basic Validation ---
            if (isNaN(totalQuantityToSell) || totalQuantityToSell <= 0 || isNaN(price) || price <= 0 || !date || lotsPayload.length === 0) {
                return showToast('Please enter valid Total Quantity, Price, Date, and select quantities from lots.', 'error');
            }
             // Add check for sum matching total
             const sumFromLots = lotsPayload.reduce((sum, lot) => sum + lot.quantity_to_sell, 0);
             if (Math.abs(sumFromLots - totalQuantityToSell) > 0.00001) {
                 return showToast('Total selected quantity from lots does not match the Total Quantity to Sell.', 'error');
             }


            // --- Construct Payload ---
            const sellDetails = {
                account_holder_id: accountHolderId,
                ticker: ticker,
                exchange: exchange,
                transaction_type: 'SELL',
                quantity: totalQuantityToSell, // Send the total quantity
                price: price,
                transaction_date: date,
                lots: lotsPayload // Send the array of lots and quantities
            };

            submitButton.disabled = true;
            try {
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sellDetails)
                });
                await handleResponse(response);
                showToast('Selective sale logged successfully!', 'success');
                selectiveSellModal.classList.remove('visible'); // Close modal
                // Refresh the underlying view (likely Dashboard)
                if (state.currentView.type === 'dashboard' || state.currentView.type === 'date') {
                     await switchView(state.currentView.type, state.currentView.value);
                } else if (state.currentView.type === 'ledger') {
                     await refreshLedger(); // Or ledger if somehow opened from there
                }
            } catch (error) {
                // Assert error as Error type for message access
                const err = /** @type {Error} */ (error);
                showToast(`Failed to log selective sale: ${err.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    } else {
        console.warn("Selective sell form or modal not found.");
    }
}


/**
 * Initializes all event listeners related to modal dialogs.
 * @returns {void}
 */
export function initializeModalHandlers() {
    const editModal = document.getElementById('edit-modal');
    const editForm = /** @type {HTMLFormElement | null} */ (document.getElementById('edit-transaction-form'));
    const sellFromPositionModal = document.getElementById('sell-from-position-modal');
    const sellFromPositionForm = /** @type {HTMLFormElement | null} */ (document.getElementById('sell-from-position-form'));
    const managePositionModal = document.getElementById('manage-position-modal');
    const sourceDetailsModal = document.getElementById('source-details-modal'); // Get new modal

    // --- Generic Modal Closing Listeners ---
    // Top-right 'X' button
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', e => {
            const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
            if (modal) {
                modal.classList.remove('visible');
                // Clear content of source details modal when closed via 'X'
                if (modal.id === 'source-details-modal') {
                    const contentArea = modal.querySelector('#source-details-modal-content');
                    if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
                    const titleArea = modal.querySelector('#source-details-modal-title');
                     if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
                }
            }
        })
    );
    // Bottom 'Close' or 'Cancel' buttons (often have .cancel-btn)
     document.querySelectorAll('.modal .cancel-btn, .modal .close-modal-btn').forEach(btn => // Added .close-modal-btn
        btn.addEventListener('click', e => {
             const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
             if (modal) {
                 modal.classList.remove('visible');
                 // Clear content of source details modal when closed via bottom button
                if (modal.id === 'source-details-modal') {
                    const contentArea = modal.querySelector('#source-details-modal-content');
                    if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
                    const titleArea = modal.querySelector('#source-details-modal-title');
                     if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
                }
             }
        })
    );
    // Background click
    document.querySelectorAll('.modal').forEach(modal => {
         modal.addEventListener('click', e => {
            // Close if clicking on the background overlay
            if (e.target === modal) {
                modal.classList.remove('visible');
                 // Clear content of source details modal when closed via background click
                if (modal.id === 'source-details-modal') {
                    const contentArea = modal.querySelector('#source-details-modal-content');
                    if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
                     const titleArea = modal.querySelector('#source-details-modal-title');
                     if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
                }
            }
        });
    });


    // --- Sell From Position Modal (Single Lot) ---
    if(sellFromPositionForm && sellFromPositionModal) {
        sellFromPositionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const quantityInput = /** @type {HTMLInputElement} */(document.getElementById('sell-quantity'));
            const priceInput = /** @type {HTMLInputElement} */(document.getElementById('sell-price'));
            const dateInput = /** @type {HTMLInputElement} */(document.getElementById('sell-date'));
            const quantity = parseFloat(quantityInput.value);
            const price = parseFloat(priceInput.value);
            const date = dateInput.value;

            // Basic validation
            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !date) {
                showToast('Please enter valid positive numbers for Quantity and Price, and select a Date.', 'error');
                return;
            }

            const accountHolderId = (/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value;
            const ticker = document.getElementById('sell-ticker-display')?.textContent || ''; // Get ticker
            const exchange = document.getElementById('sell-exchange-display')?.textContent || ''; // Get exchange
            const parentBuyId = (/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value;

            if (!ticker || !exchange || !parentBuyId || !accountHolderId) {
                showToast('Error: Missing necessary transaction details (Ticker, Exchange, Parent ID, Holder ID).', 'error');
                return;
            }

            const sellDetails = {
                account_holder_id: accountHolderId,
                parent_buy_id: parentBuyId,
                quantity: quantity,
                price: price,
                transaction_date: date,
                ticker: ticker, // Include ticker
                exchange: exchange, // Include exchange
                transaction_type: 'SELL',
            };
            const submitButton = /** @type {HTMLButtonElement | null} */ (sellFromPositionForm.querySelector('button[type="submit"]'));
            if (submitButton) submitButton.disabled = true;

            try {
                const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sellDetails) });
                await handleResponse(response);
                showToast('Sale logged successfully!', 'success');

                // Refresh Manage Modal if Open
                if (managePositionModal?.classList.contains('visible')) {
                    if (typeof openAndPopulateManageModal === 'function') {
                        await openAndPopulateManageModal(ticker, exchange, accountHolderId);
                    } else {
                        console.warn('openAndPopulateManageModal function not available for refresh.');
                    }
                }

                sellFromPositionModal?.classList.remove('visible'); // Close sell modal
                // Refresh underlying view
                if (state.currentView.type === 'dashboard' || state.currentView.type === 'date') {
                     await switchView(state.currentView.type, state.currentView.value);
                } else if (state.currentView.type === 'ledger') {
                     await refreshLedger();
                }

            } catch (error) {
                 const err = /** @type {Error} */ (error);
                showToast(`Failed to log sale: ${err.message}`, 'error');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    } else {
        console.warn("Sell from position form or modal not found.");
    }

    // --- Edit Transaction Modal ---
    if(editForm && editModal) {
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

        // Edit Modal - Clear Limit Buttons
        editModal?.addEventListener('click', (e) => {
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

        // Edit Modal - Delete Button
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
                         if (state.currentView.type === 'ledger') { await refreshLedger(); }
                         else { await switchView(state.currentView.type, state.currentView.value); }

                     } catch (err) {
                         const error = /** @type {Error} */ (err);
                         showToast(`Failed to delete: ${error.message}`, 'error');
                     }
                 });
             });
         }
    } else {
        console.warn("Edit transaction form or modal not found.");
    } // End of editForm handlers

    // --- Initialize Selective Sell Modal Handler ---
    initializeSelectiveSellModalHandler();

} // End of initializeModalHandlers function