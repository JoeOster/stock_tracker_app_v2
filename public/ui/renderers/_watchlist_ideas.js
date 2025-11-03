// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/ui/renderers/_watchlist_ideas.js
/**
 * @file Renderer for the "Trade Ideas" (Paper Trades) sub-tab on the Watchlist page.
 * @module renderers/_watchlist_ideas
 */

import { state } from '../../state.js';
import { fetchJournalEntries } from '../../api/journal-api.js';
import { updatePricesForView } from '../../api/price-api.js';
import { formatAccounting, formatPercent, formatDate } from '../formatters.js';
import { getCurrentESTDateString } from '../datetime.js';

/**
 * Creates the HTML for the "Trade Ideas" (Paper Trades) table.
 * @param {any[]} journalEntries - Array of journal entries.
 * @returns {string}
 */
function createIdeasTableHTML(journalEntries) {
  const openEntries = journalEntries.filter((j) => j.status === 'OPEN');

  if (openEntries.length === 0) {
    return '<p>No open paper trades found.</p>';
  }

  let tableHTML = `
        <table id="watchlist-ideas-table" class="data-table">
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Entry Date</th>
                    <th class="numeric">Entry Price</th>
                    <th class="numeric">Current Price</th>
                    <th class="numeric">P/L</th>
                    <th>Source</th>
                    <th>Reason</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

  openEntries.forEach((item) => {
    const priceData = state.priceCache.get(item.ticker);
    let priceDisplay = '<i>Fetching...</i>';
    let plDisplay = '<i>...</i>';

    if (
      priceData &&
      typeof priceData.price === 'number' &&
      item.entry_price > 0
    ) {
      priceDisplay = formatAccounting(priceData.price);

      const pnl = (priceData.price - item.entry_price) * item.quantity;
      const pnlPercent =
        (priceData.price - item.entry_price) / item.entry_price;
      const pnlClass = pnl >= 0 ? 'positive' : 'negative';

      plDisplay = `<span class="${pnlClass}">${formatAccounting(pnl)} (${formatPercent(pnlPercent)})</span>`;
    } else if (priceData && typeof priceData.price === 'number') {
      priceDisplay = formatAccounting(priceData.price);
      plDisplay = 'N/A'; // No P/L if entry price is 0
    } else if (priceData) {
      priceDisplay = `<span class="negative">${priceData.price}</span>`; // e.g., "Error"
    }

    const sourceName = item.source_name || 'N/A';
    const reason = item.entry_reason || 'N/A';

    tableHTML += `
            <tr data-id="${item.id}" data-ticker="${item.ticker}">
                <td>${item.ticker}</td>
                <td>${formatDate(item.entry_date)}</td>
                <td class="numeric">${formatAccounting(item.entry_price)}</td>
                <td class="numeric">${priceDisplay}</td>
                <td class="numeric">${plDisplay}</td>
                <td title="${sourceName}">${sourceName.substring(0, 20)}...</td>
                <td title="${reason}">${reason.substring(0, 30)}...</td>
                <td class="center-align">
                    <button class="delete-watchlist-idea-btn delete-btn" data-id="${item.id}" title="Archive Idea">X</button>
                </td>
            </tr>
        `;
  });

  tableHTML += '</tbody></table>';
  return tableHTML;
}

/**
 * Fetches, processes, and renders the "Trade Ideas" (Paper Trades) sub-tab.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
export async function renderWatchlistIdeas(panelElement) {
  panelElement.innerHTML =
    '<h3>Paper Trades (Trade Ideas)</h3><p>Loading paper trades...</p>';

  // @ts-ignore
  const holderId = state.selectedAccountHolderId;
  if (!holderId || holderId === 'all') {
    panelElement.innerHTML =
      '<h3>Paper Trades (Trade Ideas)</h3><p>Please select a specific account holder.</p>';
    return;
  }

  // Step 1: Fetch the journal entries
  const journalEntries = await fetchJournalEntries(
    holderId,
    getCurrentESTDateString()
  );

  // Step 2: Fetch prices for those tickers
  const tickersToFetch = [
    ...new Set(
      journalEntries
        .filter((j) => j.status === 'OPEN')
        .map((item) => item.ticker)
    ),
  ];
  if (tickersToFetch.length > 0) {
    await updatePricesForView(getCurrentESTDateString(), tickersToFetch);
  }

  // Step 3: Render the table
  const tableHTML = createIdeasTableHTML(journalEntries);

  panelElement.innerHTML = `
        <h3>Paper Trades (Trade Ideas)</h3>
        <div id="watchlist-ideas-table-container" style="margin-top: 1.5rem;">
            ${tableHTML}
        </div>
    `;
}
