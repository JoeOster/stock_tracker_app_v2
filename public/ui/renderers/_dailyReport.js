// /public/ui/renderers/_dailyReport.js
// Version Updated (Conditional Columns for Historical Dates)
/**
 * @file Renderer for the daily report page.
 * @module renderers/_dailyReport
 */
// /public/ui/renderers/_dailyReport.js
import { formatAccounting, formatQuantity } from '../formatters.js';
import { getCurrentESTDateString } from '../datetime.js';

/**
 * Renders the daily transaction report into the table.
 * @param {string} date - The date for the report (YYYY-MM-DD).
 * @param {Map<string, object>} activityMap - A map to store activity data.
 * @param {object | null} perfData - Performance data.
 * @param {object | null} positionData - Position data ({dailyTransactions: [], endOfDayPositions: []}).
 */
export function renderDailyReportPage(
  date,
  activityMap,
  perfData,
  positionData
) {
  const tableTitle = document.getElementById('table-title');
  if (tableTitle) {
    tableTitle.textContent = `Daily Report for ${date}`;
  }

  const logHeaderRow = /** @type {HTMLTableRowElement | null} */ (
    document.querySelector(
      '#stock-table thead:nth-of-type(1) tr:nth-of-type(2)'
    )
  );
  const logBody = /** @type {HTMLTableSectionElement} */ (
    document.getElementById('log-body')
  );
  const summaryHeaderRow = /** @type {HTMLTableRowElement | null} */ (
    document.querySelector(
      '#stock-table thead:nth-of-type(2) tr:nth-of-type(2)'
    )
  );
  const summaryBody = /** @type {HTMLTableSectionElement} */ (
    document.getElementById('positions-summary-body')
  );
  const summaryFooterRow = /** @type {HTMLTableRowElement | null} */ (
    document.querySelector('#stock-table tfoot tr:first-child')
  );

  if (
    !logHeaderRow ||
    !logBody ||
    !summaryHeaderRow ||
    !summaryBody ||
    !summaryFooterRow
  ) {
    console.error('Daily Report: Could not find all necessary table elements.');
    return;
  }

  const isCurrentDay = date === getCurrentESTDateString();
  // UPDATED Colspan based on conditional columns
  // Base: Ticker + Exch + Action/Date + Basis/Qty + Qty/Price + Current/Realized + Unrealized/Placeholder + Limits = 8
  // Add 1 for Checkbox if current day
  // Add 1 for Actions if current day
  const logTableColspan = isCurrentDay ? 9 : 7; // Base 7 + Checkbox + Actions
  const summaryTableColspan = isCurrentDay ? 10 : 8; // Base 8 + Checkbox + Actions

  // --- Daily Transaction Log Header ---
  logHeaderRow.innerHTML = ''; // Clear previous headers
  let logHeaderHTML = '';
  if (isCurrentDay) {
    logHeaderHTML += `<th class="reconciliation-checkbox-header sticky-col-checkbox col-check"></th>`; // Checkbox
  }
  logHeaderHTML += `
        <th data-sort="ticker" class="sticky-col-ticker col-ticker">Ticker</th>
        <th data-sort="exchange" class="col-exchange">Exchange</th>
        <th data-sort="transaction_type" class="center-align col-type">Action</th>
        <th class="numeric col-qty" data-sort="quantity" data-type="numeric">Qty</th>
        <th class="numeric col-price" data-sort="price" data-type="numeric">Price</th>
        <th class="numeric col-pl" data-sort="realizedPL" data-type="numeric">Realized P/L</th>
        `;
  if (isCurrentDay) {
    logHeaderHTML += `<th class="center-align sticky-col-actions col-actions">Actions</th>`; // Actions
  }
  logHeaderRow.innerHTML = logHeaderHTML;
  // Update colspan for the section header row above
  const logSectionHeader = /** @type {HTMLTableCellElement | null} */ (
    logHeaderRow.parentElement?.previousElementSibling?.querySelector(
      'th[colspan]'
    )
  );
  if (logSectionHeader) logSectionHeader.colSpan = logTableColspan; // Use calculated colspan

  // --- Daily Transaction Log Body ---
  activityMap.clear(); // Clear old activity map data
  logBody.innerHTML = ''; // Clear previous body

  if (
    !positionData ||
    !positionData.dailyTransactions ||
    positionData.dailyTransactions.length === 0
  ) {
    logBody.innerHTML = `<tr><td colspan="${logTableColspan}">No transactions logged for this day.</td></tr>`;
  } else {
    positionData.dailyTransactions.forEach((tx) => {
      const row = logBody.insertRow();
      let rowHTML = '';
      if (isCurrentDay) {
        rowHTML += `<td class="reconciliation-checkbox-cell center-align sticky-col-checkbox col-check"><input type="checkbox" class="reconciliation-checkbox"></td>`;
      }
      rowHTML += `
                <td class="sticky-col-ticker col-ticker">${tx.ticker}</td>
                <td class_exchange="col-exchange">${tx.exchange}</td>
                <td class="center-align col-type">${tx.transaction_type}</td>
                <td class="numeric col-qty">${formatQuantity(tx.quantity)}</td>
                <td class="numeric col-price">${formatAccounting(tx.price)}</td>
                <td class="numeric col-pl ${tx.realizedPL >= 0 ? 'positive' : 'negative'}">${tx.realizedPL ? formatAccounting(tx.realizedPL) : '--'}</td>
                `;
      if (isCurrentDay) {
        // Actions empty for log rows, but cell needs to exist for column count
        rowHTML += `<td class="center-align actions-cell sticky-col-actions col-actions"></td>`;
      }
      row.innerHTML = rowHTML;
    });
  }

  // --- Open Lots Table Header ---
  summaryHeaderRow.innerHTML = ''; // Clear previous headers
  let summaryHeaderHTML = '';
  if (isCurrentDay) {
    summaryHeaderHTML += `<th class="reconciliation-checkbox-header sticky-col-checkbox col-check"></th>`; // Checkbox
  }
  summaryHeaderHTML += `
        <th data-sort="ticker" class="sticky-col-ticker col-ticker">Ticker</th>
        <th data-sort="exchange" class="col-exchange">Exchange</th>
        <th data-sort="purchase_date" class="col-date">Purchase Date</th>
        <th class="numeric col-price" data-sort="cost_basis" data-type="numeric">Basis</th>
        <th class="numeric col-qty center-align" data-sort="quantity_remaining" data-type="numeric">Qty</th>
        <th class="numeric col-price" data-sort="current-price" data-type="numeric">Current Price</th>
        <th class="numeric col-pl" data-sort="unrealized-pl-dollar" data-type="numeric">Unrealized P/L ($ | %)</th>
        <th class="numeric col-limits">Limits (Up/Down)</th>
    `;
  if (isCurrentDay) {
    summaryHeaderHTML += `<th class="center-align sticky-col-actions col-actions-lg">Actions</th>`; // Actions
  }
  summaryHeaderRow.innerHTML = summaryHeaderHTML;
  // Update colspan for the section header row above
  const summarySectionHeader = /** @type {HTMLTableCellElement | null} */ (
    summaryHeaderRow.parentElement?.previousElementSibling?.querySelector(
      'th[colspan]'
    )
  );
  if (summarySectionHeader) summarySectionHeader.colSpan = summaryTableColspan; // Use calculated colspan

  // --- Filter Bar (remains the same) ---
  const oldFilterBar = document.getElementById('daily-report-filter-bar');
  if (oldFilterBar) oldFilterBar.remove();
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.id = 'daily-report-filter-bar';
  filterBar.innerHTML = `<input type="text" id="daily-ticker-filter" placeholder="Filter by Ticker...">`;
  const summaryThead = summaryHeaderRow.parentElement;
  if (summaryThead && summaryThead.parentElement) {
    summaryThead.parentElement.insertBefore(filterBar, summaryThead);
  }

  // --- Open Lots Table Body ---
  summaryBody.innerHTML = ''; // Clear previous body
  if (
    !positionData ||
    !positionData.endOfDayPositions ||
    positionData.endOfDayPositions.length === 0
  ) {
    summaryBody.innerHTML = `<tr><td colspan="${summaryTableColspan}">No open positions at the end of this day.</td></tr>`;
  } else {
    positionData.endOfDayPositions.forEach((pos) => {
      const lotKey = `lot-${pos.id}`;
      if (isCurrentDay) {
        // Only populate activityMap for the current day view
        activityMap.set(lotKey, pos);
      }
      const row = summaryBody.insertRow();
      row.dataset.key = lotKey; // Still add key for potential click events (like advice modal)

      let rowHTML = '';
      if (isCurrentDay) {
        rowHTML += `<td class="reconciliation-checkbox-cell center-align sticky-col-checkbox col-check"><input type="checkbox" class="reconciliation-checkbox"></td>`;
      }
      // Format combined limits
      const limitUpText = pos.limit_price_up
        ? formatAccounting(pos.limit_price_up, false)
        : '--';
      const limitDownText = pos.limit_price_down
        ? formatAccounting(pos.limit_price_down, false)
        : '--';
      const limitsCombinedText = `${limitUpText} / ${limitDownText}`;

      rowHTML += `
                <td class="sticky-col-ticker col-ticker">${pos.ticker}</td>
                <td class="col-exchange">${pos.exchange}</td>
                <td class_date="col-date">${pos.purchase_date}</td>
                <td class="numeric col-price">${formatAccounting(pos.cost_basis)}</td>
                <td class="numeric col-qty center-align">${formatQuantity(pos.quantity_remaining)}</td>
                <td class="numeric current-price col-price">--</td>
                <td class="numeric unrealized-pl-combined col-pl">--</td>
                <td class="numeric col-limits">${limitsCombinedText}</td>
            `;
      if (isCurrentDay) {
        rowHTML += `
                 <td class="center-align actions-cell sticky-col-actions col-actions-lg">
                    <button class="sell-from-lot-btn" data-buy-id="${pos.id}" data-ticker="${pos.ticker}" data-exchange="${pos.exchange}" data-quantity="${pos.quantity_remaining}">Sell</button>
                    <button class="set-limit-btn" data-id="${pos.id}">Limits</button>
                    <button class="edit-buy-btn" data-id="${pos.id}">Edit</button>
                </td>`;
      }
      row.innerHTML = rowHTML;
    });
  }

  // --- Footer Update ---
  const labelCell = summaryFooterRow.querySelector('td:first-child');
  // Footer Colspan Calculation: Total Columns - P/L Cell (1) - Remaining Right Cells (1: Actions if present, 0 otherwise)
  const footerRightCells = isCurrentDay ? 1 : 0;
  const footerLabelColspan = summaryTableColspan - 1 - footerRightCells;
  if (labelCell)
    /** @type {HTMLTableCellElement} */ (labelCell).colSpan =
      footerLabelColspan;

  // Ensure the last footer cell (if it exists beyond the label and P/L) has the correct colspan
  const plCellIndex = footerLabelColspan; // Index of the P/L cell
  const lastFooterCell = /** @type {HTMLTableCellElement | null} */ (
    summaryFooterRow.cells[plCellIndex + 1]
  );
  if (lastFooterCell) {
    lastFooterCell.colSpan = footerRightCells; // Set to 1 if actions exist, 0 otherwise (effectively hiding if 0?)
    lastFooterCell.style.display = footerRightCells > 0 ? '' : 'none'; // Explicitly hide if colspan is 0
  }

  // --- Filter Input Event Listener ---
  const filterInput = /** @type {HTMLInputElement} */ (
    document.getElementById('daily-ticker-filter')
  );
  if (filterInput) {
    // Ensure only one listener is attached
    filterInput.removeEventListener('input', filterRows);
    filterInput.addEventListener('input', filterRows);
  }

  // Define filterRows function within the scope
  function filterRows() {
    if (!filterInput || !summaryBody) return; // Guard clause
    const filterValue = filterInput.value.toUpperCase();
    const rows = summaryBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      // Ticker is ALWAYS the second cell if checkbox exists, first if not.
      const tickerCellIndex = isCurrentDay ? 1 : 0; // Adjust index based on checkbox presence
      const tickerCell = rows[i].getElementsByTagName('td')[tickerCellIndex];
      if (tickerCell) {
        const ticker = tickerCell.textContent?.toUpperCase() ?? '';
        const isMatch = ticker.includes(filterValue);
        rows[i].style.display = isMatch ? '' : 'none';
      }
    }
  }

  // --- Price Population (Only for current day) ---
  if (isCurrentDay) {
    // Prices are fetched and populated by loadDailyReportPage in _dailyReport.js event handler
  } else {
    // For historical dates, attempt to populate prices statically if needed,
    // otherwise they remain '--'
    // This might require fetching historical EOD prices if not already available
    // in positionData (which it currently isn't designed for).
    // For now, historical prices will just show '--'.
    summaryBody
      .querySelectorAll('.current-price')
      .forEach((cell) => (cell.textContent = '--'));
    summaryBody
      .querySelectorAll('.unrealized-pl-combined')
      .forEach((cell) => (cell.textContent = '--'));
  }
}
