// /public/ui/renderers/_watchlist_real.js
/**
 * @file Renderer for the "Real Positions" sub-tab on the Watchlist page.
 * @module renderers/_watchlist_real
 */

// /public/ui/renderers/_watchlist_real.js
import { formatAccounting, formatQuantity, formatDate } from '../formatters.js';
import {
  loadAndPrepareDashboardData,
  processFilterAndSortLots,
} from './_dashboard_data.js';

/**
 * Renders the HTML for a single read-only position row.
 * @param {object} lot - The processed position lot data.
 * @returns {string} HTML string for the table row.
 */
function createReadOnlyRowHTML(lot) {
  const { priceData, unrealizedPL, unrealizedPercent, proximity } = lot;
  const currentPriceValue =
    priceData && typeof priceData.price === 'number' ? priceData.price : null;

  const plClass = unrealizedPL >= 0 ? 'positive' : 'negative';
  let currentPriceDisplay = '--';
  if (currentPriceValue !== null) {
    currentPriceDisplay = formatAccounting(currentPriceValue);
  } else if (priceData?.price) {
    currentPriceDisplay = `<span class="negative">${priceData.price}</span>`;
  }

  let proximityIndicator = '';
  if (proximity === 'up')
    proximityIndicator =
      '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
  else if (proximity === 'down')
    proximityIndicator =
      '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';

  return `
        <tr data-lot-id="${lot.id}">
            <td>${lot.ticker}</td>
            <td>${lot.exchange}</td>
            <td>${formatDate(lot.purchase_date)}</td>
            <td class="numeric">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric">${currentPriceDisplay}</td>
            <td class="numeric ${plClass}">
                ${formatAccounting(unrealizedPL)} | ${unrealizedPercent.toFixed(2)}% ${proximityIndicator}
            </td>
        </tr>
    `;
}

/**
 * Fetches, processes, and renders the read-only table of real positions.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
export async function renderWatchlistRealPositions(panelElement) {
  panelElement.innerHTML =
    '<h3>Real Positions (Info-Only)</h3><p>Loading positions...</p>';

  try {
    // Step 1: Load data (fetches, updates prices, stores in state.dashboardOpenLots)
    const openLots = await loadAndPrepareDashboardData();

    if (openLots.length === 0) {
      panelElement.innerHTML =
        '<h3>Real Positions (Info-Only)</h3><p>No open positions found.</p>';
      return;
    }

    // Step 2: Process data (calculates metrics, filters, sorts)
    // We use blank/default filter/sort values to get all lots
    const { individualLotsForTable, totalUnrealizedPL, totalCurrentValue } =
      processFilterAndSortLots(openLots, '', 'ticker-asc');

    // Step 3: Render the read-only table
    let tableHTML = `
            <h3>Real Positions (Info-Only)</h3>
            <table id="watchlist-real-table" class="data-table">
                <thead>
                    <tr>
                        <th data-sort="ticker">Ticker</th>
                        <th data-sort="exchange">Exchange</th>
                        <th data-sort="purchase_date">Purchase Date</th>
                        <th class="numeric" data-sort="cost_basis" data-type="numeric">Basis</th>
                        <th class="numeric" data-sort="quantity_remaining" data-type="numeric">Qty</th>
                        <th class="numeric" data-sort="current-price" data-type="numeric">Current Price</th>
                        <th class="numeric" data-sort="unrealized-pl-dollar" data-type="numeric">Unrealized P/L ($ | %)</th>
                    </tr>
                </thead>
                <tbody>
                    ${individualLotsForTable.map(createReadOnlyRowHTML).join('')}
                </tbody>
                <tfoot>
                     <tr>
                         <td colspan="5" style="text-align: right; font-weight: bold;">Totals:</td>
                         <td id="watchlist-total-value" class="numeric"><strong>${formatAccounting(totalCurrentValue)}</strong></td>
                         <td id="watchlist-unrealized-pl" class="numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}"><strong>${formatAccounting(totalUnrealizedPL)}</strong></td>
                     </tr>
                 </tfoot>
            </table>
        `;
    panelElement.innerHTML = tableHTML;
  } catch (error) {
    console.error('Error rendering Watchlist real positions:', error);
    // @ts-ignore
    panelElement.innerHTML = `<h3>Real Positions (Info-Only)</h3><p style="color: var(--negative-color);">Error loading positions: ${error.message}</p>`;
  }
}
