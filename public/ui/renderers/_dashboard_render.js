// public/ui/renderers/_dashboard_render.js
// ... (imports are unchanged) ...
import { state } from '../../state.js';
import { showToast } from '../helpers.js';
import { formatAccounting } from '../formatters.js';
// Import data processing functions
import { loadAndPrepareDashboardData, processFilterAndSortLots } from './_dashboard_data.js';
// Import HTML generation functions
import { createAggregatedCardHTML, createTableRowHTML } from './_dashboard_html.js';

/**
 * Renders the dashboard UI elements (cards, table, footers).
 * @param {any[]} aggregatedLots - Processed and sorted array of aggregated lots.
 * @param {any[]} individualLotsForTable - Processed and sorted array of individual lots.
 * @param {number} totalUnrealizedPL - Calculated total P/L.
 * @param {number} totalCurrentValue - Calculated total value.
 */
function renderDashboardUI(aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue) {
    // ... (this function is unchanged) ...
    const cardGrid = document.getElementById('positions-cards-grid');
    const tableBody = document.getElementById('open-positions-tbody');
    const totalPlFooter = document.getElementById('dashboard-unrealized-pl-total');
    const totalValueFooter = document.getElementById('dashboard-total-value');

    if (!cardGrid || !tableBody || !totalPlFooter || !totalValueFooter) {
        console.error("Dashboard renderer (UI): Missing required DOM elements.");
        return;
    }

    const filterInput = /** @type {HTMLInputElement} */ (document.getElementById('dashboard-ticker-filter'));
    const isEmpty = state.dashboardOpenLots.length === 0;
    // --- MODIFIED: Check both filters ---
    const exchangeFilter = /** @type {HTMLSelectElement} */ (document.getElementById('dashboard-exchange-filter'));
    const isFilteredEmpty = aggregatedLots.length === 0 && individualLotsForTable.length === 0 && !isEmpty && (filterInput.value !== '' || exchangeFilter.value !== '');
    // --- END MODIFIED ---
    const message = isEmpty ? 'No open positions found.' : (isFilteredEmpty ? 'No positions match the current filter.' : 'Loading...'); // Adjusted message

    // Render Aggregated Cards
    if (aggregatedLots.length === 0 && (isEmpty || isFilteredEmpty)) { // Show message only if truly empty or filtered empty
        cardGrid.innerHTML = `<p>${message}</p>`;
    } else {
        cardGrid.innerHTML = aggregatedLots.map(agg => createAggregatedCardHTML(agg)).join('');
    }

    // Render Individual Lot Table Rows
    if (individualLotsForTable.length === 0 && (isEmpty || isFilteredEmpty)) { // Show message only if truly empty or filtered empty
        tableBody.innerHTML = `<tr><td colspan="10">${message}</td></tr>`;
        // Ensure totals are zeroed out when no lots are displayed due to filter or emptiness
        totalUnrealizedPL = 0;
        totalCurrentValue = 0;
    } else {
        tableBody.innerHTML = individualLotsForTable.map(lot => createTableRowHTML(lot)).join('');
    }

    // Update footers - always update, even if zero
    totalPlFooter.textContent = formatAccounting(totalUnrealizedPL);
    totalPlFooter.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    totalValueFooter.textContent = formatAccounting(totalCurrentValue);
    totalValueFooter.className = `numeric`; // Reset class if needed
}


/**
 * Main function to render the dashboard page (orchestrator).
 * Fetches data, processes, aggregates, sorts, and populates the DOM.
 */
export async function renderDashboardPage() {
    const cardGrid = document.getElementById('positions-cards-grid');
    const tableBody = document.getElementById('open-positions-tbody');
    const filterInput = /** @type {HTMLInputElement} */ (document.getElementById('dashboard-ticker-filter'));
    // --- THIS IS THE FIX ---
    const exchangeFilter = /** @type {HTMLSelectElement} */ (document.getElementById('dashboard-exchange-filter'));
    // --- END FIX ---
    const sortSelect = /** @type {HTMLSelectElement} */ (document.getElementById('dashboard-sort-select'));
    const totalPlFooter = document.getElementById('dashboard-unrealized-pl-total');
    const totalValueFooter = document.getElementById('dashboard-total-value');

    // --- THIS IS THE FIX ---
    if (!cardGrid || !tableBody || !filterInput || !exchangeFilter || !sortSelect || !totalPlFooter || !totalValueFooter) {
    // --- END FIX ---
        console.error("Dashboard renderer orchestration: Missing required DOM elements. Aborting render.");
        return;
    }

    // Show initial loading state
    cardGrid.innerHTML = '<p>Loading open positions...</p>';
    tableBody.innerHTML = '<tr><td colspan="10">Loading open positions...</td></tr>';
    totalPlFooter.textContent = '--';
    totalValueFooter.textContent = '--';

    try {
        // Step 1: Load data using function from _dashboard_data.js
        const openLots = await loadAndPrepareDashboardData();

        // Get filter/sort values
        const filterValue = filterInput.value.toUpperCase();
        // --- THIS IS THE FIX ---
        const exchangeFilterValue = exchangeFilter.value;
        // --- END FIX ---
        const sortValue = sortSelect.value;

        // Step 2: Process data using function from _dashboard_data.js
        // --- THIS IS THE FIX ---
        const { aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue } = processFilterAndSortLots(openLots, filterValue, exchangeFilterValue, sortValue);
        // --- END FIX ---

        // Step 3: Render the UI using function in this file
        renderDashboardUI(aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue);

    } catch (error) {
        console.error("Unexpected error during dashboard page render:", error);
        // @ts-ignore
        showToast(`An unexpected error occurred while loading the dashboard: ${error.message}`, 'error');
        const errorMsg = 'Error loading positions.';
        if (cardGrid) cardGrid.innerHTML = `<p>${errorMsg}</p>`;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="10">${errorMsg}</td></tr>`;
        if (totalPlFooter) totalPlFooter.textContent = 'Error';
        if (totalValueFooter) totalValueFooter.textContent = 'Error';
    }
}