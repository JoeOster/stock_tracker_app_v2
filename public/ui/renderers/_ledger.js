// /public/ui/renderers/_ledger.js
/**
 * @file UI rendering functions for the Transaction Ledger page.
 * @module ui/renderers/_ledger
 */

import { state } from '../../state.js';
import { formatAccounting } from '../formatters.js';

/**
 * Renders the main transaction ledger table.
 * @param {Array<Object>} transactions - The list of transactions to display.
 * @param {Object} sortConfig - The current sort configuration.
 */
export function renderLedgerPage(transactions, sortConfig) {
  const tableBody = document.querySelector('#ledger-table tbody');
  if (!tableBody) {
    console.error('Ledger table body not found.');
    return;
  }

  // Clear existing rows
  tableBody.innerHTML = '';

  // Apply filters
  let filteredTransactions = [...transactions];

  const tickerFilter = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-ticker'))?.value.toLowerCase();
  const startDateFilter = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-start'))?.value;
  const endDateFilter = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-end'))?.value;

  if (tickerFilter) {
    filteredTransactions = filteredTransactions.filter(tx => tx.ticker.toLowerCase().includes(tickerFilter));
  }
  if (startDateFilter) {
    filteredTransactions = filteredTransactions.filter(tx => tx.transaction_date >= startDateFilter);
  }
  if (endDateFilter) {
    filteredTransactions = filteredTransactions.filter(tx => tx.transaction_date <= endDateFilter);
  }

  // Apply sorting
  if (sortConfig && sortConfig.column) {
    filteredTransactions.sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      // Numeric comparison
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }

  if (filteredTransactions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="no-data">No transactions found.</td></tr>';
    return;
  }

  filteredTransactions.forEach(tx => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tx.transaction_date}</td>
      <td>${tx.ticker}</td>
      <td>${tx.exchange}</td>
      <td class="center-align">${tx.transaction_type}</td>
      <td class="numeric">${tx.quantity}</td>
      <td class="numeric">${formatAccounting(tx.price)}</td>
      <td class="center-align">
        <button class="modify-btn" data-id="${tx.id}" title="Edit Transaction"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${tx.id}" title="Delete Transaction"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Renders the Realized P&L summary in the compact bar.
 * @param {'lifetime' | 'ranged'} type - The type of P&L summary to render.
 * @param {Object} plData - The P&L data, containing a 'total' property.
 */
export function renderLedgerPLSummary(type, plData) {
  const pnlValueDisplay = document.getElementById('pnl-value-display');
  if (!pnlValueDisplay) {
    console.error('P&L value display element not found.');
    return;
  }

  const totalPL = plData.total || 0;
  pnlValueDisplay.textContent = `${totalPL >= 0 ? '+' : ''}${formatAccounting(totalPL)}`;
  pnlValueDisplay.className = `pnl-value ${totalPL >= 0 ? 'profit' : 'loss'}`;
}