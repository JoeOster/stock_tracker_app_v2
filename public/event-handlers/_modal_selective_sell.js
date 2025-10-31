// /public/event-handlers/_modal_selective_sell.js
/**
 * @file Initializes event handler for the Selective Sell modal.
 * @module event-handlers/_modal_selective_sell
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
// --- MODIFIED IMPORTS ---
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
// import { switchView } from './_navigation.js'; // No longer needed
import { loadDashboardPage } from './_dashboard_loader.js'; // <-- ADDED
import { loadDailyReportPage } from './_dailyReport.js'; // <-- ADDED
// --- END MODIFIED IMPORTS ---

/**
 * Initializes the event listener for the Selective Sell modal form submission.
 * @returns {void}
 */
export function initializeSelectiveSellModalHandler() {
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
                
                // --- THIS IS THE FIX ---
                // Refresh underlying view by calling its specific loader
                if (state.currentView.type === 'dashboard') {
                    await loadDashboardPage(); // <-- Call dashboard loader directly
                } else if (state.currentView.type === 'date') {
                    await loadDailyReportPage(state.currentView.value); // <-- Call daily report loader
                } else if (state.currentView.type === 'ledger') {
                    await refreshLedger();
                }
                // --- END FIX ---

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