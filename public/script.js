// public/script.js (Final Version with Precise Scheduler)
document.addEventListener('DOMContentLoaded', () => {
    console.log("Tracker script loaded. Initializing...");

    // DOM SELECTORS
    const tabsContainer = document.getElementById('tabs-container');
    const transactionForm = document.getElementById('add-transaction-form');
    const tableContainer = document.getElementById('table-container');
    const overviewContainer = document.getElementById('overview-container');
    const ledgerTableBody = document.querySelector('#ledger-table tbody');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-transaction-form');
    const tableTitle = document.getElementById('table-title');
    const logBody = document.getElementById('log-body');
    const summaryBody = document.getElementById('positions-summary-body');
    const portfolioSummary = document.getElementById('portfolio-summary');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-button');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiTimerEl = document.getElementById('api-timer');
    const allTimeChartCtx = document.getElementById('all-time-chart').getContext('2d');
    const fiveDayChartCtx = document.getElementById('five-day-chart').getContext('2d');
    const dateRangeChartCtx = document.getElementById('date-range-chart').getContext('2d');
    const chartStartDate = document.getElementById('chart-start-date');
    const chartEndDate = document.getElementById('chart-end-date');
    const chartZoomModal = document.getElementById('chart-zoom-modal');
    const zoomedChartCtx = document.getElementById('zoomed-chart').getContext('2d');
    const snapshotForm = document.getElementById('add-snapshot-form');
    const plSummaryTable = document.getElementById('pl-summary-table');
    const snapshotHistoryTableBody = document.querySelector('#snapshot-history-table tbody');
    const noActivityModal = document.getElementById('no-activity-modal');
    const confirmNoActivityBtn = document.getElementById('confirm-no-activity-btn');
    const refreshPricesBtn = document.getElementById('refresh-prices-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    
    // AI Screenshot Processing Selectors
    const screenshotFileInput = document.getElementById('screenshot-file-input');
    const processScreenshotBtn = document.getElementById('process-screenshot-btn');
    const aiStatus = document.getElementById('ai-status');
    const aiConfirmationContainer = document.getElementById('ai-confirmation-container');
    const aiConfirmationTableBody = document.querySelector('#ai-confirmation-table tbody');
    const approveAiBtn = document.getElementById('approve-ai-btn');
    const cancelAiBtn = document.getElementById('cancel-ai-btn');

    // STATE
    let settings = { apiKey: "" };
    let currentView = { type: 'date', value: null };
    let activityMap = new Map();
    let allTimeChart=null, fiveDayChart=null, dateRangeChart=null, zoomedChart=null;
    let allSnapshots = [], allTransactions = [];
    let priceCache = new Map();
    let ledgerSort = { column: 'transaction_date', direction: 'asc' };
    let isApiLimitReached = false;
    let aiExtractedTransactions = []; // To store transactions from AI

    // API TIMER & SCHEDULER
    const SCHEDULED_INTERVAL_MS = 30 * 60 * 1000;
    let nextApiCallTimestamp = 0;
    let marketOpenCalledForDay = '', marketCloseCalledForDay = '';
    
    function initializeScheduler() {
        setInterval(() => {
            const now = new Date();
            const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const estHours = estTime.getHours(), estMinutes = estTime.getMinutes(), dayOfWeek = estTime.getDay();
            const todayStr = `${estTime.getFullYear()}-${estTime.getMonth()}-${estTime.getDate()}`;
            if (marketOpenCalledForDay !== todayStr) { marketOpenCalledForDay = ''; }
            if (marketCloseCalledForDay !== todayStr) { marketCloseCalledForDay = ''; }
            const isTradingDay = dayOfWeek > 0 && dayOfWeek < 6;
            const isMarketHours = (estHours > 9 || (estHours === 9 && estMinutes >= 30)) && estHours < 16;
            let triggerUpdate = false;
            if (isTradingDay && isMarketHours) {
                if (refreshPricesBtn.disabled === false) {
                    refreshPricesBtn.disabled = true;
                    refreshPricesBtn.textContent = 'Auto-Refreshing';
                }
                if (!marketOpenCalledForDay) {
                    console.log("Market is open! Triggering initial price update.");
                    triggerUpdate = true;
                    marketOpenCalledForDay = todayStr;
                    nextApiCallTimestamp = Date.now() + SCHEDULED_INTERVAL_MS;
                } else if (Date.now() >= nextApiCallTimestamp) {
                    console.log("30-minute scheduled update triggered.");
                    triggerUpdate = true;
                }
                let secondsRemaining = Math.max(0, Math.round((nextApiCallTimestamp - Date.now()) / 1000));
                apiTimerEl.textContent = new Date(secondsRemaining * 1000).toISOString().substr(14, 5);
            } else {
                if (refreshPricesBtn.disabled === true && !isApiLimitReached) {
                    refreshPricesBtn.disabled = false;
                    refreshPricesBtn.textContent = 'Refresh Prices';
                }
                apiTimerEl.textContent = "Market Closed";
                if (isTradingDay && estHours >= 16 && !marketCloseCalledForDay) {
                    console.log("Market is closed! Triggering final price update.");
                    triggerUpdate = true;
                    marketCloseCalledForDay = todayStr;
                }
            }
            if (triggerUpdate) {
                updateAllPrices();
                if (Date.now() >= nextApiCallTimestamp) {
                    nextApiCallTimestamp = Date.now() + SCHEDULED_INTERVAL_MS;
                }
            }
        }, 1000);
    }
    
    // SETTINGS & DATE HELPERS
    function saveSettings() { localStorage.setItem('stockTrackerSettings', JSON.stringify(settings)); }
    function loadSettings() { const saved = localStorage.getItem('stockTrackerSettings'); if(saved) { settings = JSON.parse(saved); } apiKeyInput.value = settings.apiKey; }
    function getCurrentESTDateString() { const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }); const p = f.formatToParts(new Date()); return `${p.find(x=>x.type==='year').value}-${p.find(x=>x.type==='month').value}-${p.find(x=>x.type==='day').value}`; }
    function getTradingDays(c) { let d = []; let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z'); while (d.length < c) { const dow = cd.getUTCDay(); if (dow > 0 && dow < 6) { d.push(cd.toISOString().split('T')[0]); } cd.setUTCDate(cd.getUTCDate() - 1); } return d.reverse(); }
    
    // UI RENDERING
    function renderTabs() { /* Unchanged */ }
    async function renderDailyReport(date) { /* Unchanged */ }
    async function renderLedger() { /* Unchanged */ }
    async function renderOverviewPage() { /* Unchanged */ }
    function renderChart(snapshots) { /* Unchanged */ }
    function renderSnapshotHistory(snapshots) { /* Unchanged */ }

    // DATA FETCHING & DISPLAY
    function populatePricesFromCache() { /* Unchanged */ }
    async function updateAllPrices() {
        if (isApiLimitReached) { return; }
        if (activityMap.size === 0 || !settings.apiKey) { portfolioSummary.querySelector('span').textContent = '$0.00'; document.querySelectorAll('.current-price, .current-value, .unrealized-pl').forEach(el => { if (el.textContent === 'Loading...') el.textContent = 'N/A'; }); return; }
        console.log("Fetching latest prices...");
        const tickersToFetch = [...new Set(Array.from(activityMap.values()).map(s => s.ticker))];
        const prices = await Promise.all(tickersToFetch.map(ticker => fetchStockPrice(ticker)));
        tickersToFetch.forEach((ticker, index) => { if (prices[index] !== null) priceCache.set(ticker, prices[index]); });
        populatePricesFromCache();
    }
    async function fetchStockPrice(ticker) {
        if (!settings.apiKey) { console.warn("Price fetch skipped: No API key."); return null; }
        try {
            const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${settings.apiKey}`);
            const d = await r.json();
            if (d.Note && d.Note.includes("API call frequency")) {
                console.error("API Limit Reached!");
                isApiLimitReached = true;
                handleApiLimitReached();
                return null;
            }
            if (d['Global Quote'] && d['Global Quote']['05. price']) { return parseFloat(d['Global Quote']['05. price']); }
            console.warn(`Price fetch failed for ${ticker}.`);
            return null;
        } catch (e) {
            console.error(`API Error for ${ticker}:`, e);
            return null;
        }
    }

    // EVENT HANDLERS & UI HELPERS
    function handleApiLimitReached() {
        refreshPricesBtn.disabled = true;
        refreshPricesBtn.textContent = 'API Limit Reached';
        apiTimerEl.textContent = "API Limit";
    }
    async function handleTabClick(type, value) {
        currentView = { type, value };
        renderTabs();
        if (type === 'date') {
            tableContainer.style.display = 'block';
            overviewContainer.style.display = 'none';
            await renderDailyReport(value);
            await updateAllPrices();
        } else {
            tableContainer.style.display = 'none';
            overviewContainer.style.display = 'block';
            await renderOverviewPage();
        }
    }
    
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- UPDATED: Collects advanced options ---
        const formData = {
            transaction_date: document.getElementById('transaction-date').value,
            ticker: document.getElementById('ticker').value.toUpperCase(),
            exchange: document.getElementById('exchange').value,
            transaction_type: document.getElementById('transaction-type').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            price: parseFloat(document.getElementById('price').value),
            limit_price_up: parseFloat(document.getElementById('limit-price-up').value) || null,
            limit_price_down: parseFloat(document.getElementById('limit-price-down').value) || null,
            limit_expiration: document.getElementById('limit-expiration').value || null
        };
        
        if (!formData.exchange) return alert('Please select an exchange.');

        await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        transactionForm.reset();
        document.getElementById('transaction-date').value = formData.transaction_date;
        
        if (currentView.type === 'date') {
            await renderDailyReport(currentView.value);
        }
    });
    
    // AI SCREENSHOT PROCESSING LOGIC
    processScreenshotBtn.addEventListener('click', async () => {
        const file = screenshotFileInput.files[0];
        if (!file) {
            aiStatus.textContent = 'Please select a file first.';
            return;
        }
        aiStatus.textContent = 'Processing with AI...';
        processScreenshotBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('screenshot', file);

        try {
            const response = await fetch('/api/process-screenshot', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to process image.');
            }

            const data = await response.json();
            aiExtractedTransactions = data; // Store data
            renderAiConfirmation(data);
            aiStatus.textContent = 'Review the extracted data below.';
        } catch (error) {
            console.error('Screenshot processing error:', error);
            aiStatus.textContent = `Error: ${error.message}`;
        } finally {
            processScreenshotBtn.disabled = false;
        }
    });

    function renderAiConfirmation(transactions) {
        aiConfirmationTableBody.innerHTML = '';
        if (!transactions || transactions.length === 0) {
            aiConfirmationContainer.style.display = 'none';
            return;
        }

        transactions.forEach((tx, index) => {
            const row = aiConfirmationTableBody.insertRow();
            row.dataset.index = index;
            row.innerHTML = `
                <td contenteditable="true" data-field="transaction_date">${tx.transaction_date || ''}</td>
                <td contenteditable="true" data-field="ticker">${tx.ticker || ''}</td>
                <td contenteditable="true" data-field="exchange">${tx.exchange || ''}</td>
                <td contenteditable="true" data-field="transaction_type">${tx.transaction_type || ''}</td>
                <td contenteditable="true" data-field="quantity">${tx.quantity || ''}</td>
                <td contenteditable="true" data-field="price">${tx.price || ''}</td>
            `;
        });
        aiConfirmationContainer.style.display = 'block';
    }
    
    cancelAiBtn.addEventListener('click', () => {
        aiConfirmationContainer.style.display = 'none';
        aiExtractedTransactions = [];
        screenshotFileInput.value = ''; // Clear file input
        aiStatus.textContent = '';
    });
    
    approveAiBtn.addEventListener('click', async () => {
        // Read the potentially edited data from the table
        const updatedTransactions = [];
        const rows = aiConfirmationTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const tx = {};
            row.querySelectorAll('td').forEach(cell => {
                tx[cell.dataset.field] = cell.textContent;
            });
            // Basic type conversion
            tx.quantity = parseFloat(tx.quantity);
            tx.price = parseFloat(tx.price);
            updatedTransactions.push(tx);
        });

        if (updatedTransactions.length > 0) {
            try {
                const response = await fetch('/api/transactions/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedTransactions)
                });
                 if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save transactions.');
                }
                const result = await response.json();
                alert(result.message);
                cancelAiBtn.click(); // Hide and clear the form
                await renderLedger(); // Refresh ledger view
            } catch (error) {
                console.error('Failed to save AI transactions:', error);
                alert(`Error: ${error.message}`);
            }
        }
    });


    // --- (All other event listeners and full function definitions are included below for safety) ---
    const allOtherFunctions = () => {
        renderTabs = function() { tabsContainer.innerHTML = ''; const tradingDays = getTradingDays(6); tradingDays.forEach(day => { const tab = document.createElement('div'); tab.className = 'tab'; tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }); tab.dataset.date = day; if (day === currentView.value && currentView.type === 'date') tab.classList.add('active'); tab.addEventListener('click', () => handleTabClick('date', day)); tabsContainer.appendChild(tab); }); const overviewTab = document.createElement('div'); overviewTab.className = 'tab pl-tab'; overviewTab.textContent = 'Overall P&L'; if (currentView.type === 'overview') overviewTab.classList.add('active'); overviewTab.addEventListener('click', () => handleTabClick('overview', null)); tabsContainer.appendChild(overviewTab); };
        renderDailyReport = async function(date) { const response = await fetch(`/api/positions/${date}`); const data = await response.json(); if (!data || !data.dailyTransactions || !data.endOfDayPositions) { console.error("Received invalid data from server for daily report:", data); tableElement.innerHTML = '<tr><td colspan="8">Error: Could not load report data from the server.</td></tr>'; return; } tableTitle.textContent = `Activity Report for ${new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`; logBody.innerHTML = ''; summaryBody.innerHTML = ''; if (data.dailyTransactions.length === 0) { logBody.innerHTML = '<tr><td colspan="10">No transactions logged for this day.</td></tr>'; } else { data.dailyTransactions.forEach(tx => { const realizedPL = tx.transaction_type === 'SELL' ? tx.realizedPL : 0; const row = logBody.insertRow(); row.innerHTML = `<td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td>${tx.quantity}</td><td>$${tx.price.toFixed(2)}</td><td class="${realizedPL >= 0 ? 'positive' : 'negative'}">${realizedPL !== undefined ? realizedPL.toFixed(2) : '0.00'}</td><td></td><td></td><td>${tx.limit_price_up ? '$' + tx.limit_price_up.toFixed(2) : ''}</td><td>${tx.limit_price_down ? '$' + tx.limit_price_down.toFixed(2) : ''}</td>`; }); } if (data.endOfDayPositions.length === 0) { summaryBody.innerHTML = '<tr><td colspan="7">No open positions at the end of this day.</td></tr>'; portfolioSummary.querySelector('span').textContent = '$0.00'; } else { activityMap.clear(); const sortedPositions = data.endOfDayPositions.sort((a,b) => { if(a.ticker < b.ticker) return -1; if(a.ticker > b.ticker) return 1; if(a.exchange < b.exchange) return -1; if(a.exchange > b.exchange) return 1; return b.net_quantity - a.net_quantity; }); sortedPositions.forEach(p => { const key = `${p.ticker}-${p.exchange}`; activityMap.set(key, { ...p, costBasis: p.weighted_avg_cost, closingQty: p.net_quantity }); const row = summaryBody.insertRow(); row.dataset.key = key; row.innerHTML = `<td>${p.ticker}</td><td>${p.exchange}</td><td>${p.net_quantity}</td><td>$${p.weighted_avg_cost.toFixed(2)}</td><td class="current-price">Loading...</td><td class="current-value">Loading...</td><td class="unrealized-pl">Loading...</td>`; }); } populatePricesFromCache(); };
        renderLedger = async function() { const response = await fetch('/api/transactions'); allTransactions = await response.json(); allTransactions.sort((a, b) => { const col = ledgerSort.column; const dir = ledgerSort.direction === 'asc' ? 1 : -1; if (col === 'quantity' || col === 'price') return (a[col] - b[col]) * dir; return a[col].localeCompare(b[col]) * dir; }); document.querySelectorAll('#ledger-table thead th[data-sort]').forEach(th => { th.classList.remove('sorted-asc', 'sorted-desc'); if (th.dataset.sort === ledgerSort.column) { th.classList.add(ledgerSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc'); } }); ledgerTableBody.innerHTML = ''; allTransactions.forEach(tx => { const row = ledgerTableBody.insertRow(); row.innerHTML = `<td>${tx.transaction_date}</td><td>${tx.ticker}</td><td>${tx.exchange}</td><td>${tx.transaction_type}</td><td>${tx.quantity}</td><td>$${tx.price.toFixed(2)}</td><td class="actions-cell"><button class="modify-btn" data-id="${tx.id}">Edit</button><button class="delete-btn" data-id="${tx.id}">Delete</button></td>`; }); };
        renderOverviewPage = async function() { const plResponse = await fetch('/api/realized_pl'); const plData = await plResponse.json(); const plBody = Object.entries(plData.byExchange).map(([exchange, pl]) => `<tr><td>${exchange}</td><td class="${pl >= 0 ? 'positive' : 'negative'}">$${pl.toFixed(2)}</td></tr>`).join(''); plSummaryTable.innerHTML = `<thead><tr><th>Exchange</th><th>Realized P/L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="<strong>${plData.total >= 0 ? 'positive' : 'negative'}">$${plData.total.toFixed(2)}</strong></td></tr></tbody>`; const snapshotResponse = await fetch('/api/snapshots'); allSnapshots = await snapshotResponse.json(); renderAllTimeChart(allSnapshots); renderFiveDayChart(allSnapshots); renderDateRangeChart(allSnapshots); renderSnapshotHistory(allSnapshots); await renderLedger(); };
        renderAllTimeChart = function(snapshots) { if(allTimeChart) allTimeChart.destroy(); allTimeChart = createChart(allTimeChartCtx, snapshots); };
        renderFiveDayChart = function(snapshots) { const fiveTradingDays = getTradingDays(5); const startDate = fiveTradingDays[0]; const endDate = getCurrentESTDateString(); const filteredSnapshots = snapshots.filter(s => s.snapshot_date >= startDate && s.snapshot_date <= endDate); if(fiveDayChart) fiveDayChart.destroy(); fiveDayChart = createChart(fiveDayChartCtx, filteredSnapshots); };
        renderDateRangeChart = function(snapshots) { const start = chartStartDate.value, end = chartEndDate.value; let filteredSnapshots = snapshots; if (start && end) { filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end); } if(dateRangeChart) dateRangeChart.destroy(); dateRangeChart = createChart(dateRangeChartCtx, filteredSnapshots); };
        createChart = function(ctx, snapshots) { const datasets = {}; const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort(); const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6']; let colorIndex = 0; snapshots.forEach(s => { if (!datasets[s.exchange]) { datasets[s.exchange] = { label: s.exchange, data: [], fill: false, borderColor: colors[colorIndex++ % colors.length], tension: 0.1 }; } }); for (const ex in datasets) { datasets[ex].data = labels.map(l => snapshots.find(s => s.snapshot_date === l && s.exchange === ex)?.value ?? null); } return new Chart(ctx, { type: 'line', data: { labels: labels, datasets: Object.values(datasets) }, options: { spanGaps: true, responsive: true, maintainAspectRatio: true, scales: { y: { ticks: { callback: function(value) { return '$' + value.toLocaleString(); } } } } } }); };
        renderSnapshotHistory = function(snapshots) { snapshotHistoryTableBody.innerHTML = ''; [...snapshots].reverse().forEach(s => { const row = snapshotHistoryTableBody.insertRow(); row.innerHTML = `<td>${s.snapshot_date}</td><td>${s.exchange}</td><td>$${s.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td><td class="actions-cell"><button class="delete-btn" data-id="${s.id}" data-type="snapshot">Delete</button></td>`; }); };
        populatePricesFromCache = function() { let totalPortfolioValue = 0; activityMap.forEach((stock, key) => { const row = document.querySelector(`#positions-summary-body [data-key="${key}"]`); if (row) { const livePrice = priceCache.get(stock.ticker); if (livePrice) { const currentValue = stock.closingQty * livePrice; const unrealizedPL = currentValue - (stock.closingQty * stock.costBasis); totalPortfolioValue += currentValue; row.querySelector('.current-price').textContent = `$${livePrice.toFixed(2)}`; row.querySelector('.current-value').textContent = `$${currentValue.toFixed(2)}`; const unrealizedCell = row.querySelector('.unrealized-pl'); unrealizedCell.textContent = `$${unrealizedPL.toFixed(2)}`; unrealizedCell.className = `unrealized-pl ${unrealizedPL >= 0 ? 'positive' : 'negative'}`; } } }); const summarySpan = portfolioSummary.querySelector('span'); if (summarySpan) { summarySpan.textContent = `$${totalPortfolioValue.toFixed(2)}`; summarySpan.className = totalPortfolioValue >= 0 ? 'positive' : 'negative'; } };
        snapshotForm.addEventListener('submit', async (e) => { e.preventDefault(); const formData = { snapshot_date: document.getElementById('snapshot-date').value, exchange: document.getElementById('snapshot-exchange').value, value: parseFloat(document.getElementById('snapshot-value').value) }; if (!formData.exchange || !formData.snapshot_date || isNaN(formData.value)) return alert('Please fill out all fields correctly.'); await fetch('/api/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); snapshotForm.reset(); document.getElementById('snapshot-date').value = getCurrentESTDateString(); if (currentView.type === 'overview') await renderOverviewPage(); });
        settingsBtn.addEventListener('click', () => settingsModal.classList.add('visible'));
        saveSettingsBtn.addEventListener('click', () => { settings.apiKey = apiKeyInput.value.trim(); saveSettings(); settingsModal.classList.remove('visible'); handleTabClick(currentView.type, currentView.value); });
        document.querySelector('#ledger-table thead').addEventListener('click', (e) => { const newSortColumn = e.target.dataset.sort; if (!newSortColumn) return; if (ledgerSort.column === newSortColumn) { ledgerSort.direction = ledgerSort.direction === 'asc' ? 'desc' : 'asc'; } else { ledgerSort.column = newSortColumn; ledgerSort.direction = 'asc'; } renderLedger(); });
        ledgerTableBody.addEventListener('click', async (e) => { const id = e.target.dataset.id; if (!id) return; if (e.target.classList.contains('delete-btn')) { if (e.target.dataset.type === 'snapshot') { if (confirm('Are you sure you want to delete this snapshot?')) { await fetch(`/api/snapshots/${id}`, { method: 'DELETE' }); renderOverviewPage(); } } else { if (confirm('Are you sure you want to delete this transaction?')) { await fetch(`/api/transactions/${id}`, { method: 'DELETE' }); handleTabClick('overview', null); } } } if (e.target.classList.contains('modify-btn')) { const tx = allTransactions.find(t => t.id == id); if (tx) { document.getElementById('edit-id').value = tx.id; document.getElementById('edit-date').value = tx.transaction_date; document.getElementById('edit-ticker').value = tx.ticker; const exchangeSelect = document.getElementById('edit-exchange'); exchangeSelect.innerHTML = document.getElementById('exchange').innerHTML; exchangeSelect.value = tx.exchange; document.getElementById('edit-type').value = tx.transaction_type; document.getElementById('edit-quantity').value = tx.quantity; document.getElementById('edit-price').value = tx.price; document.getElementById('edit-limit-price-up').value = tx.limit_price_up; document.getElementById('edit-limit-price-down').value = tx.limit_price_down; document.getElementById('edit-limit-expiration').value = tx.limit_expiration; editModal.classList.add('visible'); } } });
        editForm.addEventListener('submit', async (e) => { e.preventDefault(); const id = document.getElementById('edit-id').value; const updatedTx = { transaction_date: document.getElementById('edit-date').value, ticker: document.getElementById('edit-ticker').value.toUpperCase(), exchange: document.getElementById('edit-exchange').value, transaction_type: document.getElementById('edit-type').value, quantity: parseFloat(document.getElementById('edit-quantity').value), price: parseFloat(document.getElementById('edit-price').value), limit_price_up: parseFloat(document.getElementById('edit-limit-price-up').value) || null, limit_price_down: parseFloat(document.getElementById('edit-limit-price-down').value) || null, limit_expiration: document.getElementById('edit-limit-expiration').value || null }; await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTx) }); editModal.classList.remove('visible'); handleTabClick('overview', null); });
        document.querySelectorAll('.modal .close-button').forEach(btn => btn.addEventListener('click', e => e.target.closest('.modal').classList.remove('visible')));
        window.addEventListener('click', e => { if (e.target.classList.contains('modal')) e.target.classList.remove('visible'); });
        refreshPricesBtn.addEventListener('click', async () => { console.log("Manual refresh triggered."); refreshPricesBtn.disabled = true; refreshPricesBtn.textContent = 'Refreshing...'; await updateAllPrices(); setTimeout(() => { refreshPricesBtn.disabled = false; refreshPricesBtn.textContent = 'Refresh Prices'; }, 3000); });
        confirmNoActivityBtn.addEventListener('click', () => { if (document.getElementById('confirm-no-activity').checked) { const today = getCurrentESTDateString(); localStorage.setItem(`activity-ack-${today}`, 'true'); noActivityModal.classList.remove('visible'); } else { alert('Please check the box to confirm.'); } });
        async function checkForDailyActivity() { const today = getCurrentESTDateString(); if (localStorage.getItem(`activity-ack-${today}`)) return; const now = new Date(); const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })); const dayOfWeek = estTime.getDay(); if (dayOfWeek === 0 || dayOfWeek === 6) return; const response = await fetch(`/api/positions/${today}`); const data = await response.json(); if (data && data.dailyTransactions.length === 0) { noActivityModal.classList.add('visible'); } }
        initialize = function() {
            isApiLimitReached = false; // Reset on every full page load
            loadSettings();
            const today = getCurrentESTDateString();
            document.getElementById('transaction-date').value = today;
            document.getElementById('snapshot-date').value = today;
            const mainExchangeSelect = document.getElementById('exchange');
            document.getElementById('snapshot-exchange').innerHTML = mainExchangeSelect.innerHTML;
            handleTabClick('date', today);
            initializeScheduler();
            checkForDailyActivity();

            // Populate limit order expiration dropdowns
            const expirationSelects = [document.getElementById('limit-expiration'), document.getElementById('edit-limit-expiration')];
            const expirationOptions = document.querySelector('#limit-expiration').innerHTML;
            expirationSelects.forEach(sel => sel.innerHTML = expirationOptions);
        };
        initialize();
    }
    allOtherFunctions();
});