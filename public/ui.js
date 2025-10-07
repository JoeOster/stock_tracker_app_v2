// ui.js - v2.3
function formatQuantity(number) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    const options = { maximumFractionDigits: 5 };
    if (number % 1 === 0) { options.maximumFractionDigits = 0; }
    return number.toLocaleString('en-US', options);
}

function formatAccounting(number, isCurrency = true) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    if (Math.abs(number) < 0.001 && isCurrency) { return isCurrency ? '$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-' : '-'; }
    if (Math.abs(number) < 0.001 && !isCurrency) { return '-'; }
    const isNegative = number < 0;
    const absoluteValue = Math.abs(number);
    let options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    if (!isCurrency) { options.maximumFractionDigits = 5; }
    let formattedNumber = absoluteValue.toLocaleString('en-US', options);
    if (isCurrency) { formattedNumber = '$' + formattedNumber; }
    return isNegative ? `(${formattedNumber})` : formattedNumber;
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    if(container) container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, duration);
}

function getCurrentESTDateString() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }

function getTradingDays(c) {
    let d = [];
    let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z');
    while (d.length < c) {
        const dow = cd.getUTCDay();
        if (dow > 0 && dow < 6) { d.push(cd.toISOString().split('T')[0]); }
        cd.setUTCDate(cd.getUTCDate() - 1);
    }
    return d.reverse();
}

function getActivePersistentDates() {
    let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeDates = persistentDates.filter(d => d.added > twentyFourHoursAgo);
    if (activeDates.length < persistentDates.length) { localStorage.setItem('persistentDates', JSON.stringify(activeDates)); }
    return activeDates.map(d => d.date);
}

function renderTabs(currentView) {
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
}

async function renderDailyReport(date, activityMap, settings) {
    const tableTitle = document.getElementById('table-title');
    const performanceSummary = document.getElementById('daily-performance-summary');
    const logBody = document.getElementById('log-body');
    const summaryBody = document.getElementById('positions-summary-body');
    let dailyRealizedPL = 0;

    if (tableTitle) { tableTitle.textContent = `Activity Report for ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`; }
    if(performanceSummary) { performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>$0.00</span></h3><h3 id="total-value-summary">Total Open Value: <span>$0.00</span></h3>`; }

    try {
        const perfResponse = await fetch(`/api/daily_performance/${date}`);
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
        const response = await fetch(`/api/positions/${date}`);
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
                summaryBody.innerHTML = '<tr><td colspan="9">No open positions at the end of this day.</td></tr>';
            } else {
                data.endOfDayPositions.forEach(p => {
                    const key = `lot-${p.id}`;
                    activityMap.set(key, { ...p });
                    const row = summaryBody.insertRow();
                    row.dataset.key = key;
                    row.innerHTML = `<td>${p.ticker}</td><td>${p.exchange}</td><td>${p.purchase_date}</td><td class="numeric">${formatAccounting(p.cost_basis)}</td><td class="numeric">${formatQuantity(p.original_quantity)}</td><td class="numeric">${formatQuantity(p.quantity_remaining)}</td><td class="numeric current-price"><div class="loader"></div></td><td class="numeric unrealized-pl">--</td><td><button class="sell-from-lot-btn" data-buy-id="${p.id}" data-ticker="${p.ticker}" data-exchange="${p.exchange}" data-quantity="${p.quantity_remaining}">Sell</button></td>`;
                });
            }
        }
        
        const realizedGainsSummarySpan = document.querySelector('#realized-gains-summary span');
        if (realizedGainsSummarySpan) { realizedGainsSummarySpan.innerHTML = `<strong>${formatAccounting(dailyRealizedPL)}</strong>`; }

    } catch (error) {
        console.error("Failed to render daily report:", error);
        if (logBody) logBody.innerHTML = '<tr><td colspan="10">Error loading transaction data.</td></tr>';
        if (summaryBody) summaryBody.innerHTML = '<tr><td colspan="9">Error loading position data.</td></tr>';
    }
}

function populatePricesFromCache(activityMap, priceCache) {
    const totalValueSummarySpan = document.querySelector('#total-value-summary span');
    let totalPortfolioValue = 0;
    let totalUnrealizedPL = 0;

    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`[data-key="${key}"]`);
        if (!row) return;

        const priceToUse = priceCache.get(lot.ticker);
        const priceCell = row.querySelector('.current-price');
        const plCell = row.querySelector('.unrealized-pl');

        if (priceToUse !== undefined && priceToUse !== null) {
            const currentValue = lot.quantity_remaining * priceToUse;
            const costOfRemaining = lot.quantity_remaining * lot.cost_basis;
            const unrealizedPL = currentValue - costOfRemaining;
            totalPortfolioValue += currentValue;
            totalUnrealizedPL += unrealizedPL;
            
            if (priceCell) priceCell.innerHTML = formatAccounting(priceToUse);
            if (plCell) {
                plCell.innerHTML = formatAccounting(unrealizedPL);
                plCell.className = `numeric unrealized-pl ${unrealizedPL >= 0 ? 'positive' : 'negative'}`;
            }
        } else {
            if (priceCell) priceCell.innerHTML = '--';
            if (plCell) plCell.innerHTML = '--';
        }
    });

    if (totalValueSummarySpan) { totalValueSummarySpan.innerHTML = `<strong>${formatAccounting(totalPortfolioValue)}</strong>`; }

    const totalPlCell = document.getElementById('unrealized-pl-total');
    if (totalPlCell) {
        totalPlCell.innerHTML = `<strong>${formatAccounting(totalUnrealizedPL)}</strong>`;
        totalPlCell.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    }
}

async function renderLedger(allTransactions, ledgerSort) { /* ... full implementation ... */ }

async function renderChartsPage(state) {
    const plSummaryTable = document.getElementById('pl-summary-table');
    const allTimeChartCtx = document.getElementById('all-time-chart')?.getContext('2d');
    if (!plSummaryTable || !allTimeChartCtx) return;

    try {
        const plResponse = await fetch('/api/realized_pl/summary');
        if(plResponse.ok) {
            const plData = await plResponse.json();
            const plBody = plData.byExchange.map(row => `<tr><td>${row.exchange}</td><td class="numeric">${formatAccounting(row.total_pl)}</td></tr>`).join('');
            plSummaryTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P/L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
        }
    } catch (error) { console.error("Failed to render P/L Summary:", error); }
    
    try {
        const snapshotResponse = await fetch('/api/snapshots');
        if(snapshotResponse.ok) state.allSnapshots = await snapshotResponse.json();
    } catch (error) { console.error("Failed to fetch snapshots", error); state.allSnapshots = []; }
    
    const fiveDayChartCtx = document.getElementById('five-day-chart')?.getContext('2d');
    const dateRangeChartCtx = document.getElementById('date-range-chart')?.getContext('2d');
    const chartStartDate = document.getElementById('chart-start-date');
    const chartEndDate = document.getElementById('chart-end-date');

    state.allTimeChart = renderAllTimeChart(allTimeChartCtx, state.allTimeChart, state.allSnapshots, state);
    state.fiveDayChart = renderFiveDayChart(fiveDayChartCtx, state.fiveDayChart, state.allSnapshots, state);
    state.dateRangeChart = renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, state.dateRangeChart, state.allSnapshots, state);
    
    await renderPortfolioOverview(state.priceCache);
}

function renderAllTimeChart(ctx, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    return createChart(ctx, snapshots, state);
}

function renderFiveDayChart(ctx, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    const fiveTradingDays = getTradingDays(5);
    if(fiveTradingDays.length === 0) return createChart(ctx, [], state);
    const startDate = fiveTradingDays[0];
    const endDate = getCurrentESTDateString();
    const filteredSnapshots = snapshots.filter(s => s.snapshot_date >= startDate && s.snapshot_date <= endDate);
    return createChart(ctx, filteredSnapshots, state);
}

function renderDateRangeChart(ctx, startDateEl, endDateEl, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    const start = startDateEl.value, end = endDateEl.value;
    let filteredSnapshots = snapshots;
    if (start && end) { filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end); }
    return createChart(ctx, filteredSnapshots, state);
}

function createChart(ctx, snapshots, state) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
    
    if (labels.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("At least two snapshots are needed to draw a chart.", ctx.canvas.width / 2, 50);
        return null;
    }
    
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e', '#1abc9c'];
    let colorIndex = 0;

    snapshots.forEach(s => {
        if (!datasets[s.exchange]) {
            datasets[s.exchange] = { 
                label: s.exchange, data: [], fill: false, 
                borderColor: colors[colorIndex++ % colors.length], tension: 0.1 
            };
        }
    });

    for (const ex in datasets) {
        datasets[ex].data = labels.map(l => snapshots.find(s => s.snapshot_date === l && s.exchange === ex)?.value ?? null);
    }

    return new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: Object.values(datasets) },
        options: {
            spanGaps: true, responsive: true, maintainAspectRatio: false,
            scales: { y: { ticks: { callback: function(value) { return '$' + value.toLocaleString(); } } } },
            onClick: (e, elements, chart) => { /* ... zoom implementation ... */ }
        }
    });
}

async function renderPortfolioOverview(priceCache) {
    const overviewBody = document.getElementById('portfolio-overview-body');
    if (!overviewBody) return;
    overviewBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    try {
        const overviewResponse = await fetch('/api/portfolio/overview');
        if (!overviewResponse.ok) throw new Error('Failed to load portfolio overview data');
        const data = await overviewResponse.json();
        if (data.length === 0) {
            overviewBody.innerHTML = '<tr><td colspan="6">No open positions to display.</td></tr>';
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
            let priceToUse = priceCache.get(pos.ticker);
            let priceHTML = priceToUse ? formatAccounting(priceToUse) : '--';
            const totalValue = pos.total_quantity * priceToUse;
            const totalCost = pos.total_quantity * pos.weighted_avg_cost;
            const unrealizedPL = (priceToUse) ? totalValue - totalCost : null;
            if(unrealizedPL) totalUnrealizedPL += unrealizedPL;
            
            overviewBody.insertRow().innerHTML = `
                <td>${pos.ticker}</td><td class="numeric">${formatQuantity(pos.total_quantity)}</td>
                <td class="numeric">${formatAccounting(pos.weighted_avg_cost)}</td><td class="numeric current-price">${priceHTML}</td>
                <td class="numeric">${formatAccounting(totalValue)}</td><td class="numeric">${formatAccounting(unrealizedPL)}</td>`;
        }
        // Add a total row
        const totalRow = overviewBody.insertRow();
        totalRow.style.fontWeight = 'bold';
        totalRow.innerHTML = `<td colspan="5" style="text-align: right;">Total Unrealized P/L</td><td class="numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(totalUnrealizedPL)}</td>`;
    } catch (error) {
        console.error("Failed to render portfolio overview:", error);
        overviewBody.innerHTML = '<tr><td colspan="6">Error loading portfolio overview.</td></tr>';
    }
}