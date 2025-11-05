// public/event-handlers/dashboard.js

// This file consolidates logic from:
// - V3's _dashboard_init.js
// - V3's _dashboard_loader.js
// - V3's _dashboard_modals.js (logic to be added later)
// - V3's _modal_sell_from_position.js (logic to be added later)
// - V3's _modal_selective_sell.js (logic to be added later)

import { state } from '../state.js';
import { fetchPositions } from '../api/reporting-api.js';
import { fetchSalesForLot } from '../api/transactions-api.js';
import { updateAllPrices } from '../api/price-api.js';
import { renderDashboardPage } from '../ui/renderers/_dashboard_render.js';
import { showToast, sortTableByColumn } from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { populateEditModal } from './_modal_edit_transaction.js';
import { populateManagementModal } from './_modal_manage_position.js';
import { populateSellFromPositionModal } from './_modal_sell_from_position.js';
import { populateSelectiveSellModal } from './_modal_selective_sell.js';
import { loadDashboardPage } from './_dashboard_loader.js';



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
  salesListEl.innerHTML = '<p>No sales history to load.</p>';
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
      return; // Exit if no lots found
    }

    managePositionModal.dataset.ticker = ticker;
    managePositionModal.dataset.exchange = exchange;
    managePositionModal.dataset.lotIds = relevantBuyLots
      .map((lot) => lot.id)
      .join(',');

    await populateManagementModal(true);
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

/**
 * Initializes event listeners for Dashboard controls and actions.
 * @returns {void}
 */
export function initializeDashboardHandlers() {
  const dashboardContainer = document.getElementById(
    'dashboard-page-container'
  );
  const filterInput = document.getElementById('dashboard-ticker-filter');
  // --- THIS IS THE FIX ---
  const exchangeFilter = document.getElementById('dashboard-exchange-filter');
  // --- END FIX ---
  const sortSelect = document.getElementById('dashboard-sort-select');
  const refreshButton = document.getElementById('dashboard-refresh-prices-btn');
  const subTabsContainer = dashboardContainer?.querySelector(
    '.dashboard-sub-tabs'
  );
  const cardGrid = document.getElementById('positions-cards-grid');
  const positionTable = document.getElementById('open-positions-table');

  // --- Sub-Tab Switching ---
  if (subTabsContainer && dashboardContainer) {
    // ... (this listener is unchanged) ...
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
  // --- THIS IS THE FIX ---
  exchangeFilter?.addEventListener('change', loadDashboardPage);
  // --- END FIX ---
  sortSelect?.addEventListener('change', loadDashboardPage);

  // --- Refresh Prices ---
  refreshButton?.addEventListener('click', async () => {
    showToast('Refreshing prices...', 'info', 2000);
    await updateAllPrices(); // updateAllPrices now calls renderDashboardPage itself if needed
  });

  // ... (rest of file: handleActionClick, table sorting, checkbox logic are unchanged) ...
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

    // Find the relevant button using closest()
    const sellBtn = target.closest('.sell-from-lot-btn'); // Individual Lot Sell (Single Lot Card or Table Row)
    const selectiveSellBtn = target.closest('.selective-sell-btn'); // Aggregated Card Sell
    const limitBtn = target.closest('.set-limit-btn'); // Single Lot Card or Table Row
    const editBtn = target.closest('.edit-buy-btn'); // Single Lot Card or Table Row
    const historyBtn = target.closest('.sales-history-btn'); // Table Row History
    const manageLotsBtn = target.closest('.manage-position-btn'); // Aggregated Card Manage Lots/History

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
        /* ... error handling ... */ return;
      }
      if (state.selectedAccountHolderId === 'all') {
        /* ... error handling ... */ return;
      }

      let underlyingLots = [];
      try {
        const lotIdArray = encodedLots.split(',').map((id) => parseInt(id, 10));
        underlyingLots = state.dashboardOpenLots.filter((p) =>
          lotIdArray.includes(p.id)
        );
      } catch {
        /* ... error handling ... */ return;
      }

      populateSelectiveSellModal(ticker, underlyingLots);
    }
    // --- Limits Button Logic (Single Lot Card or Table Row) ---
    else if (limitBtn) {
      const lotId = /** @type {HTMLElement} */ (limitBtn).dataset.id;
      const lotData = state.dashboardOpenLots.find(
        (lot) => String(lot.id) === lotId
      );
      populateEditModal(lotData, true); // True for limitsOnly
    }
    // --- Edit Button Logic (Single Lot Card or Table Row) ---
    else if (editBtn) {
      const lotId = /** @type {HTMLElement} */ (editBtn).dataset.id;
      const lotData = state.dashboardOpenLots.find(
        (lot) => String(lot.id) === lotId
      );
      // We must populate all dropdowns *before* opening the edit modal
      await populateAllAdviceSourceDropdowns();
      populateEditModal(lotData, false); // False for full edit
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

      // Populate static details
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
      salesHistoryModal.classList.add('visible'); // Make visible BEFORE fetch

      try {
        // Fetch sales history for this SPECIFIC lot
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
    else if (manageLotsBtn) {
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
      // Call the reusable function to handle fetching and populating
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
  positionTable?.addEventListener('change', (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    if (target.classList.contains('reconciliation-checkbox')) {
      const lotId = target.closest('tr')?.dataset.lotId;
      console.log(`Checkbox for lot ID ${lotId} changed: ${target.checked}`);
    }
  });
}
export { openAndPopulateManageModal };
