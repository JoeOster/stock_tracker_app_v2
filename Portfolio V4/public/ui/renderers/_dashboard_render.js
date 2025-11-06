// public/ui/renderers/_dashboard_render.js
// ... (imports are unchanged) ...
import { state } from '../state.js';
import { showToast } from '../helpers.js';
import { formatAccounting } from '../formatters.js';
// Import data processing functions
import {
  loadAndPrepareDashboardData,
  processFilterAndSortLots,
} from './_dashboard_data.js';
// Import HTML generation functions
import {
  createAggregatedCardHTML,
  createTableRowHTML,
  createOpenOrderTableRowHTML,
} from './_dashboard_html.js';

export async function renderDashboardPage(activeSubTab = 'dashboard-card-view') {
  console.log('[renderDashboardPage] Starting render for activeSubTab:', activeSubTab);
  const cardGrid = document.getElementById('positions-cards-grid');
  const tableBody = document.getElementById('open-positions-tbody');
  const filterInput = /** @type {HTMLInputElement} */ (
    document.getElementById('dashboard-ticker-filter')
  );
  const exchangeFilter = /** @type {HTMLSelectElement} */ (
    document.getElementById('dashboard-exchange-filter')
  );
  const sortSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('dashboard-sort-select')
  );
  const totalPlFooter = document.getElementById(
    'dashboard-unrealized-pl-total'
  );
  const totalValueFooter = document.getElementById('dashboard-total-value');

  if (
    !cardGrid ||
    !tableBody ||
    !filterInput ||
    !exchangeFilter ||
    !sortSelect ||
    !totalPlFooter ||
    !totalValueFooter
  ) {
    console.error(
      'Dashboard renderer orchestration: Missing required DOM elements. Aborting render.'
    );
    return;
  }

  // Show initial loading state
  cardGrid.innerHTML = '<p>Loading open positions...</p>';
  tableBody.innerHTML =
    '<tr><td colspan="10">Loading open positions...</td></tr>';
  totalPlFooter.textContent = '--';
  totalValueFooter.textContent = '--';

  try {
    const { openLots, openOrders: fetchedOpenOrders } = await loadAndPrepareDashboardData();
    console.log('[renderDashboardPage] Data loaded. Open Lots count:', openLots.length);

    const filterValue = filterInput.value.toUpperCase();
    const exchangeFilterValue = exchangeFilter.value;
    const sortValue = sortSelect.value;

    const {
      aggregatedLots,
      individualLotsForTable,
      totalUnrealizedPL,
      totalCurrentValue,
      openOrders,
    } = processFilterAndSortLots(
      openLots,
      fetchedOpenOrders,
      filterValue,
      exchangeFilterValue,
      sortValue
    );
    console.log('[renderDashboardPage] Data processed. Aggregated Lots count:', aggregatedLots.length, 'Individual Lots count:', individualLotsForTable.length);

    renderDashboardUI(
      aggregatedLots,
      individualLotsForTable,
      totalUnrealizedPL,
      totalCurrentValue,
      openOrders,
      activeSubTab
    );
    console.log('[renderDashboardPage] renderDashboardUI completed.');
  } catch (error) {
    console.error('Unexpected error during dashboard page render:', error);
    showToast(
      `An unexpected error occurred while loading the dashboard: ${error.message}`,
      'error'
    );
    const errorMsg = 'Error loading positions.';
    if (cardGrid) cardGrid.innerHTML = `<p>${errorMsg}</p>`;
    if (tableBody)
      tableBody.innerHTML = `<tr><td colspan="10">${errorMsg}</td></tr>`;
    if (totalPlFooter) totalPlFooter.textContent = 'Error';
    if (totalValueFooter) totalValueFooter.textContent = 'Error';
  }
}

function renderDashboardUI(
  aggregatedLots,
  individualLotsForTable,
  totalUnrealizedPL,
  totalCurrentValue,
  openOrders,
  activeSubTab
) {
  console.log('[renderDashboardUI] Rendering for activeSubTab:', activeSubTab);
  const cardGrid = document.getElementById('positions-cards-grid');
  const tableBody = document.getElementById('open-positions-tbody');
  const totalPlFooter = document.getElementById(
    'dashboard-unrealized-pl-total'
  );
  const totalValueFooter = document.getElementById('dashboard-total-value');

  if (!cardGrid || !tableBody || !totalPlFooter || !totalValueFooter) {
    console.error('Dashboard renderer (UI): Missing required DOM elements.');
    return;
  }

  const filterInput = /** @type {HTMLInputElement} */ (
    document.getElementById('dashboard-ticker-filter')
  );
  const isEmpty = state.dashboardOpenLots.length === 0;
  const exchangeFilter = /** @type {HTMLSelectElement} */ (
    document.getElementById('dashboard-exchange-filter')
  );
  const isFilteredEmpty =
    aggregatedLots.length === 0 &&
    individualLotsForTable.length === 0 &&
    !isEmpty &&
    (filterInput.value !== '' || exchangeFilter.value !== '');
  const message = isEmpty
    ? 'No open positions found.'
    : isFilteredEmpty
      ? 'No positions match the current filter.'
      : 'Loading...';

  console.log('[renderDashboardUI] Before conditional rendering. cardGrid innerHTML length:', cardGrid.innerHTML.length, 'tableBody innerHTML length:', tableBody.innerHTML.length);

  // Conditionally render based on active sub-tab
  if (activeSubTab === 'dashboard-card-view') {
    console.log('[renderDashboardUI] Active sub-tab is card view.');
    if (aggregatedLots.length === 0 && (isEmpty || isFilteredEmpty)) {
      cardGrid.innerHTML = `<p>${message}</p>`;
    } else {
      cardGrid.innerHTML = aggregatedLots
        .map((agg) => createAggregatedCardHTML(agg))
        .join('');
    }
    tableBody.innerHTML = ''; // Clear table content when card view is active
  } else if (activeSubTab === 'dashboard-table-view') {
    console.log('[renderDashboardUI] Active sub-tab is table view.');
    cardGrid.innerHTML = ''; // Clear card content when table view is active
    let tableRowsHTML = '';

    if (individualLotsForTable.length > 0) {
      tableRowsHTML += individualLotsForTable
        .map((lot) => createTableRowHTML(lot))
        .join('');
    }

    if (openOrders.length > 0) {
      if (individualLotsForTable.length > 0) {
        tableRowsHTML += `<tr><td colspan="10" class="table-section-header">Open Orders</td></tr>`;
      }
      tableRowsHTML += openOrders
        .map((order) => createOpenOrderTableRowHTML(order))
        .join('');
    }

    if (tableRowsHTML === '' && (isEmpty || isFilteredEmpty)) {
      tableBody.innerHTML = `<tr><td colspan="10">${message}</td></tr>`;
      totalUnrealizedPL = 0;
      totalCurrentValue = 0;
    } else {
      tableBody.innerHTML = tableRowsHTML;
    }
  }
  console.log('[renderDashboardUI] After conditional rendering. cardGrid innerHTML length:', cardGrid.innerHTML.length, 'tableBody innerHTML length:', tableBody.innerHTML.length);

  // Update footers - always update, even if zero
  totalPlFooter.textContent = formatAccounting(totalUnrealizedPL);
  totalPlFooter.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
  totalValueFooter.textContent = formatAccounting(totalCurrentValue);
  totalValueFooter.className = `numeric`; // Reset class if needed
}
