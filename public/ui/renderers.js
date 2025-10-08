import { formatQuantity, formatAccounting, getActivePersistentDates, getTradingDays, getCurrentESTDateString } from './helpers.js';
import { renderAllTimeChart, renderFiveDayChart, renderDateRangeChart } from './charts.js';
import { state } from '../app-main.js';

export function renderTabs(currentView) {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';
    const tradingDays = getTradingDays(6);
    const activePersistentDates = getActivePersistentDates();
    const allDates = [...new Set([...tradingDays, ...activePersistentDates])].sort();

    allDates.forEach(day => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = 'date';
        tab.dataset.viewValue = day;
        tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        if (day === currentView.value && currentView.type === 'date') { tab.classList.add('active'); }
        tabsContainer.appendChild(tab);
    });

    const chartsTab = document.createElement('div');
    chartsTab.className = 'tab master-tab';
    chartsTab.dataset.viewType = 'charts';
    chartsTab.textContent = 'Charts';
    if (currentView.type === 'charts') chartsTab.classList.add('active');
    tabsContainer.appendChild(chartsTab);

    const ledgerTab = document.createElement('div');
    ledgerTab.className = 'tab master-tab';
    ledgerTab.dataset.viewType = 'ledger';
    ledgerTab.textContent = 'Ledger';
    if (currentView.type === 'ledger') ledgerTab.classList.add('active');
    tabsContainer.appendChild(ledgerTab);

    const snapshotsTab = document.createElement('div');
    snapshotsTab.className = 'tab master-tab';
    snapshotsTab.dataset.viewType = 'snapshots';
    snapshotsTab.textContent = 'Snapshots';
    if (currentView.type === 'snapshots') snapshotsTab.classList.add('active');
    tabsContainer.appendChild(snapshotsTab);
}

export function renderLedger(allTransactions, ledgerSort) {
    const ledgerTableBody = document.querySelector('#ledger-table tbody');
    if(!ledgerTableBody) return;
    
    // --- Filter Logic (Unchanged) ---
    const ledgerFilterTicker = document.getElementById('ledger-filter-ticker');
    const ledgerFilterStart = document.getElementById('ledger-filter-start');
    const ledgerFilterEnd = document.getElementById('ledger-filter-end');
    const filterTicker = ledgerFilterTicker.value.toUpperCase().trim();
    const filterStart = ledgerFilterStart.value;
    const filterEnd = ledgerFilterEnd.value;

    const filteredTransactions = allTransactions.filter(tx => {
        const tickerMatch = filterTicker ? tx.ticker.toUpperCase().includes(filterTicker) : true;
        const startDateMatch = filterStart ? tx.transaction_date >= filterStart : true;
        const endDateMatch = filterEnd ? tx.transaction_date <= filterEnd : true;
        return tickerMatch && startDateMatch && endDateMatch;
    });

    // --- CORRECTED Summary Calculation Logic ---
    const summaryContainer = document.getElementById('ledger-summary-container');
    if (summaryContainer) {
        let buyCount = 0;
        let sellCount = 0;
        let totalCost = 0;
        let totalProceeds = 0;

        filteredTransactions.forEach(tx => {
            if (tx.transaction_type === 'BUY') {
                buyCount++;
                totalCost += tx.quantity * tx.price;
            } else if (tx.transaction_type === 'SELL') {
                sellCount++;
                totalProceeds += tx.quantity * tx.price;
            }
        });

        summaryContainer.innerHTML = `
            <div><h4>Buy Transactions</h4><p>${buyCount}</p></div>
            <div><h4>Sell Transactions</h4><p>${sellCount}</p></div>
            <div><h4>Total Cost</h4><p>${formatAccounting(totalCost)}</p></div>
            <div><h4>Total Proceeds</h4><p>${formatAccounting(totalProceeds)}</p></div>
        `;
    }

    // --- Sorting Logic (Unchanged) ---
    filteredTransactions.sort((a, b) => {
        const col = ledgerSort.column;
        const dir = ledgerSort.direction === 'asc' ? 1 : -1;
        if (col === 'quantity' || col === 'price') return (a[col] - b[col]) * dir;
        return a[col].localeCompare(b[col]) * dir;
    });
    document.querySelectorAll('#ledger-table thead th[data-sort]').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === ledgerSort.column) { th.classList.add(ledgerSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc'); }
    });

    // --- Table Rendering with Date Grouping (Unchanged) ---
    ledgerTableBody.innerHTML = '';
    if (filteredTransactions.length === 0) {
        ledgerTableBody.innerHTML = '<tr><td colspan="7">No transactions match the current filters.</td></tr>';
        if (summaryContainer) summaryContainer.innerHTML = '';
        return;
    }
    let lastDate = null;
    filteredTransactions.forEach(tx => {
        const row = ledgerTableBody.insertRow();
        if (tx.transaction_date !== lastDate && lastDate !== null) {
            row.classList.add('new-date-group');
        }
        row.innerHTML = `<td>${tx.transaction_date}</td><td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td class="numeric">${formatQuantity(tx.quantity)}</td><td class="numeric">${formatAccounting(tx.price)}</td><td class="actions-cell"><button class="modify-btn" data-id="${tx.id}">Edit</button><button class="delete-btn" data-id="${tx.id}">Delete</button></td>`;
        lastDate = tx.transaction_date;
    });
}



export async function renderChartsPage(state) {
    const plSummaryTable = document.getElementById('pl-summary-table');
    const allTimeChartCtx = document.getElementById('all-time-chart')?.getContext('2d');
    if (!plSummaryTable || !allTimeChartCtx) return;

    const overviewDateSpan = document.getElementById('overview-date');
    if(overviewDateSpan) {
        const today = new Date(getCurrentESTDateString() + 'T12:00:00Z');
        overviewDateSpan.textContent = `(as of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`;
    }

    async function renderRangedPLSummary() {
        const startDate = document.getElementById('pl-start-date').value;
        const endDate = document.getElementById('pl-end-date').value;
        const rangedTable = document.getElementById('pl-summary-ranged-table');
        if (!startDate || !endDate || !rangedTable) return;
        try {
            const res = await fetch('/api/realized_pl/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate, accountHolderId: state.selectedAccountHolderId })
            });
            if (res.ok) {
                const plData = await res.json();
                if (plData.byExchange.length === 0) {
                     rangedTable.innerHTML = '<tbody><tr><td>No realized P&L in this date range.</td></tr></tbody>';
                     return;
                }
                const plBody = plData.byExchange.map(row => `<tr><td>${row.exchange}</td><td class="numeric">${formatAccounting(row.total_pl)}</td></tr>`).join('');
                rangedTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P&L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
            }
        } catch (error) {
            console.error("Failed to render Ranged P&L Summary:", error);
            rangedTable.innerHTML = '<tbody><tr><td>Error loading data.</td></tr></tbody>';
        }
    }

    try {
        const plResponse = await fetch(`/api/realized_pl/summary?holder=${state.selectedAccountHolderId}`);
        if (plResponse.ok) {
            const plData = await plResponse.json();
            const plBody = plData.byExchange.map(row => `<tr><td>${row.exchange}</td><td class="numeric">${formatAccounting(row.total_pl)}</td></tr>`).join('');
            plSummaryTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P&L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
        }
    } catch (error) { console.error("Failed to render P&L Summary:", error); }
    
    const fiveDayChartCtx = document.getElementById('five-day-chart')?.getContext('2d');
    const dateRangeChartCtx = document.getElementById('date-range-chart')?.getContext('2d');
    const chartStartDate = document.getElementById('chart-start-date');
    const chartEndDate = document.getElementById('chart-end-date');
    state.allTimeChart = renderAllTimeChart(allTimeChartCtx, state.allTimeChart, state.allSnapshots, state);
    state.fiveDayChart = renderFiveDayChart(fiveDayChartCtx, state.fiveDayChart, state.allSnapshots, state);
    state.dateRangeChart = renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, state.dateRangeChart, state.allSnapshots, state);
    
    await renderPortfolioOverview(state.priceCache);

    const plStartDate = document.getElementById('pl-start-date');
    const plEndDate = document.getElementById('pl-end-date');
    plStartDate.value = '2025-09-30';
    plEndDate.value = getCurrentESTDateString();
    plStartDate.addEventListener('change', renderRangedPLSummary);
    plEndDate.addEventListener('change', renderRangedPLSummary);
    renderRangedPLSummary();
}

export async function renderPortfolioOverview(priceCache) {
    const overviewBody = document.getElementById('portfolio-overview-body');
    if (!overviewBody) return;
    overviewBody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    try {
        const overviewResponse = await fetch(`/api/portfolio/overview?holder=${state.selectedAccountHolderId}`);
        if (!overviewResponse.ok) throw new Error('Failed to load portfolio overview data');
        const data = await overviewResponse.json();
        if (data.length === 0) {
            overviewBody.innerHTML = '<tr><td colspan="8">No open positions to display.</td></tr>';
            return;
        }
        const tickersToUpdate = data.map(pos => pos.ticker);
        const priceResponse = await fetch('/api/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersToUpdate, date: getCurrentESTDateString() })
        });
        if (!priceResponse.ok) throw new Error('Failed to fetch batch prices for overview');
        const prices = await priceResponse.json();
        for (const ticker in prices) {
            if (prices[ticker] !== null) priceCache.set(ticker, prices[ticker]);
        }
        overviewBody.innerHTML = '';
        let totalUnrealizedPL = 0;
        for (const pos of data) {
            const priceToUse = priceCache.get(pos.ticker);
            const priceHTML = priceToUse ? formatAccounting(priceToUse) : '--';
            const totalValue = pos.total_quantity * priceToUse;
            const totalCost = pos.total_quantity * pos.weighted_avg_cost;
            const unrealizedPL = (priceToUse) ? totalValue - totalCost : null;
            if(unrealizedPL) totalUnrealizedPL += unrealizedPL;

            const dayChangeAmount = priceToUse && pos.previous_close ? (priceToUse - pos.previous_close) * pos.total_quantity : null;
            const dayChangePercent = priceToUse && pos.previous_close && pos.previous_close !== 0 ? ((priceToUse - pos.previous_close) / pos.previous_close) * 100 : null;

            overviewBody.insertRow().innerHTML = `
                <td>${pos.ticker}</td>
                <td class="numeric">${formatQuantity(pos.total_quantity)}</td>
                <td class="numeric">${formatAccounting(pos.weighted_avg_cost)}</td>
                <td class="numeric current-price">${priceHTML}</td>
                <td class="numeric ${dayChangeAmount >= 0 ? 'positive' : 'negative'}">${formatAccounting(dayChangeAmount)}</td>
                <td class="numeric ${dayChangePercent >= 0 ? 'positive' : 'negative'}">${dayChangePercent ? dayChangePercent.toFixed(2) + '%' : '--'}</td>
                <td class="numeric">${formatAccounting(totalValue)}</td>
                <td class="numeric ${unrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(unrealizedPL)}</td>`;
        }
        const totalRow = overviewBody.insertRow();
        totalRow.style.fontWeight = 'bold';
        totalRow.innerHTML = `<td colspan="7" style="text-align: right;">Total Unrealized P/L</td><td class="numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(totalUnrealizedPL)}</td>`;
    } catch (error) {
        console.error("Failed to render portfolio overview:", error);
        overviewBody.innerHTML = `<tr><td colspan="8">Error loading portfolio overview: ${error.message}</td></tr>`;
    }
}

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

    if(performanceSummary) { performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>$0.00</span></h3><h3 id="total-value-summary">Total Open Value: <span>$0.00</span></h3>`; }

    try {
        const perfResponse = await fetch(`/api/daily_performance/${date}?holder=${state.selectedAccountHolderId}`);
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
        const response = await fetch(`/api/positions/${date}?holder=${state.selectedAccountHolderId}`);
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);
        const data = await response.json();
        if (!data || !data.dailyTransactions || !data.endOfDayPositions) { throw new Error("Invalid data structure received."); }

        if (logBody) {
            logBody.innerHTML = '';
            if (data.dailyTransactions.length === 0) {
                logBody.innerHTML = '<tr><td colspan="10">No transactions logged for this day.</td></tr>';
            } else {
                data.dailyTransactions.forEach(tx => {
                    dailyRealizedPL += tx.realizedPL || 0;
                    logBody.insertRow().innerHTML = `<td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td class="numeric">${formatQuantity(tx.quantity)}</td><td class="numeric">${formatAccounting(tx.price)}</td><td class="numeric">${formatAccounting(tx.realizedPL)}</td><td></td><td></td><td class="numeric">${formatAccounting(tx.limit_price_up)}</td><td class="numeric">${formatAccounting(tx.limit_price_down)}</td>`;
                });
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
        
        const realizedGainsSummarySpan = document.querySelector('#realized-gains-summary span');
        if (realizedGainsSummarySpan) { realizedGainsSummarySpan.innerHTML = `<strong>${formatAccounting(dailyRealizedPL)}</strong>`; }

    } catch (error) {
        console.error("Failed to render daily report:", error);
        if (summaryBody) summaryBody.innerHTML = '<tr><td colspan="11">Error loading position data.</td></tr>';
    }
}

export function renderSnapshotsPage() {
    // Populate exchange dropdown for the form
    const exchangeSelect = document.getElementById('snapshot-exchange');
    if (exchangeSelect) {
        const currentVal = exchangeSelect.value;
        exchangeSelect.innerHTML = '<option value="" disabled selected>Select Exchange</option>';
        state.allExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            exchangeSelect.appendChild(option);
        });
        exchangeSelect.value = currentVal;
    }

    // Populate the snapshots table
    const tableBody = document.querySelector('#snapshots-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        if (state.allSnapshots.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No snapshots have been logged yet for this account holder.</td></tr>';
            return;
        }
        // Sort by date descending, then by exchange
        const sortedSnapshots = [...state.allSnapshots].sort((a, b) => {
            if (a.snapshot_date > b.snapshot_date) return -1;
            if (a.snapshot_date < b.snapshot_date) return 1;
            return a.exchange.localeCompare(b.exchange);
        });

        sortedSnapshots.forEach(snap => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${snap.snapshot_date}</td>
                <td>${snap.exchange}</td>
                <td class="numeric">${formatAccounting(snap.value)}</td>
                <td class="actions-cell">
                    <button class="delete-snapshot-btn delete-btn" data-id="${snap.id}">Delete</button>
                </td>
            `;
        });
    }
}

export function populatePricesFromCache(activityMap, priceCache) {
    const totalValueSummarySpan = document.querySelector('#total-value-summary span');
    let totalPortfolioValue = 0;
    let totalUnrealizedPL = 0;

    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`[data-key="${key}"]`);
        if (!row) return;

        const priceToUse = priceCache.get(lot.ticker);
        const priceCell = row.querySelector('.current-price');
        const plDollarCell = row.querySelector('.unrealized-pl-dollar');
        const plPercentCell = row.querySelector('.unrealized-pl-percent');

        if (priceToUse === 'invalid') {
            if (priceCell) priceCell.innerHTML = `<span class="negative">Invalid</span>`;
            if (plDollarCell) plDollarCell.innerHTML = '--';
            if (plPercentCell) plPercentCell.innerHTML = '--';
        } else if (priceToUse !== undefined && priceToUse !== null) {
            const currentValue = lot.quantity_remaining * priceToUse;
            const costOfRemaining = lot.quantity_remaining * lot.cost_basis;
            const unrealizedPL = currentValue - costOfRemaining;
            const unrealizedPercent = (costOfRemaining !== 0) ? (unrealizedPL / costOfRemaining) * 100 : 0;
            
            totalPortfolioValue += currentValue;
            totalUnrealizedPL += unrealizedPL;
            
            if (priceCell) priceCell.innerHTML = formatAccounting(priceToUse);

            if (plDollarCell) {
                plDollarCell.innerHTML = formatAccounting(unrealizedPL);
                plDollarCell.className = `numeric unrealized-pl-dollar ${unrealizedPL >= 0 ? 'positive' : 'negative'}`;
            }
            if (plPercentCell) {
                plPercentCell.innerHTML = `${unrealizedPercent.toFixed(2)}%`;
                plPercentCell.className = `numeric unrealized-pl-percent ${unrealizedPercent >= 0 ? 'positive' : 'negative'}`;
            }
        } else {
            if (priceCell) priceCell.innerHTML = '--';
            if (plDollarCell) plDollarCell.innerHTML = '--';
            if (plPercentCell) plPercentCell.innerHTML = '--';
        }
    });

    if (totalValueSummarySpan) { totalValueSummarySpan.innerHTML = `<strong>${formatAccounting(totalPortfolioValue)}</strong>`; }

    const totalPlCell = document.getElementById('unrealized-pl-total');
    if (totalPlCell) {
        totalPlCell.innerHTML = `<strong>${formatAccounting(totalUnrealizedPL)}</strong>`;
        totalPlCell.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    }
}

