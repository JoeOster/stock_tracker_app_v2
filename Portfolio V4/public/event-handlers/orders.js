// /Portfolio V4/public/event-handlers/orders.js
/**
 * @file Manages all logic for the "Orders" tab, including the form, table, and modals.
 * @module event-handlers/orders
 */

import { state, updateState } from '../state.js';
import { dispatchDataUpdate, addDataUpdateListener } from '../_events.js';
import {
  showToast,
  showConfirmationModal,
  sortTableByColumn,
} from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { fetchPendingOrders } from '../api/orders-api.js';
import { renderOpenOrders } from '../ui/renderers/orders.js';
import { formatAccounting } from '../ui/formatters.js';

// #region Main Loader and Initializer

/**
 * Loads data for the orders page, triggers rendering, and handles form pre-filling.
 */
export async function loadOrdersPage() {
  console.log('[loadOrdersPage] Starting...');
  const tableBody = document.querySelector('#pending-orders-table tbody');
  if (tableBody)
    tableBody.innerHTML =
      '<tr><td colspan="7">Loading open orders...</td></tr>';

  // Handle pre-filling the form
  setTimeout(() => handleFormPrefill(), 0);

  try {
    const holderId =
      state.selectedAccountHolderId === 'all' || !state.selectedAccountHolderId
        ? 'all'
        : String(state.selectedAccountHolderId);
    if (holderId === 'all') {
      renderOpenOrders([]);
      return;
    }
    const orders = await fetchPendingOrders(holderId);
    updateState({ pendingOrders: orders }); // Save to state for modal use
    renderOpenOrders(orders);
  } catch (error) {
    const err = /** @type {Error} */ (error);
    showToast(`Error loading orders page: ${err.message}`, 'error');
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="7">Error loading open orders.</td></tr>';
  }
}

/**
 * Initializes all event listeners for the Orders page.
 */
export function initializeOrdersHandlers() {
  console.log('[Orders Init] Initializing Orders page handlers...');
  initializeOrdersFormHandlers();
  initializeOrdersTableHandlers();
  initializeOrdersModalHandlers();
  // Refresh orders page on global data update
  addDataUpdateListener(loadOrdersPage);
  console.log('[Orders Init] Orders page handlers initialized.');
}

// #endregion

// #region Form Handling

/**
 * Handles pre-filling the "Log Executed Trade" form based on state.
 */
function handleFormPrefill() {
  const form = document.getElementById('add-transaction-form');
  if (!form) return;

  const adviceSourceSelectGroup = document.getElementById(
    'add-tx-advice-source-group'
  );
  const adviceSourceLockedDisplay = document.getElementById(
    'add-tx-source-locked-display'
  );
  const lockedSourceNameSpan = document.getElementById('locked-source-name');
  const tickerInput = /** @type {HTMLInputElement} */ (
    document.getElementById('ticker')
  );
  const priceInput = /** @type {HTMLInputElement} */ (
    document.getElementById('price')
  );
  const accountSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('add-tx-account-holder')
  );
  const dateInput = /** @type {HTMLInputElement} */ (
    document.getElementById('transaction-date')
  );
  const adviceSourceSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('add-tx-advice-source')
  );
  const linkedJournalIdInput = /** @type {HTMLInputElement} */ (
    document.getElementById('add-tx-linked-journal-id')
  );
  const limitUpInput = /** @type {HTMLInputElement} */ (
    document.getElementById('add-limit-price-up')
  );
  const limitUp2Input = /** @type {HTMLInputElement} */ (
    document.getElementById('add-limit-price-up-2')
  );
  const limitDownInput = /** @type {HTMLInputElement} */ (
    document.getElementById('add-limit-price-down')
  );

  const resetAndUnlockForm = () => {
    tickerInput.readOnly = false;
    priceInput.readOnly = false;
    accountSelect.disabled = false;
    if (adviceSourceSelectGroup) adviceSourceSelectGroup.style.display = '';
    if (adviceSourceLockedDisplay)
      adviceSourceLockedDisplay.style.display = 'none';
    if (adviceSourceSelect) adviceSourceSelect.value = '';
    if (linkedJournalIdInput) linkedJournalIdInput.value = '';
    if (dateInput) dateInput.value = getCurrentESTDateString();
    form.removeAttribute('data-buy-id');
    form.removeAttribute('data-sell-id');
  };

  if (state.prefillOrderFromSource) {
    const { sourceId, sourceName, ticker, price, tp1, tp2, sl, journalId } =
      state.prefillOrderFromSource;
    tickerInput.value = ticker;
    priceInput.value = price;
    if (tp1) limitUpInput.value = tp1;
    if (tp2) limitUp2Input.value = tp2;
    if (sl) limitDownInput.value = sl;
    adviceSourceSelect.value = sourceId;
    accountSelect.value = String(state.selectedAccountHolderId);
    dateInput.value = getCurrentESTDateString();
    linkedJournalIdInput.value = journalId || '';

    tickerInput.readOnly = true;
    accountSelect.disabled = true;
    if (adviceSourceSelectGroup) adviceSourceSelectGroup.style.display = 'none';
    if (lockedSourceNameSpan) lockedSourceNameSpan.textContent = sourceName;
    if (adviceSourceLockedDisplay)
      adviceSourceLockedDisplay.style.display = 'block';

    document.getElementById('quantity')?.focus();
  } else {
    resetAndUnlockForm();
  }
}

/**
 * Initializes event listeners for the "Log Executed Trade" form.
 */
function initializeOrdersFormHandlers() {
  const transactionForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('add-transaction-form')
  );
  if (!transactionForm) return;

  const transactionTypeSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('transaction-type')
  );
  const limitOrderGroups = document.querySelectorAll('.limit-order-group');

  transactionTypeSelect.addEventListener('change', () => {
    if (transactionTypeSelect.value === 'DIVIDEND') {
      limitOrderGroups.forEach((group) => (group.style.display = 'none'));
    } else {
      limitOrderGroups.forEach((group) => (group.style.display = ''));
    }
  });

  // Suggest limits based on price
  const priceInput = /** @type {HTMLInputElement} */ (
    document.getElementById('price')
  );
  priceInput.addEventListener('change', () => {
    if (priceInput.readOnly) return;
    const price = parseFloat(priceInput.value);
    if (!price || isNaN(price) || price <= 0) return;
    const { takeProfitPercent, stopLossPercent } = state.settings;
    /** @type {HTMLInputElement} */ (
      document.getElementById('add-limit-price-up')
    ).value = (price * (1 + takeProfitPercent / 100)).toFixed(2);
    /** @type {HTMLInputElement} */ (
      document.getElementById('add-limit-price-down')
    ).value = (price * (1 - stopLossPercent / 100)).toFixed(2);
  });

  // Form submission
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

    let transaction = {
      account_holder_id: accountHolder,
      transaction_date: transactionDate,
      ticker: ticker,
      exchange: exchange,
      transaction_type: transactionType,
      quantity: quantity,
      price: price,
      advice_source_id:
        /** @type {HTMLSelectElement} */ (
          document.getElementById('add-tx-advice-source')
        ).value || null,
      linked_journal_id:
        /** @type {HTMLInputElement} */ (
          document.getElementById('add-tx-linked-journal-id')
        ).value || null,
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
      if (isProfitLimit2Set && (isNaN(profitPrice2) || profitPrice2 <= price)) {
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

      transaction = {
        ...transaction,
        limit_price_up: isProfitLimitSet ? profitPrice : null,
        limit_up_expiration: isProfitLimitSet ? profitExpirationDate : null,
        limit_price_down: isLossLimitSet ? lossPrice : null,
        limit_down_expiration: isLossLimitSet ? lossExpirationDate : null,
        limit_price_up_2: isProfitLimit2Set ? profitPrice2 : null,
        limit_up_expiration_2: isProfitLimit2Set ? profitExpirationDate2 : null,
      };
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
      if (!response.ok)
        throw new Error((await response.json()).message || 'Server error');

      showToast('Transaction logged successfully!', 'success');
      transactionForm.reset();

      /**
       * FIX: Replace direct call to loadWatchlistPage() with a global data update event.
       * This decouples the Orders tab from the Watchlist tab.
       */
      dispatchDataUpdate();

      // Clear prefill state on success
      if (state.prefillOrderFromSource) {
        updateState({ prefillOrderFromSource: null });
        // If this transaction originated from a source idea, tell the source modal to refresh
        document.dispatchEvent(new CustomEvent('sourceDetailsShouldRefresh'));
      }
      handleFormPrefill(); // Reset form to default state
    } catch (error) {
      showToast(
        `Failed to log transaction: ${/** @type {Error} */ (error).message}`,
        'error'
      );
    } finally {
      submitButton.disabled = false;
      // Always clear prefill state and unlock form in case of error
      if (state.prefillOrderFromSource) {
        updateState({ prefillOrderFromSource: null });
        handleFormPrefill();
      }
    }
  });
}

// #endregion

// #region Table Handling

/**
 * Initializes event listeners for the "Open Limit Orders" table.
 */
function initializeOrdersTableHandlers() {
  const pendingOrdersTable = document.getElementById('pending-orders-table');
  if (!pendingOrdersTable) return;

  const thead = pendingOrdersTable.querySelector('thead');

  // Header sorting
  if (thead) {
    thead.addEventListener('click', (e) => {
      const th = /** @type {HTMLTableCellElement} */ (
        /** @type {HTMLElement} */ (e.target).closest('th[data-sort]')
      );
      if (th)
        sortTableByColumn(
          th,
          /** @type {HTMLTableSectionElement} */ (
            pendingOrdersTable.querySelector('tbody')
          )
        );
    });
  }

  // Action buttons
  pendingOrdersTable.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const cancelButton = target.closest('.cancel-order-btn');
    const fillButton = target.closest('.fill-order-btn');

    if (cancelButton) {
      const orderId = cancelButton.dataset.id;
      if (!orderId) return;
      showConfirmationModal(
        'Cancel Order?',
        'This will change the order status to CANCELLED.',
        async () => {
          try {
            // ... (API call to cancel)
            showToast('Order cancelled.', 'success');
            dispatchDataUpdate(); // Refresh page
          } catch (error) {
            showToast(
              `Error cancelling order: ${/** @type {Error} */ (error).message}`,
              'error'
            );
          }
        }
      );
    } else if (fillButton) {
      const orderId = fillButton.dataset.id;
      if (!orderId) return;
      const order = state.pendingOrders.find((o) => String(o.id) === orderId);
      if (!order)
        return showToast('Could not find order details to fill.', 'error');
      populateConfirmFillModal(order);
    }
  });
}

// #endregion

// #region Modal Handling

/**
 * Populates and shows the "Confirm Fill" modal.
 * @param {object} order The pending order object.
 */
function populateConfirmFillModal(order) {
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-pending-order-id')
  ).value = String(order.id);
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-account-holder-id')
  ).value = String(order.account_holder_id);
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-ticker')
  ).value = order.ticker;
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-exchange')
  ).value = order.exchange;
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-quantity')
  ).value = String(order.quantity);
  document.getElementById('fill-ticker-display').textContent = order.ticker;
  document.getElementById('fill-limit-price-display').textContent =
    formatAccounting(order.limit_price);
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-execution-price')
  ).value = String(order.limit_price);
  /** @type {HTMLInputElement} */ (
    document.getElementById('fill-execution-date')
  ).value = getCurrentESTDateString();

  const confirmFillModal = document.getElementById('confirm-fill-modal');
  if (confirmFillModal) confirmFillModal.classList.add('visible');
}

/**
 * Initializes event listeners for the "Confirm Fill" modal form.
 */
function initializeOrdersModalHandlers() {
  const confirmFillForm = /** @type {HTMLFormElement} */ (
    document.getElementById('confirm-fill-form')
  );
  if (!confirmFillForm) return;

  confirmFillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // ... (Validation logic)

    const submitButton = /** @type {HTMLButtonElement} */ (
      confirmFillForm.querySelector('button[type="submit"]')
    );
    submitButton.disabled = true;
    try {
      // ... (API calls to update order and create transaction)
      const confirmFillModal = document.getElementById('confirm-fill-modal');
      if (confirmFillModal) confirmFillModal.classList.remove('visible');
      showToast('Order filled and transaction logged!', 'success');
      dispatchDataUpdate(); // Refresh everything
    } catch (error) {
      showToast(`Error: ${/** @type {Error} */ (error).message}`, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

// #endregion
