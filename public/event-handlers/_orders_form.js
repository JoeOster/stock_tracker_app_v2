import { refreshLedger } from '../api/transactions-api.js';
import { addPendingOrder, fetchPendingOrders } from '../api/orders-api.js';
// /public/event-handlers/_orders_form.js
/**
 * @file Initializes event handlers for the "Log Executed Trade" form on the Orders page.
 * @module event-handlers/_orders_form
 */

import { state, updateState, dispatchDataUpdate } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { loadWatchlistPage } from './_watchlist.js';
import { renderPendingOrdersTable } from '../ui/renderers/_orders_render.js';

/**
 * Initializes event listeners for the "Log Executed Trade" form.
 * @returns {void}
 */
export function initializeOrdersFormHandlers() {
  const transactionForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('add-transaction-form')
  );

  if (transactionForm) {
    const transactionTypeSelect = /** @type {HTMLSelectElement} */ (
      document.getElementById('transaction-type')
    );
    const limitOrderGroups = document.querySelectorAll('.limit-order-group');

    transactionTypeSelect.addEventListener('change', () => {
      if (transactionTypeSelect.value === 'DIVIDEND') {
        limitOrderGroups.forEach(
          (group) => /** @type {HTMLElement} */ (group.style.display = 'none')
        );
      } else {
        limitOrderGroups.forEach(
          (group) => /** @type {HTMLElement} */ (group.style.display = '')
        );
      }
    });

    const priceInput = /** @type {HTMLInputElement} */ (
      document.getElementById('price')
    );

    // Suggest limits based on price input
    priceInput.addEventListener('change', () => {
      if (priceInput.readOnly) return; // Don't suggest if pre-filled

      const price = parseFloat(priceInput.value);
      if (!price || isNaN(price) || price <= 0) return;
      const takeProfitPercent = state.settings.takeProfitPercent;
      const stopLossPercent = state.settings.stopLossPercent;
      const suggestedProfit = price * (1 + takeProfitPercent / 100);
      const suggestedLoss = price * (1 - stopLossPercent / 100);
      /** @type {HTMLInputElement} */ (
        document.getElementById('add-limit-price-up')
      ).value = suggestedProfit.toFixed(2);
      /** @type {HTMLInputElement} */ (
        document.getElementById('add-limit-price-down')
      ).value = suggestedLoss.toFixed(2);
    });

    // Form submission with validation
    transactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // --- Get Base Values ---
      const accountHolder = /** @type {HTMLSelectElement} */ (
        document.getElementById('add-tx-account-holder')
      ).value;
      const transactionDate = /** @type {HTMLInputElement} */ (
        document.getElementById('transaction-date')
      ).value;
      const ticker = /** @type {HTMLInputElement} */ (
        document.getElementById('ticker')
      ).value
        .toUpperCase()
        .trim();
      const exchange = /** @type {HTMLSelectElement} */ (
        document.getElementById('exchange')
      ).value;
      const transactionType = /** @type {HTMLSelectElement} */ (
        document.getElementById('transaction-type')
      ).value;
      const quantity = parseFloat(
        /** @type {HTMLInputElement} */ (document.getElementById('quantity'))
          .value
      );
      const price = parseFloat(
        /** @type {HTMLInputElement} */ (document.getElementById('price')).value
      );

      if (
        !accountHolder ||
        !transactionDate ||
        !ticker ||
        !exchange ||
        !transactionType ||
        isNaN(quantity) ||
        quantity <= 0 ||
        isNaN(price) ||
        price <= 0
      ) {
        return showToast(
          'Please fill in all required fields (*) with valid positive numbers for quantity and price.',
          'error'
        );
      }

      // --- Get advice_source_id ---
      const adviceSourceId =
        /** @type {HTMLSelectElement} */ (
          document.getElementById('add-tx-advice-source')
        ).value || null;

      // --- *** THIS IS THE FIX: Read from the hidden form input *** ---
      const linkedJournalId =
        /** @type {HTMLInputElement} */ (
          document.getElementById('add-tx-linked-journal-id')
        ).value || null;
      // --- *** END FIX *** ---

      const transaction = {
        account_holder_id: accountHolder,
        transaction_date: transactionDate,
        ticker: ticker,
        exchange: exchange,
        transaction_type: transactionType,
        quantity: quantity,
        price: price,
        advice_source_id: adviceSourceId,
        linked_journal_id: linkedJournalId,
      };

      if (transactionType !== 'DIVIDEND') {
        // --- Get TP1 Values & Validate ---
        const isProfitLimitSet = /** @type {HTMLInputElement} */ (
          document.getElementById('set-profit-limit-checkbox')
        ).checked;
        const profitPrice = parseFloat(
          /** @type {HTMLInputElement} */ (
            document.getElementById('add-limit-price-up')
          ).value
        );
        const profitExpirationDate = /** @type {HTMLInputElement} */ (
          document.getElementById('add-limit-up-expiration')
        ).value;
        if (isProfitLimitSet && (isNaN(profitPrice) || profitPrice <= price)) {
          return showToast(
            'Take Profit 1 price must be a valid number greater than the purchase price.',
            'error'
          );
        }
        if (isProfitLimitSet && !profitExpirationDate) {
          return showToast(
            'A Take Profit 1 limit requires an expiration date.',
            'error'
          );
        }

        // --- Get Stop Loss Values & Validate ---
        const isLossLimitSet = /** @type {HTMLInputElement} */ (
          document.getElementById('set-loss-limit-checkbox')
        ).checked;
        const lossPrice = parseFloat(
          /** @type {HTMLInputElement} */ (
            document.getElementById('add-limit-price-down')
          ).value
        );
        const lossExpirationDate = /** @type {HTMLInputElement} */ (
          document.getElementById('add-limit-down-expiration')
        ).value;
        if (
          isLossLimitSet &&
          (isNaN(lossPrice) || lossPrice <= 0 || lossPrice >= price)
        ) {
          return showToast(
            'Stop Loss price must be a valid positive number less than the purchase price.',
            'error'
          );
        }
        if (isLossLimitSet && !lossExpirationDate) {
          return showToast(
            'A Stop Loss limit requires an expiration date.',
            'error'
          );
        }

        // --- Get TP2 Values & Validate ---
        const isProfitLimit2Set = /** @type {HTMLInputElement} */ (
          document.getElementById('set-profit-limit-2-checkbox')
        ).checked;
        const profitPrice2 = parseFloat(
          /** @type {HTMLInputElement} */ (
            document.getElementById('add-limit-price-up-2')
          ).value
        );
        const profitExpirationDate2 = /** @type {HTMLInputElement} */ (
          document.getElementById('add-limit-up-expiration-2')
        ).value;
        if (
          isProfitLimit2Set &&
          (isNaN(profitPrice2) || profitPrice2 <= price)
        ) {
          return showToast(
            'Take Profit 2 price must be a valid number greater than the purchase price.',
            'error'
          );
        }
        if (
          isProfitLimit2Set &&
          isProfitLimitSet &&
          profitPrice2 <= profitPrice
        ) {
          return showToast(
            'Take Profit 2 price must be greater than Take Profit 1 price.',
            'error'
          );
        }
        if (isProfitLimit2Set && !profitExpirationDate2) {
          return showToast(
            'A Take Profit 2 limit requires an expiration date.',
            'error'
          );
        }

        transaction.limit_price_up = isProfitLimitSet ? profitPrice : null;
        transaction.limit_up_expiration = isProfitLimitSet
          ? profitExpirationDate
          : null;
        transaction.limit_price_down = isLossLimitSet ? lossPrice : null;
        transaction.limit_down_expiration = isLossLimitSet
          ? lossExpirationDate
          : null;
        transaction.limit_price_up_2 = isProfitLimit2Set ? profitPrice2 : null;
        transaction.limit_up_expiration_2 = isProfitLimit2Set
          ? profitExpirationDate2
          : null;
      }

      const submitButton = /** @type {HTMLButtonElement} */ (
        transactionForm.querySelector('button[type="submit"]')
      );
      submitButton.disabled = true;
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Server responded with an error.'
          );
        }
        showToast('Transaction logged successfully!', 'success');

        /** @type {HTMLSelectElement} */
        const accountHolderSelect = /** @type {HTMLSelectElement} */ (
          document.getElementById('add-tx-account-holder')
        );
        /** @type {HTMLSelectElement} */
        const exchangeSelect = /** @type {HTMLSelectElement} */ (
          document.getElementById('exchange')
        );

        /** @type {string} */
        const savedAccountHolderValue = accountHolderSelect.value;
        /** @type {string} */
        const savedExchangeValue = exchangeSelect.value;

        transactionForm.reset(); // Reset the form first

        // Restore the saved values
        accountHolderSelect.value = savedAccountHolderValue;
        exchangeSelect.value = savedExchangeValue;

        // --- Clear prefill state on SUCCESS ---
        // This is now the *only* place we clear the state.
        if (state.prefillOrderFromSource) {
          updateState({ prefillOrderFromSource: null });
        }
        // --- END ---

        /** @type {HTMLInputElement} */ (
          document.getElementById('transaction-date')
        ).value = getCurrentESTDateString();

        // Refresh other views
        await refreshLedger();
        await loadWatchlistPage();
        dispatchDataUpdate();
      } catch (error) {
        const err = /** @type {Error} */ (error);
        showToast(`Failed to log transaction: ${err.message}`, 'error');
      } finally {
        submitButton.disabled = false;

        // --- ALWAYS clear prefill state (if it still exists) and UNLOCK form ---
        // This catch-all ensures the form is usable even if a prefilled submission fails
        if (state.prefillOrderFromSource) {
          console.log(
            '[Orders Form] Clearing prefill state from finally block after error.'
          );
          updateState({ prefillOrderFromSource: null });
        }

        // Always run the unlock/reset visibility logic in case it was locked
        const adviceSourceSelectGroup = /** @type {HTMLElement | null} */ (
          document.getElementById('add-tx-advice-source-group')
        );
        const adviceSourceLockedDisplay = /** @type {HTMLElement | null} */ (
          document.getElementById('add-tx-source-locked-display')
        );

        if (adviceSourceSelectGroup && adviceSourceLockedDisplay) {
          adviceSourceSelectGroup.style.display = ''; // Show dropdown
          adviceSourceLockedDisplay.style.display = 'none'; // Hide locked display

          // Also unlock other fields
          const tickerInput = /** @type {HTMLInputElement | null} */ (
            document.getElementById('ticker')
          );
          const priceInputEl = /** @type {HTMLInputElement | null} */ (
            document.getElementById('price')
          );
          const accountSelect = /** @type {HTMLSelectElement | null} */ (
            document.getElementById('add-tx-account-holder')
          );
          // --- *** ADDED: Clear hidden journal ID *** ---
          const linkedJournalIdInput = /** @type {HTMLInputElement | null} */ (
            document.getElementById('add-tx-linked-journal-id')
          );
          if (linkedJournalIdInput) linkedJournalIdInput.value = '';
          // --- *** END ADDED *** ---

          if (tickerInput) tickerInput.readOnly = false;
          if (priceInputEl) priceInputEl.readOnly = false;
          if (accountSelect) accountSelect.disabled = false;
        }
        // --- END MODIFICATION ---
      }
    });
  } else {
    console.warn('[Orders Init] Add transaction form not found.');
  }

  /**
   * Initializes event listeners for the "Add New Pending Order" form.
   * @returns {void}
   */
  function initializeAddPendingOrderFormHandler() {
    const pendingOrderForm = /** @type {HTMLFormElement | null} */ (
      document.getElementById('add-pending-order-form')
    );

    if (pendingOrderForm) {
      pendingOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const accountHolder = /** @type {HTMLSelectElement} */ (
          document.getElementById('add-pending-order-account-holder')
        ).value;
        const createdDate = /** @type {HTMLInputElement} */ (
          document.getElementById('pending-order-created-date')
        ).value;
        const ticker = /** @type {HTMLInputElement} */ (
          document.getElementById('pending-order-ticker')
        ).value
          .toUpperCase()
          .trim();
        const exchange = /** @type {HTMLSelectElement} */ (
          document.getElementById('pending-order-exchange')
        ).value;
        const orderType = /** @type {HTMLSelectElement} */ (
          document.getElementById('pending-order-type')
        ).value;
        const limitPrice = parseFloat(
          /** @type {HTMLInputElement} */ (
            document.getElementById('pending-order-limit-price')
          ).value
        );
        const quantity = parseFloat(
          /** @type {HTMLInputElement} */ (
            document.getElementById('pending-order-quantity')
          ).value
        );
        const expirationDate = /** @type {HTMLInputElement} */ (
          document.getElementById('pending-order-expiration-date')
        ).value || null;
        const notes = /** @type {HTMLTextAreaElement} */ (
          document.getElementById('pending-order-notes')
        ).value || null;
        const adviceSourceId = /** @type {HTMLSelectElement} */ (
          document.getElementById('pending-order-advice-source')
        ).value || null;

        if (
          !accountHolder ||
          !createdDate ||
          !ticker ||
          !exchange ||
          !orderType ||
          isNaN(limitPrice) ||
          limitPrice <= 0 ||
          isNaN(quantity) ||
          quantity <= 0
        ) {
          return showToast(
            'Please fill in all required fields (*) with valid positive numbers for limit price and quantity.',
            'error'
          );
        }

        const pendingOrderData = {
          account_holder_id: accountHolder,
          ticker: ticker,
          exchange: exchange,
          order_type: orderType,
          limit_price: limitPrice,
          quantity: quantity,
          created_date: createdDate,
          expiration_date: expirationDate,
          notes: notes,
          advice_source_id: adviceSourceId,
        };

        const submitButton = /** @type {HTMLButtonElement} */ (
          pendingOrderForm.querySelector('button[type="submit"]')
        );
        submitButton.disabled = true;

        try {
          await addPendingOrder(pendingOrderData);
          showToast('Pending order added successfully!', 'success');
          pendingOrderForm.reset();
          // Refresh the pending orders table
          const currentHolderId = state.selectedAccountHolderId;
          const pendingOrders = await fetchPendingOrders(currentHolderId);
          renderPendingOrdersTable(pendingOrders);
          dispatchDataUpdate();
        } catch (error) {
          const err = /** @type {Error} */ (error);
          showToast(`Failed to add pending order: ${err.message}`, 'error');
        } finally {
          submitButton.disabled = false;
        }
      });
    } else {
      console.warn('[Orders Init] Add pending order form not found.');
    }
  }

  initializeAddPendingOrderFormHandler();
}
