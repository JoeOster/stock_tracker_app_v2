// public/ui/renderers/_dailyReport.js
import { state } from '../../app-main.js';
import { formatQuantity, formatAccounting } from '../helpers.js';

export async function renderDailyReport(date, activityMap) {
    const tableTitle = document.getElementById('table-title');
    const performanceSummary = document.getElementById('daily-performance-summary');
    const logBody = document.getElementById('log-body');
    const summaryBody = document.getElementById('positions-summary-body');
    let dailyRealizedPL = 0;

    if (tableTitle) {
        let titleText = `Activity Report for ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        
        let holderName = 'All Accounts';
        if(state.selectedAccountHolderId !== 'all') {
            const holder = state.allAccountHolders.find(h => h.id == state.selectedAccountHolderId);
            if(holder) holderName = holder.name;
        }
        titleText += ` (${holderName})`;

        tableTitle.textContent = titleText;
    }

    if(performanceSummary) { performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>--</span></h3><h3 id="total-value-summary">Total Open Value: <span>--</span></h3>`; }

    try {
        const perfResponse = await fetch(`/api/reporting/daily_performance/${date}?holder=${state.selectedAccountHolderId}`);
        if(perfResponse.ok) {
            const perfData = await perfResponse.json();
            const performanceSpan = performanceSummary.querySelector('h3:first-child span');
            if (performanceSpan && perfData) {
                const change = perfData.dailyChange;
                const percentage = (perfData.previousValue !== 0) ? (change / perfData.previousValue * 100).toFixed(2) : 0;
                const colorClass = change >= 0 ? 'positive' : 'negative';
                performanceSpan.className = colorClass;
                performanceSpan.innerHTML = `${formatAccounting(change)} (${percentage}%)`;
            }
        }
    } catch (e) { console.error("Could not fetch daily performance", e); }

    try {
        const response = await fetch(`/api/reporting/positions/${date}?holder=${state.selectedAccountHolderId}`);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);
        const data = await response.json();
        if (!data || !data.dailyTransactions || !data.endOfDayPositions) { throw new Error("Invalid data structure received."); }

        if (logBody) {
            let totalCostOfSoldShares = 0;
            logBody.innerHTML = '';
            if (data.dailyTransactions.length === 0) {
                logBody.innerHTML = '<tr><td colspan="12">No transactions logged for this day.</td></tr>';
            } else {
                data.dailyTransactions.forEach(tx => {
                    dailyRealizedPL += tx.realizedPL || 0;
                    if (tx.transaction_type === 'SELL' && tx.parent_buy_price) {
                        totalCostOfSoldShares += tx.parent_buy_price * tx.quantity;
                    }
                    logBody.insertRow().innerHTML = `<td><input type="checkbox" class="confirmation-check"></td><td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td class="numeric">${formatQuantity(tx.quantity)}</td><td class="numeric">${formatAccounting(tx.price)}</td><td class="numeric">${formatAccounting(tx.realizedPL)}</td><td></td><td></td><td class="numeric">${formatAccounting(tx.limit_price_up)}</td><td class="numeric">${formatAccounting(tx.limit_price_down)}</td><td></td>`;
                });
            }
            
            const realizedGainsSummarySpan = document.querySelector('#realized-gains-summary span');
            let realizedText = `<strong>${formatAccounting(dailyRealizedPL)}</strong>`;
            if (realizedGainsSummarySpan) {
                if (totalCostOfSoldShares > 0) {
                    const realizedPercent = (dailyRealizedPL / totalCostOfSoldShares) * 100;
                    const colorClass = realizedPercent >= 0 ? 'positive' : 'negative';
                    realizedText += ` (<span class="${colorClass}">${realizedPercent.toFixed(2)}%</span>)`;
                }
                realizedGainsSummarySpan.innerHTML = realizedText;
            }

            const headerSummary = document.getElementById('header-daily-summary');
            if (headerSummary) {
                headerSummary.innerHTML = `Realized: ${realizedText}`;
            }
        }

        if (summaryBody) {
            summaryBody.innerHTML = '';
            activityMap.clear();
            if (data.endOfDayPositions.length === 0) {
                summaryBody.innerHTML = '<tr><td colspan="11">No open positions at the end of this day.</td></tr>';
            } else {
                data.endOfDayPositions.forEach(p => {
                    const key = `lot-${p.id}`;
                    activityMap.set(key, { ...p });
                    let limitUpText = p.limit_price_up ? formatAccounting(p.limit_price_up) : '--';
                    if (p.limit_price_up && p.limit_up_expiration) { limitUpText += ` on ${p.limit_up_expiration}`; }
                    let limitDownText = p.limit_price_down ? formatAccounting(p.limit_price_down) : '--';
                    if (p.limit_price_down && p.limit_down_expiration) { limitDownText += ` on ${p.limit_down_expiration}`; }

                    const row = summaryBody.insertRow();
                    row.dataset.key = key;
                    row.innerHTML = `
                        <td>${p.ticker}</td>
                        <td>${p.exchange}</td>
                        <td>${p.purchase_date}</td>
                        <td class="numeric">${formatAccounting(p.cost_basis)}</td>
                        <td class="numeric">${formatQuantity(p.quantity_remaining)}</td>
                        <td class="numeric current-price"><div class="loader"></div></td>
                        <td class="numeric unrealized-pl-dollar">--</td>
                        <td class="numeric unrealized-pl-percent">--</td>
                        <td class="numeric">${limitUpText}</td>
                        <td class="numeric">${limitDownText}</td>
                        <td class="actions-cell">
                            <button class="edit-buy-btn modify-btn" data-id="${p.id}" title="Edit Original Buy Transaction">Edit</button>
                            <button class="set-limit-btn modify-btn" data-id="${p.id}" title="Set/Edit Limit Order">Limits</button>
                            <button class="sell-from-lot-btn" data-buy-id="${p.id}" data-ticker="${p.ticker}" data-exchange="${p.exchange}" data-quantity="${p.quantity_remaining}">Sell</button>
                        </td>`;
                });
            }
        }
    } catch (error) {
        console.error("Failed to render daily report:", error);
        if (logBody) logBody.innerHTML = '<tr><td colspan="12">Error loading transaction data.</td></tr>';
        if (summaryBody) summaryBody.innerHTML = '<tr><td colspan="11">Error loading position data.</td></tr>';
    }
}