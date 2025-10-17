// /public/ui/renderers/_dailyReport.js
// Version 0.1.12
/**
 * @file Renderer for the daily report page.
 * @module renderers/_dailyReport
 */
import { state } from '../../state.js';
import { formatAccounting, formatQuantity } from '../formatters.js';

/**
 * Renders the daily transaction report into the table.
 * @param {string} date - The date for the report.
 * @param {Map<string, object>} activityMap - A map to store activity data.
 * @param {object | null} perfData - Performance data.
 * @param {object | null} positionData - Position data.
 */
export function renderDailyReportPage(date, activityMap, perfData, positionData) {
    const tableTitle = document.getElementById('table-title');
    if (tableTitle) {
        tableTitle.textContent = `Daily Report for ${date}`;
    }

    const logBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('log-body'));
    const summaryBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('positions-summary-body'));

    if (!logBody || !summaryBody) return;

    activityMap.clear();
    logBody.innerHTML = '';
    summaryBody.innerHTML = '';

    if (!positionData || !positionData.dailyTransactions || positionData.dailyTransactions.length === 0) {
        logBody.innerHTML = '<tr><td colspan="10">No transactions logged for this day.</td></tr>';
    } else {
        positionData.dailyTransactions.forEach(tx => {
            const row = logBody.insertRow();
            row.innerHTML = `
                <td>${tx.ticker}</td>
                <td>${tx.exchange}</td>
                <td class="center-align">${tx.transaction_type}</td>
                <td class="numeric">${formatQuantity(tx.quantity)}</td>
                <td class="numeric">${formatAccounting(tx.price)}</td>
                <td class="numeric ${tx.realizedPL >= 0 ? 'positive' : 'negative'}">${tx.realizedPL ? formatAccounting(tx.realizedPL) : '--'}</td>
                <td></td> <td class="numeric">--</td>
                <td class="numeric">--</td>
                <td class="center-align"></td>
            `;
        });
    }

    const oldFilterBar = document.getElementById('daily-report-filter-bar');
    if(oldFilterBar) oldFilterBar.remove();

    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    filterBar.id = 'daily-report-filter-bar';
    filterBar.innerHTML = `<input type="text" id="daily-ticker-filter" placeholder="Filter by Ticker...">`;
    summaryBody.parentElement.insertBefore(filterBar, summaryBody);


    if (!positionData || !positionData.endOfDayPositions || positionData.endOfDayPositions.length === 0) {
        summaryBody.innerHTML = '<tr><td colspan="10">No open positions at the end of this day.</td></tr>';
    } else {
        positionData.endOfDayPositions.forEach(pos => {
            const lotKey = `lot-${pos.id}`;
            activityMap.set(lotKey, pos);
            const row = summaryBody.insertRow();
            row.dataset.key = lotKey;
            row.innerHTML = `
                <td>${pos.ticker}</td>
                <td>${pos.exchange}</td>
                <td>${pos.purchase_date}</td>
                <td class="numeric">${formatAccounting(pos.cost_basis)}</td>
                <td class="numeric">${formatQuantity(pos.quantity_remaining)}</td>
                <td class="numeric current-price">--</td>
                <td class="numeric unrealized-pl-combined">--</td>
                <td class="numeric">${pos.limit_price_up ? formatAccounting(pos.limit_price_up, false) : ''}</td>
                <td class="numeric">${pos.limit_price_down ? formatAccounting(pos.limit_price_down, false) : ''}</td>
                <td class="center-align actions-cell">
                    <button class="sell-from-lot-btn" data-buy-id="${pos.id}" data-ticker="${pos.ticker}" data-exchange="${pos.exchange}" data-quantity="${pos.quantity_remaining}">Sell</button>
                    <button class="set-limit-btn" data-id="${pos.id}">Limits</button>
                    <button class="edit-buy-btn" data-id="${pos.id}">Edit</button>
                </td>
            `;
        });
    }

    const filterInput = /** @type {HTMLInputElement} */ (document.getElementById('daily-ticker-filter'));
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const filterValue = (/** @type {HTMLInputElement} */ (e.target)).value.toUpperCase();
            const rows = summaryBody.getElementsByTagName('tr');
            for (let i = 0; i < rows.length; i++) {
                const tickerCell = rows[i].getElementsByTagName('td')[0];
                if (tickerCell) {
                    const ticker = tickerCell.textContent.toUpperCase();
                    rows[i].style.display = ticker.includes(filterValue) ? '' : 'none';
                }
            }
        });
    }
}