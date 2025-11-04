// /public/event-handlers/_modal_sell_from_position.js
/**
 * @file Initializes event handler for the Sell From Position (single lot) modal.
 * @module event-handlers/_modal_sell_from_position
 */

import { showToast } from '../ui/helpers.js';
// --- MODIFIED IMPORTS ---
import { handleResponse } from '../api/api-helpers.js';
// --- MODIFIED: Import the correct function name ---
import { openAndPopulateManageModal } from './_dashboard_init.js';
// --- END MODIFIED IMPORTS ---
// --- ADDED: Import new dependencies ---
import { getCurrentESTDateString } from '../ui/datetime.js';
// --- END ADDED ---

// --- ADDED: Extracted populate logic ---
/**
 * Populates the "Sell From Position" modal with lot data.
 * @param {object} lot - The BUY lot object to sell from.
 */
export function populateSellFromPositionModal(lot) {
  const sellModal = document.getElementById('sell-from-position-modal');
  if (!sellModal) return;

  /** @type {HTMLInputElement} */ (
    document.getElementById('sell-parent-buy-id')
  ).value = String(lot.id);
  /** @type {HTMLInputElement} */ (
    document.getElementById('sell-account-holder-id')
  ).value = String(lot.account_holder_id);
  /** @type {HTMLElement} */ (
    document.getElementById('sell-ticker-display')
  ).textContent = lot.ticker;
  /** @type {HTMLElement} */ (
    document.getElementById('sell-exchange-display')
  ).textContent = lot.exchange;
  const sellQuantityInput = /** @type {HTMLInputElement} */ (
    document.getElementById('sell-quantity')
  );
  sellQuantityInput.value = String(lot.quantity_remaining); // Use remaining quantity
  sellQuantityInput.max = String(lot.quantity_remaining);
  /** @type {HTMLInputElement} */ (document.getElementById('sell-date')).value =
    getCurrentESTDateString();

  sellModal.classList.add('visible');
}
// --- END ADDED ---

/**
 * Initializes the event listener for the Sell From Position modal form submission.
 * @returns {void}
 */
export function initializeSellFromPositionModalHandler() {
  const sellFromPositionModal = document.getElementById(
    'sell-from-position-modal'
  );
  const sellFromPositionForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('sell-from-position-form')
  );
  const managePositionModal = document.getElementById('manage-position-modal');

  if (sellFromPositionForm && sellFromPositionModal) {
    sellFromPositionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const quantityInput = /** @type {HTMLInputElement} */ (
        document.getElementById('sell-quantity')
      );
      const priceInput = /** @type {HTMLInputElement} */ (
        document.getElementById('sell-price')
      );
      const dateInput = /** @type {HTMLInputElement} */ (
        document.getElementById('sell-date')
      );
      const quantity = parseFloat(quantityInput.value);
      const price = parseFloat(priceInput.value);
      const date = dateInput.value;

      // Basic validation
      if (
        isNaN(quantity) ||
        quantity <= 0 ||
        isNaN(price) ||
        price <= 0 ||
        !date
      ) {
        showToast(
          'Please enter valid positive numbers for Quantity and Price, and select a Date.',
          'error'
        );
        return;
      }

      const accountHolderId = /** @type {HTMLInputElement} */ (
        document.getElementById('sell-account-holder-id')
      ).value;
      const ticker =
        document.getElementById('sell-ticker-display')?.textContent || ''; // Get ticker
      const exchange =
        document.getElementById('sell-exchange-display')?.textContent || ''; // Get exchange
      const parentBuyId = /** @type {HTMLInputElement} */ (
        document.getElementById('sell-parent-buy-id')
      ).value;

      if (!ticker || !exchange || !parentBuyId || !accountHolderId) {
        showToast(
          'Error: Missing necessary transaction details (Ticker, Exchange, Parent ID, Holder ID).',
          'error'
        );
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
      const submitButton = /** @type {HTMLButtonElement | null} */ (
        sellFromPositionForm.querySelector('button[type="submit"]')
      );
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sellDetails),
        });
        await handleResponse(response);
        showToast('Sale logged successfully!', 'success');

        // --- START FIX: Dispatch a global event so the source modal knows to refresh ---
        document.dispatchEvent(new CustomEvent('sourceDetailsShouldRefresh'));
        // --- END FIX ---

        // Refresh Manage Modal if Open
        if (managePositionModal?.classList.contains('visible')) {
          if (typeof openAndPopulateManageModal === 'function') {
            await openAndPopulateManageModal(ticker, exchange, accountHolderId);
          } else {
            console.warn(
              'openAndPopulateManageModal function not available for refresh.'
            );
          }
        }

        sellFromPositionModal?.classList.remove('visible'); // Close sell modal

        // --- THIS IS THE FIX: Dispatch a global event to trigger a dashboard refresh ---
        document.dispatchEvent(new CustomEvent('dashboardUpdated'));
        // --- END FIX ---
      } catch (error) {
        const err = /** @type {Error} */ (error);
        showToast(`Failed to log sale: ${err.message}`, 'error');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  } else {
    console.warn('Sell from position form or modal not found.');
  }
}
