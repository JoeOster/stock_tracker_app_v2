// public/event-handlers/_modals.js
// Version Updated (Added Selective Sell Handler - Task X.5)
/**
 * @file Initializes all event listeners related to modal dialogs.
 * @module event-handlers/_modals
 */

import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { state } from '../state.js';
import { handleResponse, refreshLedger } from '../api.js'; // Added handleResponse
import { switchView } from './_navigation.js';
import { formatQuantity } from '../ui/formatters.js';
// --- NEW: Function to handle Selective Sell Modal Submission ---
function initializeSelectiveSellModalHandler() {
    const selectiveSellModal = document.getElementById('selective-sell-modal');
    const selectiveSellForm = /** @type {HTMLFormElement} */ (document.getElementById('selective-sell-form'));

    if (!selectiveSellForm || !selectiveSellModal) {
        console.warn("Selective sell modal form not found.");
        return;
    }

    selectiveSellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = /** @type {HTMLButtonElement} */(document.getElementById('selective-sell-submit-btn'));
        submitButton.disabled = true; // Disable on submit

        try {
            // --- Gather Data ---
            const ticker = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-ticker'))).value;
            const exchange = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-exchange'))).value;
            const accountHolderId = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-account-holder-id'))).value;
            const salePrice = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('selective-sell-price'))).value);
            const saleDate = (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-date'))).value;
            const totalQtyToSell = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('selective-sell-total-quantity'))).value);

            const lotsToSellFrom = [];
            const lotQtyInputs = selectiveSellForm.querySelectorAll('.selective-sell-lot-qty');
            let selectedTotal = 0;

            lotQtyInputs.forEach(inputEl => {
                const input = /** @type {HTMLInputElement} */(inputEl);
                const qty = parseFloat(input.value) || 0;
                selectedTotal += qty;
                if (qty > 0) {
                    lotsToSellFrom.push({
                        parent_buy_id: input.dataset.lotId,
                        quantity_to_sell: qty
                    });
                }
            });

            // --- Final Validation ---
            if (Math.abs(selectedTotal - totalQtyToSell) > 0.00001 || totalQtyToSell <= 0) {
                throw new Error("Total selected quantity does not match the target sell quantity or is zero.");
            }
            if (isNaN(salePrice) || salePrice <= 0) {
                throw new Error("Invalid Sale Price entered.");
            }
             if (!saleDate) {
                throw new Error("Sale Date is required.");
            }
            if (lotsToSellFrom.length === 0) {
                 throw new Error("No quantities entered for any lot.");
            }

            // --- Prepare Payload for Backend ---
            // This payload assumes a modified backend endpoint that accepts an array of lots.
            const payload = {
                account_holder_id: accountHolderId,
                ticker: ticker,
                exchange: exchange,
                transaction_date: saleDate,
                price: salePrice,
                lots: lotsToSellFrom // Array of { parent_buy_id, quantity_to_sell }
            };

            // --- Call Backend API ---
            // TODO: Adjust endpoint URL if you create a new one (e.g., /api/transactions/sell-multiple)
            const response = await fetch('/api/transactions', { // <<< Using original endpoint for now
                method: 'POST', // Or 'PUT' if modifying logic? POST seems more appropriate for creating SELLs
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Send the structured payload
            });

            await handleResponse(response); // Throws on error

            showToast(`Successfully logged sale of ${formatQuantity(totalQtyToSell)} ${ticker}.`, 'success');
            selectiveSellModal.classList.remove('visible');
            await switchView('dashboard', null); // Refresh dashboard view

        } catch (error) {
            console.error("Error during selective sell submission:", error);
            showToast(`Failed to log sale: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false; // Re-enable button
        }
    });
}


/**
 * Initializes all event listeners related to modal dialogs.
 * This includes generic closing behavior and specific form submission handlers
 * for the Edit Transaction, Sell From Position, Confirm Fill, and Selective Sell modals.
 * @returns {void}
 */
export function initializeModalHandlers() {
    const editModal = document.getElementById('edit-modal');
    const editForm = /** @type {HTMLFormElement} */ (document.getElementById('edit-transaction-form'));
    const sellFromPositionForm = /** @type {HTMLFormElement} */ (document.getElementById('sell-from-position-form'));

    // --- Generic Modal Closing Listeners ---
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', e =>
            (/** @type {HTMLElement} */ (e.target)).closest('.modal')?.classList.remove('visible') // Added null check
        )
    );

    // Close modal if background is clicked
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
            // Basic validation
            const quantity = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('sell-quantity'))).value);
            const price = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('sell-price'))).value);
            const date = (/** @type {HTMLInputElement} */(document.getElementById('sell-date'))).value;
            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !date) {
                 showToast('Please enter valid Quantity, Price, and Date.', 'error');
                 return;
            }
            // Prepare simple payload (assuming backend handles single parent_buy_id)
            const sellDetails = {
                account_holder_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value,
                parent_buy_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value,
                quantity: quantity,
                price: price,
                transaction_date: date,
                ticker: document.getElementById('sell-ticker-display').textContent,
                exchange: document.getElementById('sell-exchange-display').textContent,
                transaction_type: 'SELL',
            };
            const submitButton = /** @type {HTMLButtonElement} */ (sellFromPositionForm.querySelector('button[type="submit"]'));
            submitButton.disabled = true;
            try {
                const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sellDetails) });
                await handleResponse(response); // Use helper
                showToast('Sale logged successfully!', 'success');
                document.getElementById('sell-from-position-modal')?.classList.remove('visible'); // Added null check
                await switchView(state.currentView.type, state.currentView.value); // Refresh current view
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
            // Basic Validation
            const quantity = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value);
            const price = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value);
            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
                showToast('Invalid Quantity or Price.', 'error');
                return;
            }
            // Limit validation
            const limitUp = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value) || null;
            const limitDown = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value) || null;
            const limitUpExp = (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value || null;
            const limitDownExp = (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value || null;

            if (limitUp && (isNaN(limitUp) || limitUp <= price)) { return showToast('Take Profit must be greater than Price.', 'error'); }
            if (limitUp && !limitUpExp) { return showToast('Take Profit needs an Expiration Date.', 'error'); }
            if (limitDown && (isNaN(limitDown) || limitDown >= price || limitDown <= 0)) { return showToast('Stop Loss must be positive and less than Price.', 'error'); }
            if (limitDown && !limitDownExp) { return showToast('Stop Loss needs an Expiration Date.', 'error'); }

            const updatedTransaction = {
                account_holder_id: (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value,
                ticker: (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value.toUpperCase().trim(),
                exchange: (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value,
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
                await handleResponse(response); // Use helper

                editModal?.classList.remove('visible'); // Added null check
                showToast('Transaction updated!', 'success');

                // Refresh appropriate view
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
        editModal?.addEventListener('click', (e) => { // Added null check
            const target = /** @type {HTMLElement} */(e.target);
            const clearBtn = target.closest('.clear-limit-btn');
            if (!clearBtn) return;
            const dataTarget = (/** @type {HTMLElement} */(clearBtn)).dataset.target;
            if (dataTarget === 'up') {
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = '';
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = '';
            } else if (dataTarget === 'down') {
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = '';
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = '';
            }
        });

         // --- Edit Modal - Delete Button ---
         const deleteEditBtn = document.getElementById('edit-modal-delete-btn');
         if (deleteEditBtn) {
             deleteEditBtn.addEventListener('click', async () => {
                 const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
                 if (!id) return;
                 showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                     try {
                         const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                         await handleResponse(res); // Use helper
                         editModal?.classList.remove('visible'); // Added null check
                         showToast('Transaction deleted.', 'success');
                         // Refresh appropriate view
                         if (state.currentView.type === 'ledger') { await refreshLedger(); }
                         else { await switchView(state.currentView.type, state.currentView.value); }
                     } catch (err) {
                         // Error message comes from handleResponse
                         showToast(`Failed to delete: ${err.message}`, 'error');
                     }
                 });
             });
         }
    } // End of editForm handlers

    // --- Initialize Selective Sell Modal Handler --- <<< ADDED
    initializeSelectiveSellModalHandler();

} // End of initializeModalHandlers function