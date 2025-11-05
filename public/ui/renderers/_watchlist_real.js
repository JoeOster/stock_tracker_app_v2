// public/ui/renderers/_watchlist_real.js
/**
 * @file Renderer for the "From Real Trades" sub-tab on the Watchlist page.
 * @module renderers/_watchlist_real
 */

import { state } from '../../state.js';
import { fetchPositions } from '../../api/reporting-api.js';
import { showToast } from '../helpers.js';
import { getCurrentESTDateString } from '../datetime.js';

/**
 * Fetches, processes, and renders the "From Real Trades" sub-tab.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
export async function renderRealTickers(panelElement) {
  const tableBody = /** @type {HTMLTableSectionElement} */ (
    document.getElementById('watchlist-real-tbody')
  );

  if (!tableBody) {
    panelElement.innerHTML =
      '<h3>Executed Trades (Today)</h3><p style="color:red;">Error: Table body #watchlist-real-tbody not found in template.</p>';
    return;
  }

  tableBody.innerHTML =
    '<tr><td colspan="8">Loading executed trades...</td></tr>';

  const holderId = state.selectedAccountHolderId;
  if (!holderId || holderId === 'all') {
    tableBody.innerHTML = `<tr><td colspan="8">Please select a specific account holder.</td></tr>
      <tr><td colspan="8">Note: This view now shows executed trades for today only.</td></tr>`;
    return;
  }

  try {
    const positionData = await fetchPositions(
      getCurrentESTDateString(),
      holderId
    );
    const dailyTransactions = positionData.dailyTransactions || [];

    if (dailyTransactions.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="8">No executed trades found for today.</td></tr>';
      return;
    }

    // Render the table rows for daily transactions
    tableBody.innerHTML = dailyTransactions
      .map((tx) => `
        <tr>
          <td>${tx.trade_date}</td>
          <td>${tx.ticker}</td>
          <td>${tx.transaction_type}</td>
          <td>${tx.quantity}</td>
          <td>${tx.price}</td>
          <td>${tx.total_amount}</td>
        </tr>
      `)
      .join('');

    // Update the table header to reflect executed trades
    const tableHead = document.querySelector('#watchlist-real-table thead tr');
    if (tableHead) {
      tableHead.innerHTML = `
        <th>Date</th>
        <th>Ticker</th>
        <th>Type</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
      `;
    }

  } catch (error) {
    console.error('Error rendering executed trades watchlist:', error);
    showToast(`Error loading executed trades: ${error.message}`, 'error');
    tableBody.innerHTML = `<tr><td colspan="8">Error loading executed trades: ${error.message}</td></tr>`;
  }
}
