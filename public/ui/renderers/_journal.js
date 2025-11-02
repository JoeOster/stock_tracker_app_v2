// /public/ui/renderers/_journal.js
/**
 * @file Renders the Journal (Paper Trading) tables.
 * @module renderers/_journal
 */

import { state } from '../../state.js';
import { formatAccounting, formatQuantity, formatDate } from '../formatters.js';
// --- MODIFIED: Import the correct function name ---
import { getSourceNameFromId } from '../../ui/dropdowns.js';
// --- END MODIFICATION ---

/**
 * Generates the HTML for the action buttons in a journal row.
 * @param {object} entry - The journal entry object.
 * @param {boolean} [readOnly=false] - If true, only show the 'Edit' button.
 * @returns {string} HTML string for the action buttons.
 */
function getActionButtonsHTML(entry, readOnly = false) {
  const entryId = entry.id;
  const editButton = `<button class="journal-edit-btn" data-id="${entryId}" title="Edit Entry">✏️</button>`;

  if (readOnly) {
    return editButton; // Only show "Edit" in read-only mode
  }

  // Full action buttons for the main Journal page
  const executeButton =
    entry.direction === 'BUY'
      ? `<button class="journal-execute-btn" data-id="${entryId}" title="Execute This BUY Trade">⚡</button>`
      : '';
  const closeButton = `<button class="journal-close-btn" data-id="${entryId}" title="Manually Close Trade">X</button>`;
  const deleteButton = `<button class="journal-delete-btn delete-btn" data-id="${entryId}" title="Delete Entry">🗑️</button>`;

  return `${executeButton} ${closeButton} ${editButton} ${deleteButton}`;
}

/**
 * Generates the HTML for a single row in the 'Open Ideas' table.
 * @param {object} entry - The journal entry object.
 * @param {boolean} [readOnly=false] - If true, only show the 'Edit' button.
 * @returns {string} HTML string for the table row.
 */
function createOpenTableRowHTML(entry, readOnly = false) {
  // --- MODIFIED: Use the correct function call ---
  const sourceName =
    getSourceNameFromId(entry.advice_source_id) ||
    entry.advice_source_details ||
    '--';
  // --- END MODIFIED ---
  const { priceData, currentPL, plClass } = calculateCurrentPL(entry);
  const currentPriceDisplay =
    priceData && typeof priceData.price === 'number'
      ? formatAccounting(priceData.price)
      : priceData?.price || '--'; // Show text if it's a message like 'TBD'

  const actionButtons = getActionButtonsHTML(entry, readOnly);

  return `
        <tr data-id="${entry.id}">
            <td>${formatDate(entry.entry_date)}</td>
            <td>${entry.ticker}</td>
            <td class="numeric">${formatAccounting(entry.entry_price)}</td>
            <td class="numeric">${formatQuantity(entry.quantity)}</td>
            <td class="numeric">${formatAccounting(entry.target_price)}</td>
            <td class="numeric">${formatAccounting(entry.target_price_2)}</td>
            <td class="numeric">${formatAccounting(entry.stop_loss_price)}</td>
            <td class="numeric">${currentPriceDisplay}</td>
            <td class="numeric ${plClass}">${formatAccounting(currentPL)}</td>
            <td>${sourceName}</td>
            <td class="center-align actions-cell">${actionButtons}</td>
        </tr>
    `;
}

/**
 * Generates the HTML for a single row in the 'Closed Ideas' table.
 * @param {object} entry - The journal entry object.
 * @param {boolean} [readOnly=false] - If true, only show the 'Edit' button.
 * @returns {string} HTML string for the table row.
 */
function createClosedTableRowHTML(entry, readOnly = false) {
  // --- MODIFIED: Use the correct function call ---
  const sourceName =
    getSourceNameFromId(entry.advice_source_id) ||
    entry.advice_source_details ||
    '--';
  // --- END MODIFIED ---
  const pl = entry.pnl ?? 0;
  const plClass = pl >= 0 ? 'positive' : 'negative';
  const statusText =
    entry.status === 'EXECUTED'
      ? `Executed (Tx #${entry.linked_trade_id})`
      : entry.status;

  const actionButtons = readOnly
    ? `<button class="journal-edit-btn" data-id="${entry.id}" title="Edit Entry">✏️</button>`
    : `<button class="journal-edit-btn" data-id="${entry.id}" title="Edit Entry">✏️</button> <button class="journal-delete-btn delete-btn" data-id="${entry.id}" title="Delete Entry">🗑️</button>`;

  return `
        <tr data-id="${entry.id}" class="text-muted">
            <td>${formatDate(entry.entry_date)}</td>
            <td>${formatDate(entry.exit_date)}</td>
            <td>${entry.ticker}</td>
            <td class="numeric">${formatAccounting(entry.entry_price)}</td>
            <td class="numeric">${formatAccounting(entry.exit_price)}</td>
            <td class="numeric">${formatQuantity(entry.quantity)}</td>
            <td class="numeric ${plClass}">${formatAccounting(pl)}</td>
            <td>${statusText}</td>
            <td>${sourceName}</td>
            <td class="center-align actions-cell">${actionButtons}</td>
        </tr>
    `;
}

/**
 * Calculates the current P/L for an open journal entry.
 * @param {object} entry - The journal entry object.
 * @returns {{priceData: object, currentPL: number, plClass: string}}
 */
function calculateCurrentPL(entry) {
  const priceData = state.priceCache.get(entry.ticker);
  let currentPL = 0;
  let plClass = '';

  if (priceData && typeof priceData.price === 'number' && priceData.price > 0) {
    if (entry.direction === 'BUY') {
      currentPL = (priceData.price - entry.entry_price) * entry.quantity;
    } else {
      // 'SELL'
      currentPL = (entry.entry_price - priceData.price) * entry.quantity;
    }
    plClass = currentPL >= 0 ? 'positive' : 'negative';
  }
  return { priceData, currentPL, plClass };
}

/**
 * Calculates and updates summary statistics for the journal.
 * @param {object[]} openEntries - Array of open journal entries.
 * @param {object[]} closedEntries - Array of closed/executed entries.
 */
function updateJournalSummary(openEntries, closedEntries) {
  // --- Open Ideas ---
  let totalOpenPL = 0;
  openEntries.forEach((entry) => {
    totalOpenPL += calculateCurrentPL(entry).currentPL;
  });
  const avgOpenPL =
    openEntries.length > 0 ? totalOpenPL / openEntries.length : 0;

  // --- Closed Ideas ---
  const closedTrades = closedEntries.filter((e) => e.status === 'CLOSED');
  let totalClosedPL = 0;
  let winningTrades = 0;
  closedTrades.forEach((entry) => {
    const pnl = entry.pnl ?? 0;
    totalClosedPL += pnl;
    if (pnl > 0) {
      winningTrades++;
    }
  });
  const winRate =
    closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
  const avgGainLoss =
    closedTrades.length > 0 ? totalClosedPL / closedTrades.length : 0;

  // --- Update DOM ---
  const openCountEl = document.getElementById('journal-open-count');
  const openPnlEl = document.getElementById('journal-open-pnl');
  const winRateEl = document.getElementById('journal-win-rate');
  const avgGainLossEl = document.getElementById('journal-avg-gain-loss');

  if (openCountEl) openCountEl.textContent = String(openEntries.length);
  if (openPnlEl) {
    openPnlEl.textContent = formatAccounting(avgOpenPL);
    openPnlEl.className = avgOpenPL >= 0 ? 'positive' : 'negative';
  }
  if (winRateEl) winRateEl.textContent = `${winRate.toFixed(1)}%`;
  if (avgGainLossEl) {
    avgGainLossEl.textContent = formatAccounting(avgGainLoss);
    avgGainLossEl.className = avgGainLoss >= 0 ? 'positive' : 'negative';
  }
}

/**
 * Renders the open and closed journal tables.
 * @param {object} journalData - An object containing openEntries and closedEntries arrays.
 * @param {boolean} [readOnly=false] - If true, renders tables in read-only mode (no action buttons).
 */
export function renderJournalPage(journalData, readOnly = false) {
  const { openEntries, closedEntries } = journalData || {
    openEntries: [],
    closedEntries: [],
  };

  const openTableBody = document.querySelector('#journal-open-body');
  const closedTableBody = document.querySelector('#journal-closed-body');

  // --- Render Open Table ---
  if (openTableBody) {
    if (openEntries && openEntries.length > 0) {
      openTableBody.innerHTML = openEntries
        .map((entry) => createOpenTableRowHTML(entry, readOnly))
        .join('');
    } else {
      openTableBody.innerHTML =
        '<tr><td colspan="11">No open journal entries found.</td></tr>';
    }
  }

  // --- Render Closed Table ---
  if (closedTableBody) {
    if (closedEntries && closedEntries.length > 0) {
      closedTableBody.innerHTML = closedEntries
        .map((entry) => createClosedTableRowHTML(entry, readOnly))
        .join('');
    } else {
      closedTableBody.innerHTML =
        '<tr><td colspan="10">No closed or executed entries found.</td></tr>';
    }
  }

  // --- Update Summary (only if summary elements exist, e.g., on the full Journal page) ---
  if (document.getElementById('journal-open-count')) {
    updateJournalSummary(openEntries, closedEntries);
  }
}
