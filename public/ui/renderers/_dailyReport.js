// Portfolio Tracker V3.0.5
// public/ui/renderers/_dailyReport.js
import { state } from '../../state.js'; // FIX: Corrected import path
import { formatQuantity, formatAccounting, getTradingDays} from '../helpers.js';

/**
 * Renders the full daily report for a specific date using pre-fetched data.
 * This function is now decoupled from data fetching.
 * @param {string} date - The date for which to generate the report in 'YYYY-MM-DD' format.
 * @param {Map<string, object>} activityMap - The application's activity map to be populated with the day's open positions.
 * @param {object | null} perfData - The pre-fetched daily performance data.
 * @param {{dailyTransactions: any[], endOfDayPositions: any[]} | null} positionData - The pre-fetched transaction and position data.
 * @returns {void}
 */
export function renderDailyReport(date, activityMap, perfData, positionData) {
    const tableTitle = document.getElementById('table-title');
    const performanceSummary = document.getElementById('daily-performance-summary');
    const logBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('log-body'));
    const summaryBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('positions-summary-body'));
    let dailyRealizedPL = 0;

    const confirmationHeader = document.getElementById('confirmation-header');
    const lastTradingDay = getTradingDays(1)[0];
    const isCurrentTradingDay = (date === lastTradingDay);

    if (confirmationHeader) {
        confirmationHeader.style.display = isCurrentTradingDay ? '' : 'none';
    }

    if (tableTitle) {
        let titleText = `Activity Report for ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        let holderName = 'All Accounts';
        if(state.selectedAccountHolderId !== 'all') {
            const holder = state.allAccountHolders.find(h => String(h.id) === state.selectedAccountHolderId);
            if(holder) holderName = holder.name;
        }
        titleText += ` (${holderName})`;
        tableTitle.textContent = titleText;
    }

    if(performanceSummary) {
        performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>--</span></h3><h3 id="total-value-summary">Total Open Value: <span>--</span></h3>`;
        const performanceSpan = performanceSummary.querySelector('h3:first-child span');
        if (performanceSpan && perfData) {
            const change = perfData.dailyChange;
            const percentage = (perfData.previousValue !== 0) ? (change / perfData.previousValue * 100).toFixed(2) : 0;
            const colorClass = change >= 0 ? 'positive' : 'negative';
            performanceSpan.className = colorClass;
            performanceSpan.innerHTML = `${formatAccounting(change)} (${percentage}%)`;
        }
    }

    if (logBody) {
        if (!positionData || positionData.dailyTransactions.length === 0) {
            logBody.innerHTML = '<tr><td colspan="12">No transactions logged for this day.</td></tr>';
        } else {
            const rowsHTML = positionData.dailyTransactions.map(tx => {
                dailyRealizedPL += tx.realizedPL || 0;
                const confirmationCellHTML = isCurrentTradingDay 
                    ? '<td><input type="checkbox" class="confirmation-check"></td>' 
                    : '<td style="display: none;"></td>';
                return `
                    <tr>
                        ${confirmationCellHTML}
                        <td>${tx.ticker}</td>
                        <td>${tx.exchange}</td>
                        <td>${tx.transaction_type}</td>
                        <td class="numeric">${formatQuantity(tx.quantity)}</td>
                        <td class="numeric">${formatAccounting(tx.price)}</td>
                        <td class="numeric">${formatAccounting(tx.realizedPL)}</td>
                        <td></td>
                        <td></td>
                        <td class="numeric">${formatAccounting(tx.limit_price_up)}</td>
                        <td class="numeric">${formatAccounting(tx.limit_price_down)}</td>
                        <td></td>
                    </tr>`;
            });
            logBody.innerHTML = rowsHTML.join('');
        }
        const realizedGainsSummarySpan = document.querySelector('#realized-gains-summary span');
         if (realizedGainsSummarySpan) {
             realizedGainsSummarySpan.innerHTML = `<strong>${formatAccounting(dailyRealizedPL)}</strong>`;
        }
    }

    if (summaryBody) {
        summaryBody.innerHTML = '';
        activityMap.clear();
        if (!positionData || positionData.endOfDayPositions.length === 0) {
            summaryBody.innerHTML = '<tr><td colspan="10">No open positions at the end of this day.</td></tr>';
        } else {
            const rowsHTML = positionData.endOfDayPositions.map(p => {
                const key = `lot-${p.id}`;
                activityMap.set(key, { ...p });
                return `
                    <tr data-key="${key}">
                        <td>${p.ticker}</td>
                        <td>${p.exchange}</td>
                        <td>${p.purchase_date}</td>
                        <td class="numeric">${formatAccounting(p.cost_basis)}</td>
                        <td class="numeric">${formatQuantity(p.quantity_remaining)}</td>
                        <td class="numeric current-price"><div class="loader"></div></td>
                        <td class="numeric unrealized-pl-combined">--</td>
                        <td class="numeric">${p.limit_price_up ? formatAccounting(p.limit_price_up) : '--'}</td>
                        <td class="numeric">${p.limit_price_down ? formatAccounting(p.limit_price_down) : '--'}</td>
                        <td class="actions-cell">
                            <button class="edit-buy-btn modify-btn" data-id="${p.id}" title="Edit Original Buy Transaction">Edit</button>
                            <button class="set-limit-btn modify-btn" data-id="${p.id}" title="Set/Edit Limit Order">Limits</button>
                            <button class="sell-from-lot-btn" data-buy-id="${p.id}" data-ticker="${p.ticker}" data-exchange="${p.exchange}" data-quantity="${p.quantity_remaining}">Sell</button>
                        </td>
                    </tr>`;
            });
            summaryBody.innerHTML = rowsHTML.join('');
        }
    }
}