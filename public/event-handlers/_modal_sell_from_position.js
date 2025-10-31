// /public/event-handlers/_modal_sell_from_position.js
/**
 * @file Initializes event handler for the Sell From Position (single lot) modal.
 * @module event-handlers/_modal_sell_from_position
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
// --- MODIFIED IMPORTS ---
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
// import { switchView } from './_navigation.js'; // No longer needed
import { loadDashboardPage } from './_dashboard_loader.js'; // <-- ADDED
import { loadDailyReportPage } from './_dailyReport.js'; // <-- ADDED
import { openAndPopulateManageModal } from './_dashboard_init.js';
// --- END MODIFIED IMPORTS ---

/**
 * Initializes the event listener for the Sell From Position modal form submission.
 * @returns {void}
 */
export function initializeSellFromPositionModalHandler() {
    const sellFromPositionModal = document.getElementById('sell-from-position-modal');
    const sellFromPositionForm = /** @type {HTMLFormElement | null} */ (document.getElementById('sell-from-position-form'));
    const managePositionModal = document.getElementById('manage-position-modal');

    if (sellFromPositionForm && sellFromPositionModal) {
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
                 const err = /** @type {Error} */ (error);
                showToast(`Failed to log sale: ${err.message}`, 'error');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    } else {
        console.warn("Sell from position form or modal not found.");
    }
}