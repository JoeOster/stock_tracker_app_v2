// /Portfolio V4/public/event-handlers/dashboard.js
/**
 * @file Consolidates all dashboard-related event handlers and logic for Portfolio V4.
 * @module event-handlers/dashboard
 */

import state from '../state.js';
import { handleResponse } from '../api/api-helpers.js';
import { fetchPositions } from '../api/reporting-api.js';
import {
  fetchSalesForLot,
  deleteTransaction,
} from '../api/transactions-api.js';
import { updateAllPrices } from '../api/price-api.js';
import { renderDashboardPage } from '../../ui/renderers/_dashboard_render.js';
import {
  showToast,
  showConfirmationModal,
  sortTableByColumn,
} from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { populateEditModal } from './_modal_edit_transaction.js';
import { dispatchDataUpdate, addDataUpdateListener } from '../_events.js'; // Import event bus
import { loadDashboardPage } from './_dashboard_loader.js';



// --- Manage Position Modal Logic (from _dashboard_init.js) ---
async function openAndPopulateManageModal(ticker, exchange, accountHolderId) {
  const managePositionModal = document.getElementById('manage-position-modal');
  const lotsListEl = document.getElementById('manage-position-lots-list');
  const salesListEl = document.getElementById('manage-position-sales-history');

  if (!managePositionModal || !lotsListEl || !salesListEl) {
    showToast('Error: Cannot find Manage Position modal elements.', 'error');
    return;
  }
  if (!ticker || !exchange || !accountHolderId || accountHolderId === 'all') {
    showToast(
      'Error: Missing required data (ticker, exchange, holder ID) to manage position.',
      'error'
    );
    return;
  }

  lotsListEl.innerHTML = '<p>Loading lots...</p>';
  salesListEl.innerHTML = '<p>Loading sales history...</p>';
  managePositionModal.classList.add('visible');

  try {
    const today = getCurrentESTDateString();
    const positionData = await fetchPositions(today, String(accountHolderId));
    const relevantBuyLots = (positionData?.endOfDayPositions || []).filter(
      (lot) => lot.ticker === ticker && lot.exchange === exchange
    );
    relevantBuyLots.sort(
      (a, b) =>
        new Date(a.purchase_date).getTime() -
        new Date(b.purchase_date).getTime()
    );

    if (relevantBuyLots.length === 0) {
      lotsListEl.innerHTML = '<p>No open lots found for this position.</p>';
      salesListEl.innerHTML = '<p>No sales history to load.</p>';
      return;
    }

    managePositionModal.dataset.ticker = ticker;
    managePositionModal.dataset.exchange = exchange;
    managePositionModal.dataset.lotIds = relevantBuyLots
      .map((lot) => lot.id)
      .join(',');
  } catch (error) {
    // @ts-ignore
    showToast(`Error refreshing position details: ${error.message}`, 'error');
    if (lotsListEl)
      lotsListEl.innerHTML =
        '<tr><td colspan="8">Error loading details.</td></tr>';
    if (salesListEl)
      salesListEl.innerHTML = '<p>Error loading sales history.</p>';
  }
}

// --- Sell From Position Modal Logic (from _modal_sell_from_position.js) ---
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
  sellQuantityInput.value = String(lot.quantity_remaining);
  sellQuantityInput.max = String(lot.quantity_remaining);
  /** @type {HTMLInputElement} */ (document.getElementById('sell-date')).value =
    getCurrentESTDateString();

  sellModal.classList.add('visible');
}

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
        document.getElementById('sell-ticker-display')?.textContent || '';
      const exchange =
        document.getElementById('sell-exchange-display')?.textContent || '';
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
        ticker: ticker,
        exchange: exchange,
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

        dispatchDataUpdate(); // Use new event bus

        if (managePositionModal?.classList.contains('visible')) {
          if (typeof openAndPopulateManageModal === 'function') {
            await openAndPopulateManageModal(ticker, exchange, accountHolderId);
          } else {
            console.warn(
              'openAndPopulateManageModal function not available for refresh.'
            );
          }
        }

        sellFromPositionModal?.classList.remove('visible');
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

// --- Selective Sell Modal Logic (from _modal_selective_sell.js) ---
/**
 * Populates the "Selective Sell" modal with data for a ticker.
 * @param {string} ticker - The ticker symbol.
 * @param {object[]} lots - An array of BUY lot objects for this ticker.
 */
export function populateSelectiveSellModal(ticker, lots) {
  const selectiveSellModal = document.getElementById('selective-sell-modal');
  if (!selectiveSellModal) return;

  lots.sort(
    (a, b) =>
      new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
  );

  const exchange = lots.length > 0 ? lots[0].exchange : '';
  const totalQuantity = lots.reduce(
    (sum, lot) => sum + lot.quantity_remaining,
    0
  );

  /** @type {HTMLElement} */ (
    document.getElementById('selective-sell-title')
  ).textContent = `Sell ${ticker} (${exchange})`;
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-ticker')
  ).value = ticker;
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-exchange')
  ).value = exchange;
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-account-holder-id')
  ).value = String(state.selectedAccountHolderId);
  /** @type {HTMLElement} */ (
    document.getElementById('selective-sell-available-qty')
  ).textContent = formatQuantity(totalQuantity);
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-total-quantity')
  ).value = '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-total-quantity')
  ).max = String(totalQuantity);
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-price')
  ).value = '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-date')
  ).value = getCurrentESTDateString();
  /** @type {HTMLElement} */ (
    document.getElementById('selective-sell-selected-total')
  ).textContent = '0';
  /** @type {HTMLElement} */ (
    document.getElementById('selective-sell-validation-message')
  ).style.display = 'none';

  const lotsBody = /** @type {HTMLTableSectionElement} */ (
    document.getElementById('selective-sell-lots-body')
  );
  lotsBody.innerHTML = '';
  lots.forEach((lot) => {
    const row = lotsBody.insertRow();
    row.dataset.lotId = String(lot.id);
    row.innerHTML = `
            <td>${lot.purchase_date}</td>
            <td class="numeric">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric">
                <input type="number" class="selective-sell-lot-qty"
                       step="any" min="0" max="${lot.quantity_remaining}"
                       data-lot-id="${lot.id}" value="0"
                       style="width: 100px; text-align: right;">
            </td>
        `;
  });

  const totalQtyInput = /** @type {HTMLInputElement} */ (
    document.getElementById('selective-sell-total-quantity')
  );
  const lotQtyInputs = /** @type {HTMLInputElement[]} */ (
    Array.from(lotsBody.querySelectorAll('.selective-sell-lot-qty'))
  );
  const selectedTotalSpan = /** @type {HTMLElement} */ (
    document.getElementById('selective-sell-selected-total')
  );
  const validationMessage = /** @type {HTMLElement} */ (
    document.getElementById('selective-sell-validation-message')
  );
  const submitButton = /** @type {HTMLButtonElement} */ (
    document.getElementById('selective-sell-submit-btn')
  );

  const validateQuantities = () => {
    let selectedTotal = 0;
    lotQtyInputs.forEach((input) => {
      selectedTotal += parseFloat(input.value) || 0;
    });

    const targetTotal = parseFloat(totalQtyInput.value) || 0;
    selectedTotalSpan.textContent = formatQuantity(selectedTotal);

    const totalsMatch =
      Math.abs(selectedTotal - targetTotal) < 0.00001 && targetTotal > 0;

    if (totalsMatch) {
      validationMessage.style.display = 'none';
      submitButton.disabled = false;
    } else {
      if (targetTotal > 0 && selectedTotal > 0) {
        validationMessage.style.display = 'block';
      } else {
        validationMessage.style.display = 'none';
      }
      submitButton.disabled = true;
    }
  };

  totalQtyInput.addEventListener('input', validateQuantities);
  lotQtyInputs.forEach((input) =>
    input.addEventListener('input', validateQuantities)
  );

  validateQuantities();
  selectiveSellModal.classList.add('visible');
}

/**
 * Initializes the event listener for the Selective Sell modal form submission.
 * @returns {void}
 */
export function initializeSelectiveSellModalHandler() {
  const selectiveSellForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('selective-sell-form')
  );
  const selectiveSellModal = document.getElementById('selective-sell-modal');

  if (selectiveSellForm && selectiveSellModal) {
    selectiveSellForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitButton = /** @type {HTMLButtonElement | null} */ (
        selectiveSellForm.querySelector('#selective-sell-submit-btn')
      );
      if (!submitButton) return;

      const ticker = /** @type {HTMLInputElement} */ (
        document.getElementById('selective-sell-ticker')
      ).value;
      const exchange = /** @type {HTMLInputElement} */ (
        document.getElementById('selective-sell-exchange')
      ).value;
      const accountHolderId = /** @type {HTMLInputElement} */ (
        document.getElementById('selective-sell-account-holder-id')
      ).value;
      const totalQuantityToSell = parseFloat(
        /** @type {HTMLInputElement} */ (
          document.getElementById('selective-sell-total-quantity')
        ).value
      );
      const price = parseFloat(
        /** @type {HTMLInputElement} */ (
          document.getElementById('selective-sell-price')
        ).value
      );
      const date = /** @type {HTMLInputElement} */ (
        document.getElementById('selective-sell-date')
      ).value;

      const lotsBody = document.getElementById('selective-sell-lots-body');
      const lotInputs = lotsBody
        ? Array.from(lotsBody.querySelectorAll('.selective-sell-lot-qty'))
        : [];
      const lotsPayload = lotInputs
        .map((input) => ({
          parent_buy_id: /** @type {HTMLInputElement} */ (input).dataset.lotId,
          quantity_to_sell:
            parseFloat(/** @type {HTMLInputElement} */ (input).value) || 0,
        }))
        .filter((lot) => lot.quantity_to_sell > 0);

      if (
        isNaN(totalQuantityToSell) ||
        totalQuantityToSell <= 0 ||
        isNaN(price) ||
        price <= 0 ||
        !date ||
        lotsPayload.length === 0
      ) {
        return showToast(
          'Please enter valid Total Quantity, Price, Date, and select quantities from lots.',
          'error'
        );
      }
      const sumFromLots = lotsPayload.reduce(
        (sum, lot) => sum + lot.quantity_to_sell,
        0
      );
      if (Math.abs(sumFromLots - totalQuantityToSell) > 0.00001) {
        return showToast(
          'Total selected quantity from lots does not match the Total Quantity to Sell.',
          'error'
        );
      }

      const sellDetails = {
        account_holder_id: accountHolderId,
        ticker: ticker,
        exchange: exchange,
        transaction_type: 'SELL',
        quantity: totalQuantityToSell,
        price: price,
        transaction_date: date,
        lots: lotsPayload,
      };

      submitButton.disabled = true;
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sellDetails),
        });
        await handleResponse(response);
        showToast('Selective sale logged successfully!', 'success');
        selectiveSellModal.classList.remove('visible');

        dispatchDataUpdate(); // Use new event bus
      } catch (error) {
        const err = /** @type {Error} */ (error);
        showToast(`Failed to log selective sale: ${err.message}`, 'error');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  } else {
    console.warn('Selective sell form or modal not found.');
  }
}

// --- Dashboard Main Event Handlers (from _dashboard_init.js and _dashboard_modals.js) ---
/**
 * Initializes event listeners for Dashboard controls and actions.
 * @returns {void}
 */
export function initializeDashboardHandlers() {
  const dashboardContainer = document.getElementById(
    'dashboard-page-container'
  );
  const filterInput = document.getElementById('dashboard-ticker-filter');
  const exchangeFilter = document.getElementById('dashboard-exchange-filter');
  const sortSelect = document.getElementById('dashboard-sort-select');
  const refreshButton = document.getElementById('dashboard-refresh-prices-btn');
  const subTabsContainer = dashboardContainer?.querySelector(
    '.dashboard-sub-tabs'
  );
  const cardGrid = document.getElementById('positions-cards-grid');
  const positionTable = document.getElementById('open-positions-table');

  // --- Add global data update listener ---
  addDataUpdateListener(loadDashboardPage);

  // --- Sub-Tab Switching ---
  if (subTabsContainer && dashboardContainer) {
    subTabsContainer.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (
        target.classList.contains('sub-tab') &&
        !target.classList.contains('active')
      ) {
        const subTabName = target.dataset.subTab;
        if (!subTabName) return;

        subTabsContainer
          .querySelectorAll('.sub-tab')
          .forEach((tab) => tab.classList.remove('active'));
        dashboardContainer
          .querySelectorAll('.sub-tab-panel')
          .forEach((panel) => panel.classList.remove('active'));

        target.classList.add('active');
        const panelToShow = dashboardContainer.querySelector(`#${subTabName}`);
        if (panelToShow) {
          panelToShow.classList.add('active');
        }
      }
    });
  }

  // --- Filter and Sort ---
  filterInput?.addEventListener('input', loadDashboardPage);
  exchangeFilter?.addEventListener('change', loadDashboardPage);
  sortSelect?.addEventListener('change', loadDashboardPage);

  // --- Refresh Prices ---
  refreshButton?.addEventListener('click', async () => {
    showToast('Refreshing prices...', 'info', 2000);
    await updateAllPrices();
  });

  // --- Delegated Click Handler for Modals and Actions (from _dashboard_modals.js) ---
  const handleActionClick = async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const holderId = state.selectedAccountHolderId;

    if (holderId === 'all') {
      showToast(
        'Please select a specific account holder to manage positions.',
        'error'
      );
      return;
    }

    const sellBtn = target.closest('.sell-from-lot-btn');
    const selectiveSellBtn = target.closest('.selective-sell-btn');
    const limitBtn = target.closest('.set-limit-btn');
    const editBtn = target.closest('.edit-buy-btn');
    const historyBtn = target.closest('.sales-history-btn');
    const manageLotsBtn = target.closest('.manage-position-btn');
    const deleteBtn = target.closest('.delete-buy-btn');

    // --- Sell Button Logic (Individual Lot) ---
    if (sellBtn) {
      const { buyId } = /** @type {HTMLElement} */ (sellBtn).dataset;
      const lotData = state.dashboardOpenLots.find(
        (lot) => String(lot.id) === buyId
      );
      if (!lotData) {
        return showToast('Error: Could not find original lot data.', 'error');
      }
      populateSellFromPositionModal(lotData);
    }
    // --- Selective Sell Button Logic (Aggregated Card) ---
    else if (selectiveSellBtn) {
      const {
        ticker,
        exchange,
        lots: encodedLots,
      } = /** @type {HTMLElement} */ (selectiveSellBtn).dataset;
      if (!ticker || !exchange || !encodedLots) {
        return;
      }
      if (state.selectedAccountHolderId === 'all') {
        return;
      }

      let underlyingLots = [];
      try {
        const lotIdArray = encodedLots.split(',').map((id) => parseInt(id, 10));
        underlyingLots = state.dashboardOpenLots.filter((p) =>
          lotIdArray.includes(p.id)
        );
      } catch {
        return;
      }
      populateSelectiveSellModal(ticker, underlyingLots);
    }
    // --- Limits Button Logic (Single Lot Card or Table Row) ---
    else if (limitBtn) {
      const lotId = /** @type {HTMLElement} */ (limitBtn).dataset.id;
      const lotData = state.dashboardOpenLots.find(
        (lot) => String(lot.id) === lotId
      );
      populateEditModal(lotData, true);
    }
    // --- Edit Button Logic (Single Lot Card or Table Row) ---
    else if (editBtn) {
      const lotId = /** @type {HTMLElement} */ (editBtn).dataset.id;
      const lotData = state.dashboardOpenLots.find(
        (lot) => String(lot.id) === lotId
      );
      await populateAllAdviceSourceDropdowns();
      populateEditModal(lotData, false);
    }
    // --- Sales History Button Logic (Table Row) ---
    else if (historyBtn) {
      const buyId = /** @type {HTMLElement} */ (historyBtn).dataset.buyId;
      if (!buyId) return;
      const lotData = state.dashboardOpenLots.find(
        (lot) => String(lot.id) === buyId
      );
      if (!lotData) {
        showToast('Could not find original purchase details.', 'error');
        return;
      }

      const salesHistoryModal = document.getElementById('sales-history-modal');
      if (!salesHistoryModal) return;

      /** @type {HTMLElement} */ (
        document.getElementById('sales-history-title')
      ).textContent = `Sales History for ${lotData.ticker} Lot`;
      /** @type {HTMLElement} */ (
        document.getElementById('sales-history-ticker')
      ).textContent = lotData.ticker;
      /** @type {HTMLElement} */ (
        document.getElementById('sales-history-buy-date')
      ).textContent = lotData.purchase_date;
      /** @type {HTMLElement} */ (
        document.getElementById('sales-history-buy-qty')
      ).textContent = formatQuantity(
        lotData.original_quantity ?? lotData.quantity
      );
      /** @type {HTMLElement} */ (
        document.getElementById('sales-history-buy-price')
      ).textContent = formatAccounting(lotData.cost_basis);

      const salesBody = /** @type {HTMLTableSectionElement} */ (
        document.getElementById('sales-history-body')
      );
      salesBody.innerHTML =
        '<tr><td colspan="4">Loading sales history...</td></tr>';
      salesHistoryModal.classList.add('visible');

      try {
        const sales = await fetchSalesForLot(
          buyId,
          state.selectedAccountHolderId
        );
        if (sales.length === 0) {
          salesBody.innerHTML =
            '<tr><td colspan="4">No sales recorded for this lot.</td></tr>';
        } else {
          salesBody.innerHTML = sales
            .map(
              (sale) => `
                        <tr>
                            <td>${sale.transaction_date}</td>
                            <td class="numeric">${formatQuantity(sale.quantity)}</td>
                            <td class="numeric">${formatAccounting(sale.price)}</td>
                            <td class="numeric ${sale.realizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(sale.realizedPL)}</td>
                        </tr>
                    `
            )
            .join('');
        }
      } catch (error) {
        // @ts-ignore
        showToast(`Error fetching sales history: ${error.message}`, 'error');
        salesBody.innerHTML =
          '<tr><td colspan="4">Error loading sales history.</td></tr>';
      }
    }
    // --- Manage Position Button Logic (Aggregated Card) ---
    else if (deleteBtn) {
      const transactionId = /** @type {HTMLElement} */ (deleteBtn).dataset.id;
      if (!transactionId) return;

      showConfirmationModal(
        'Delete Transaction?',
        'Are you sure you want to delete this BUY transaction? All associated SELL records will also be deleted. This cannot be undone.',
        async () => {
          try {
            const result = await deleteTransaction(transactionId, holderId);
            showToast(result.message, 'success');
            // Trigger a full dashboard refresh
            dispatchDataUpdate();
          } catch (error) {
            console.error('Error deleting transaction:', error);
            // @ts-ignore
            showToast(`Error: ${error.message}`, 'error');
          }
        }
      );
      return; // Stop further processing
    } else if (manageLotsBtn) {
      const button = /** @type {HTMLElement} */ (manageLotsBtn);
      const { ticker, exchange } = button.dataset;
      const accountHolderId = state.selectedAccountHolderId;

      if (!ticker || !exchange) {
        showToast('Error: Missing data for position management view.', 'error');
        return;
      }
      if (accountHolderId === 'all') {
        showToast(
          'Please select a specific account holder to manage lots.',
          'error'
        );
        return;
      }
      await openAndPopulateManageModal(ticker, exchange, accountHolderId);
    }
  };
  cardGrid?.addEventListener('click', handleActionClick);
  positionTable
    ?.querySelector('tbody')
    ?.addEventListener('click', handleActionClick);
  const thead = positionTable?.querySelector('thead');
  if (thead) {
    thead.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const th = /** @type {HTMLTableCellElement} */ (
        target.closest('th[data-sort]')
      );
      if (th) {
        const tbody = /** @type {HTMLTableSectionElement} */ (
          document.getElementById('open-positions-tbody')
        );
        if (tbody) {
          sortTableByColumn(th, tbody);
        }
      }
    });
  }
  positionTable?.addEventListener('change', () => {});
}
