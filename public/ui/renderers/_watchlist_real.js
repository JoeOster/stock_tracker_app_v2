// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/ui/renderers/_watchlist_real.js
/**
 * @file Renderer for the "From Real Trades" sub-tab on the Watchlist page.
 * @module renderers/_watchlist_real
 */

import { state } from '../../state.js';
import { fetchOpenPositions } from '../../api/transactions-api.js';
import { updatePricesForView } from '../../api/price-api.js';
import {
  formatAccounting,
  formatPercent,
  formatDate,
  formatQuantity,
} from '../formatters.js';
import { getCurrentESTDateString } from '../datetime.js';

/**
 * Creates the HTML for the "From Real Trades" table.
 * @param {any[]} openPositions - Array of open positions.
 * @returns {string}
 */
function createRealTableHTML(openPositions) {
  if (openPositions.length === 0) {
    return '<p>No open positions found.</p>';
  }

  let tableHTML = `
        <table id="watchlist-real-table" class="data-table">
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Entry Date</th>
                    <th class="numeric">Quantity</th>
                    <th class="numeric">Avg. Cost</th>
                    <th class="numeric">Current Price</th>
                    <th class="numeric">Unrealized P/L</th>
                    <th>Exchange</th>
                </tr>
            </thead>
            <tbody>
    `;

  openPositions.forEach((item) => {
    const priceData = state.priceCache.get(item.ticker);
    let priceDisplay = '<i>Fetching...</i>';
    let plDisplay = '<i>...</i>';

    if (priceData && typeof priceData.price === 'number') {
      priceDisplay = formatAccounting(priceData.price);

      const pnl = (priceData.price - item.average_cost) * item.total_quantity;
      const pnlPercent =
        (priceData.price - item.average_cost) / item.average_cost;
      const pnlClass = pnl >= 0 ? 'positive' : 'negative';

      plDisplay = `<span class="${pnlClass}">${formatAccounting(pnl)} (${formatPercent(pnlPercent)})</span>`;
    } else if (priceData) {
      priceDisplay = `<span class="negative">${priceData.price}</span>`; // e.g., "Error"
    }

    tableHTML += `
            <tr data-ticker="${item.ticker}">
                <td>${item.ticker}</td>
                <td>${formatDate(item.first_buy_date)}</td>
                <td class="numeric">${formatQuantity(item.total_quantity)}</td>
                <td class="numeric">${formatAccounting(item.average_cost)}</td>
                <td class="numeric">${priceDisplay}</td>
                <td class->${plDisplay}</td>
                <td>${item.exchange}</td>
            </tr>
        `;
  });

  tableHTML += '</tbody></table>';
  return tableHTML;
}

/**
 * Fetches, processes, and renders the "From Real Trades" sub-tab.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
export async function renderRealTickers(panelElement) {
  panelElement.innerHTML =
    '<h3>From Real Trades</h3><p>Loading open positions...</p>';

  // @ts-ignore
  const holderId = state.selectedAccountHolderId;
  if (!holderId || holderId === 'all') {
    panelElement.innerHTML =
      '<h3>From Real Trades</h3><p>Please select a specific account holder.</p>';
    return;
  }

  // Step 1: Fetch the open positions
  const openPositions = await fetchOpenPositions(holderId);

  // Step 2: Fetch prices for those tickers
  const tickersToFetch = openPositions.map((item) => item.ticker);
  if (tickersToFetch.length > 0) {
    await updatePricesForView(getCurrentESTDateString(), tickersToFetch);
  }

  // Step 3: Render the table
  const tableHTML = createRealTableHTML(openPositions);

  panelElement.innerHTML = `
        <h3>From Real Trades</h3>
        <p>This list shows all your current open positions.</p>
        <div id="watchlist-real-table-container" style="margin-top: 1.5rem;">
            ${tableHTML}
        </div>
    `;
}
