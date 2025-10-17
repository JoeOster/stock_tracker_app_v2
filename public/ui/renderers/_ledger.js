// /public/ui/renderers/_ledger.js
// Version 0.1.11
/**
 * @file Renderer for the transaction ledger.
 * @module renderers/_ledger
 */

import { formatAccounting, formatQuantity } from '../helpers.js';

/**
 * Renders the transaction ledger into the table.
 * @param {Array<object>} transactions - The transactions to render.
 * @param {object} sort - The sort order.
 */
export function renderLedgerPage(transactions, sort) {
    const ledgerBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#ledger-table tbody'));
    if (!ledgerBody) return;

    const ledgerFilterTicker = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-ticker'));
    const ledgerFilterStart = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-start'));
    const ledgerFilterEnd = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-end'));

    const tickerFilter = ledgerFilterTicker ? ledgerFilterTicker.value.toUpperCase() : '';
    const startDate = ledgerFilterStart ? ledgerFilterStart.value : '';
    const endDate = ledgerFilterEnd ? ledgerFilterEnd.value : '';

    const filtered = transactions.filter(tx => {
        const tickerMatch = !tickerFilter || tx.ticker.toUpperCase().includes(tickerFilter);
        const startDateMatch = !startDate || tx.transaction_date >= startDate;
        const endDateMatch = !endDate || tx.transaction_date <= endDate;
        return tickerMatch && startDateMatch && endDateMatch;
    });

    if (sort && sort.column) {
        filtered.sort((a, b) => {
            let valA = a[sort.column];
            let valB = b[sort.column];
            if (typeof valA === 'string') {
                valA = valA.toUpperCase();
                valB = valB.toUpperCase();
            }
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    ledgerBody.innerHTML = '';
    let lastDate = null;
    filtered.forEach(tx => {
        const row = ledgerBody.insertRow();
        if (tx.transaction_date !== lastDate) {
            row.classList.add('new-date-group');
            lastDate = tx.transaction_date;
        }
        row.innerHTML = `
            <td>${tx.transaction_date}</td>
            <td>${tx.ticker}</td>
            <td>${tx.exchange}</td>
            <td class="center-align">${tx.transaction_type}</td>
            <td class="numeric">${formatQuantity(tx.quantity)}</td>
            <td class="numeric">${formatAccounting(tx.price)}</td>
            <td class="center-align">
                <button class="modify-btn" data-id="${tx.id}">Edit</button>
                <button class="delete-btn" data-id="${tx.id}">Delete</button>
            </td>
        `;
    });
}