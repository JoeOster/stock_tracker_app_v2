// public/event-handlers/_modals.js
// Version Updated (Added Selective Sell Handler - Task X.5 + Debug Log)
/**
 * @file Initializes all event listeners related to modal dialogs.
 * @module event-handlers/_modals
 */

import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { state } from '../state.js';
import { handleResponse, refreshLedger } from '../api.js'; // Added handleResponse
import { switchView } from './_navigation.js';
import { formatQuantity } from '../ui/formatters.js';

// --- Function to handle Selective Sell Modal Submission ---
function initializeSelectiveSellModalHandler() {
    // ... (selective sell handler code remains the same) ...
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

            // *** ADD DEBUG LOG HERE ***
            console.log('[DEBUG] Selling Quantity from Form:', quantity);
            // **************************

            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !date) {
                 showToast('Please enter valid Quantity, Price, and Date.', 'error');
                 return;
            }
            // Prepare simple payload (assuming backend handles single parent_buy_id)
            const sellDetails = {
                account_holder_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value,
                parent_buy_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value,
                quantity: quantity, // Uses the value read from the input
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
        // ... (edit form logic remains the same) ...
    } // End of editForm handlers

    // --- Initialize Selective Sell Modal Handler ---
    initializeSelectiveSellModalHandler();

} // End of initializeModalHandlers function