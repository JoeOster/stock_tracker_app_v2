 
// /public/event-handlers/_orders_modals.js
/**
 * @file Initializes event handlers for modals related to the Orders page.
 * @module event-handlers/_orders_modals
 */

import { switchView } from './_navigation.js';
import { showToast } from '../ui/helpers.js';

/**
 * Initializes event listeners for the "Confirm Fill" modal form.
 * @returns {void}
 */
export function initializeOrdersModalHandlers() {
    const confirmFillForm = /** @type {HTMLFormElement} */ (document.getElementById('confirm-fill-form'));

    if (confirmFillForm) {
        confirmFillForm.addEventListener('submit', async (e) => {
            // Submit logic
            e.preventDefault();
            const submitButton = /** @type {HTMLButtonElement} */ (confirmFillForm.querySelector('button[type="submit"]'));
            const executionPrice = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('fill-execution-price'))).value);
            const executionDate = (/** @type {HTMLInputElement} */(document.getElementById('fill-execution-date'))).value;
            if (isNaN(executionPrice) || executionPrice <= 0 || !executionDate) {
                 return showToast('Please enter a valid positive Execution Price and Execution Date.', 'error');
            }
            submitButton.disabled = true;
            const pendingOrderId = (/** @type {HTMLInputElement} */(document.getElementById('fill-pending-order-id'))).value;
            const newTransaction = {
                account_holder_id: (/** @type {HTMLInputElement} */(document.getElementById('fill-account-holder-id'))).value,
                ticker: (/** @type {HTMLInputElement} */(document.getElementById('fill-ticker'))).value,
                exchange: (/** @type {HTMLInputElement} */(document.getElementById('fill-exchange'))).value,
                quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('fill-quantity'))).value),
                price: executionPrice,
                transaction_date: executionDate,
                transaction_type: 'BUY'
                // Note: advice_source_id from the pending order should be added here
                // if we link pending orders to sources. This requires backend change.
            };
            try {
                const updateRes = await fetch(`/api/orders/pending/${pendingOrderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'FILLED' })
                });
                if (!updateRes.ok) {
                    const err = await updateRes.json();
                    throw new Error(err.message || 'Failed to update pending order status.');
                }
                const createRes = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTransaction)
                });
                if (!createRes.ok) {
                    const err = await createRes.json();
                    console.warn(`Transaction creation failed for filled order ${pendingOrderId}. Attempting rollback...`);
                    await fetch(`/api/orders/pending/${pendingOrderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'ACTIVE' })
                    });
                    throw new Error(err.message || 'Failed to create new transaction. Order status reverted.');
                }
                const confirmFillModal = document.getElementById('confirm-fill-modal');
                if (confirmFillModal) confirmFillModal.classList.remove('visible');
                showToast('Order filled and transaction logged!', 'success');
                await switchView('orders', null);
            } catch (error) {
                const err = /** @type {Error} */ (error);
                showToast(`Error: ${err.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    } else {
         console.warn("[Orders Init] Confirm fill form not found.");
    }
}