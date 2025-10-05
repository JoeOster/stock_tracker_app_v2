// public/ui.js

function formatAccounting(number, isCurrency = true) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    if (Math.abs(number) < 0.001) { return isCurrency ? '$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-' : '-'; }
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
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, duration);
}

// Add these to ui.js

    function getCurrentESTDateString() {
        const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
        const p = f.formatToParts(new Date());
        return `${p.find(x=>x.type==='year').value}-${p.find(x=>x.type==='month').value}-${p.find(x=>x.type==='day').value}`;
    }

    function getTradingDays(c) {
        let d = [];
        let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z');
        while (d.length < c) {
            const dow = cd.getUTCDay();
            if (dow > 0 && dow < 6) {
                d.push(cd.toISOString().split('T')[0]);
            }
            cd.setUTCDate(cd.getUTCDate() - 1);
        }
        return d.reverse();
    }

function handleApiLimitReached() {
    const refreshPricesBtn = document.getElementById('refresh-prices-btn');
    const apiTimerEl = document.getElementById('api-timer');
    refreshPricesBtn.disabled = true;
    refreshPricesBtn.textContent = 'API Limit Reached';
    apiTimerEl.textContent = "API Limit";
}

function renderTabs(currentView) {
    const tabsContainer = document.getElementById('tabs-container');
    tabsContainer.innerHTML = '';
    const tradingDays = getTradingDays(6);
    tradingDays.forEach(day => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        if (day === currentView.value && currentView.type === 'date') tab.classList.add('active');
        tab.addEventListener('click', () => handleTabClick('date', day));
        tabsContainer.appendChild(tab);
    });
    const chartsTab = document.createElement('div');
    chartsTab.className = 'tab master-tab';
    chartsTab.textContent = 'Charts';
    if (currentView.type === 'charts') chartsTab.classList.add('active');
    chartsTab.addEventListener('click', () => handleTabClick('charts', null));
    tabsContainer.appendChild(chartsTab);
    const ledgerTab = document.createElement('div');
    ledgerTab.className = 'tab master-tab';
    ledgerTab.textContent = 'Ledger';
    if (currentView.type === 'ledger') ledgerTab.classList.add('active');
    ledgerTab.addEventListener('click', () => handleTabClick('ledger', null));
    tabsContainer.appendChild(ledgerTab);
}

async function renderDailyReport(date, activityMap, priceCache, settings) { 
    const tableTitle = document.getElementById('table-title');
    const logBody = document.getElementById('log-body');
    const summaryBody = document.getElementById('positions-summary-body');
    const response = await fetch(`/api/positions/${date}`); 
    const data = await response.json();
    tableTitle.textContent = `Activity Report for ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`; 
    logBody.innerHTML = ''; 
    summaryBody.innerHTML = ''; 
    if (data.dailyTransactions.length === 0) { 
        logBody.innerHTML = '<tr><td colspan="10">No transactions logged for this day.</td></tr>'; 
    } else { 
        data.dailyTransactions.forEach(tx => { 
            const realizedPL = tx.transaction_type === 'SELL' ? tx.realizedPL : 0; 
            let suggestProfit = null, suggestLoss = null;
            if (tx.transaction_type === 'BUY' && settings.takeProfitPercent > 0 && settings.stopLossPercent > 0) {
                suggestProfit = tx.price * (1 + settings.takeProfitPercent / 100);
                suggestLoss = tx.price * (1 - settings.stopLossPercent / 100);
            }
            const row = logBody.insertRow(); 
            row.innerHTML = `<td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td class="numeric">${formatAccounting(tx.quantity, false)}</td><td class="numeric">${formatAccounting(tx.price)}</td><td class="numeric">${formatAccounting(realizedPL)}</td><td class="numeric">${formatAccounting(suggestProfit)}</td><td class="numeric">${formatAccounting(suggestLoss)}</td><td class="numeric">${formatAccounting(tx.limit_price_up)}</td><td class="numeric">${formatAccounting(tx.limit_price_down)}</td>`; 
        }); 
    } 
    if (data.endOfDayPositions.length === 0) { 
        summaryBody.innerHTML = '<tr><td colspan="7">No open positions at the end of this day.</td></tr>'; 
    } else { 
        activityMap.clear(); 
        const sortedPositions = data.endOfDayPositions.sort((a,b) => a.ticker.localeCompare(b.ticker) || a.exchange.localeCompare(b.exchange));
        const today = new Date(getCurrentESTDateString() + 'T00:00:00Z');
        sortedPositions.forEach(p => { 
            const key = `${p.ticker}-${p.exchange}`; 
            activityMap.set(key, { ...p, costBasis: p.weighted_avg_cost, closingQty: p.net_quantity }); 
            let priceHTML = '<div class="loader"></div>';
            if (p.last_price) {
                priceHTML = formatAccounting(p.last_price);
                const lastUpdatedDate = new Date(p.last_updated);
                if (lastUpdatedDate < today) {
                    const dateString = lastUpdatedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit'});
                    priceHTML += ` <small class="stale-data">(as of ${dateString})</small>`;
                }
            }
            const row = summaryBody.insertRow(); 
            row.dataset.key = key; 
            row.innerHTML = `<td>${p.ticker}</td><td>${p.exchange}</td><td class="numeric">${formatAccounting(p.net_quantity, false)}</td><td class="numeric">${formatAccounting(p.weighted_avg_cost)}</td><td class="numeric current-price">${priceHTML}</td><td class="numeric current-value">--</td><td class="numeric unrealized-pl">--</td>`;
        }); 
    } 
    populatePricesFromCache(activityMap, priceCache); 
}

async function renderLedger() {
    const ledgerTableBody = document.querySelector('#ledger-table tbody');
    const ledgerFilterTicker = document.getElementById('ledger-filter-ticker');
    const ledgerFilterStart = document.getElementById('ledger-filter-start');
    const ledgerFilterEnd = document.getElementById('ledger-filter-end');

    if (allTransactions.length === 0) {
        const response = await fetch('/api/transactions');
        allTransactions = await response.json();
    }
    const filterTicker = ledgerFilterTicker.value.toUpperCase().trim();
    const filterStart = ledgerFilterStart.value;
    const filterEnd = ledgerFilterEnd.value;
    const filteredTransactions = allTransactions.filter(tx => {
        const tickerMatch = filterTicker ? tx.ticker.toUpperCase().includes(filterTicker) : true;
        const startDateMatch = filterStart ? tx.transaction_date >= filterStart : true;
        const endDateMatch = filterEnd ? tx.transaction_date <= filterEnd : true;
        return tickerMatch && startDateMatch && endDateMatch;
    });
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
    ledgerTableBody.innerHTML = '';
    if (filteredTransactions.length === 0) {
        ledgerTableBody.innerHTML = '<tr><td colspan="7">No transactions match the current filters.</td></tr>';
        return;
    }
    filteredTransactions.forEach(tx => {
        const row = ledgerTableBody.insertRow();
        row.innerHTML = `<td>${tx.transaction_date}</td><td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td class="numeric">${formatAccounting(tx.quantity, false)}</td><td class="numeric">${formatAccounting(tx.price)}</td><td class="actions-cell"><button class="modify-btn" data-id="${tx.id}">Edit</button><button class="delete-btn" data-id="${tx.id}">Delete</button></td>`;
    });
}

async function renderChartsPage() {
    const plSummaryTable = document.getElementById('pl-summary-table');
    const allTimeChartCtx = document.getElementById('all-time-chart').getContext('2d');
    const fiveDayChartCtx = document.getElementById('five-day-chart').getContext('2d');
    const dateRangeChartCtx = document.getElementById('date-range-chart').getContext('2d');
    const chartStartDate = document.getElementById('chart-start-date');
    const chartEndDate = document.getElementById('chart-end-date');
    const plResponse = await fetch('/api/realized_pl');
    const plData = await plResponse.json();
    const plBody = Object.entries(plData.byExchange).map(([exchange, pl]) => `<tr><td>${exchange}</td><td class="numeric">${formatAccounting(pl)}</td></tr>`).join('');
    plSummaryTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P/L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
    const snapshotResponse = await fetch('/api/snapshots');
    allSnapshots = await snapshotResponse.json();
    renderAllTimeChart(allTimeChartCtx, allSnapshots);
    renderFiveDayChart(fiveDayChartCtx, allSnapshots);
    renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, allSnapshots);
    renderSnapshotHistory(allSnapshots);
    await renderPortfolioOverview();
}

function renderSnapshotHistory(snapshots) { 
    const snapshotHistoryTableBody = document.querySelector('#snapshot-history-table tbody');
    snapshotHistoryTableBody.innerHTML = ''; 
    [...snapshots].reverse().forEach(s => { 
        const row = snapshotHistoryTableBody.insertRow(); 
        row.innerHTML = `<td>${s.snapshot_date}</td><td>${s.exchange}</td><td class="numeric">${formatAccounting(s.value)}</td><td class="actions-cell"><button class="delete-btn" data-id="${s.id}" data-type="snapshot">Delete</button></td>`; 
    }); 
}

function renderAllTimeChart(ctx, snapshots) {
    if(allTimeChart) allTimeChart.destroy();
    allTimeChart = createChart(ctx, snapshots);
}

function renderFiveDayChart(ctx, snapshots) {
    const fiveTradingDays = getTradingDays(5);
    const startDate = fiveTradingDays[0];
    const endDate = getCurrentESTDateString();
    const filteredSnapshots = snapshots.filter(s => s.snapshot_date >= startDate && s.snapshot_date <= endDate);
    if(fiveDayChart) fiveDayChart.destroy();
    fiveDayChart = createChart(ctx, filteredSnapshots);
}

function renderDateRangeChart(ctx, startDateEl, endDateEl, snapshots) {
    const start = startDateEl.value, end = endDateEl.value;
    let filteredSnapshots = snapshots;
    if (start && end) { filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end); }
    if(dateRangeChart) dateRangeChart.destroy();
    dateRangeChart = createChart(ctx, filteredSnapshots);
}

function createChart(ctx, snapshots) {
    const chartZoomModal = document.getElementById('chart-zoom-modal');
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6'];
    let colorIndex = 0;
    snapshots.forEach(s => {
        if (!datasets[s.exchange]) {
            datasets[s.exchange] = { label: s.exchange, data: [], fill: false, borderColor: colors[colorIndex++ % colors.length], tension: 0.1 };
        }
    });
    for (const ex in datasets) {
        datasets[ex].data = labels.map(l => snapshots.find(s => s.snapshot_date === l && s.exchange === ex)?.value ?? null);
    }
    
    const newChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: Object.values(datasets) },
        options: {
            spanGaps: true, responsive: true, maintainAspectRatio: true,
            scales: { y: { ticks: { callback: function(value) { return '$' + value.toLocaleString(); } } } },
            onClick: (e, elements, chart) => {
                const zoomedChartCtx = document.getElementById('zoomed-chart').getContext('2d');
                if(zoomedChart) zoomedChart.destroy();
                zoomedChart = new Chart(zoomedChartCtx, chart.config);
                chartZoomModal.classList.add('visible');
            }
        }
    });
    return newChart;
}

async function renderPortfolioOverview() {
    const overviewBody = document.getElementById('portfolio-overview-body');
    overviewBody.innerHTML = '';
    try {
        const response = await fetch('/api/portfolio/overview');
        const data = await response.json();
        if (data.length === 0) {
            overviewBody.innerHTML = '<tr><td colspan="6">No open positions to display.</td></tr>';
            return;
        }
        for (const pos of data) {
            const priceToUse = priceCache.get(pos.ticker) || pos.last_price;
            const totalValue = pos.total_quantity * priceToUse;
            const totalCost = pos.total_quantity * pos.weighted_avg_cost;
            const unrealizedPL = totalValue - totalCost;
            const row = overviewBody.insertRow();
            row.innerHTML = `<td>${pos.ticker}</td><td class="numeric">${formatAccounting(pos.total_quantity, false)}</td><td class="numeric">${formatAccounting(pos.weighted_avg_cost)}</td><td class="numeric">${formatAccounting(priceToUse)}</td><td class="numeric">${formatAccounting(totalValue)}</td><td class="numeric">${formatAccounting(unrealizedPL)}</td>`;
        }
    } catch (error) {
        console.error("Failed to render portfolio overview:", error);
        overviewBody.innerHTML = '<tr><td colspan="6">Error loading portfolio overview.</td></tr>';
    }
}