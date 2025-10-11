// public/ui/renderers/_charts.js
import { state } from '../../app-main.js';
import { formatQuantity, formatAccounting, getTradingDays, getCurrentESTDateString } from '../helpers.js';

// --- Chart Creation Logic (previously in charts.js) ---

function stringToHslColor(str, s = 75, l = 60) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

function createChart(ctx, snapshots, state) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();

    if (snapshots.length === 0 || labels.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px " + (state.settings.font || 'Inter');
        ctx.textAlign = "center";
        const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#666';

        const message = labels.length < 2 && snapshots.length > 0
            ? "At least two snapshots are needed to draw a chart for this date range."
            : "No snapshot data available for this account holder in this date range.";
        wrapText(ctx, message, ctx.canvas.width / 2, 50, ctx.canvas.width - 40, 20);
        return null;
    }

    const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#666';

    const exchangeNames = [...new Set(snapshots.map(s => s.exchange))];

    exchangeNames.forEach(exchangeName => {
        datasets[exchangeName] = {
            label: exchangeName,
            data: [],
            fill: false,
            borderColor: stringToHslColor(exchangeName),
            tension: 0.1
        };
        const valueMap = new Map(snapshots.filter(s => s.exchange === exchangeName).map(s => [s.snapshot_date, s.value]));
        datasets[exchangeName].data = labels.map(label => valueMap.get(label) ?? null);
    });

    return new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: Object.values(datasets) },
        options: {
            spanGaps: true,
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
            },
            onClick: (e, elements, chart) => {
                const chartZoomModal = document.getElementById('chart-zoom-modal');
                const zoomedChartCtx = document.getElementById('zoomed-chart').getContext('2d');
                if (!chartZoomModal || !zoomedChartCtx) return;
                if(state.zoomedChart) state.zoomedChart.destroy();
                state.zoomedChart = new Chart(zoomedChartCtx, chart.config);
                chartZoomModal.classList.add('visible');
            }
        }
    });
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
    const start = startDateEl ? startDateEl.value : null;
    const end = endDateEl ? endDateEl.value : null;
    let filteredSnapshots = [];
    if (start && end) {
        filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end);
    }
    return createChart(ctx, filteredSnapshots, state);
}


// --- Main Page Rendering Functions ---

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
            const res = await fetch('/api/reporting/realized_pl/summary', {
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
                rangedTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P/L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
            }
        } catch (error) {
            console.error("Failed to render Ranged P&L Summary:", error);
            rangedTable.innerHTML = '<tbody><tr><td>Error loading data.</td></tr></tbody>';
        }
    }

    try {
        const plResponse = await fetch(`/api/reporting/realized_pl/summary?holder=${state.selectedAccountHolderId}`);
        if (plResponse.ok) {
            const plData = await plResponse.json();
            const plBody = plData.byExchange.map(row => `<tr><td>${row.exchange}</td><td class="numeric">${formatAccounting(row.total_pl)}</td></tr>`).join('');
            plSummaryTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P/L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
        }
    } catch (error) { console.error("Failed to render P&L Summary:", error); }
    
    const fiveDayChartCtx = document.getElementById('five-day-chart')?.getContext('2d');
    const dateRangeChartCtx = document.getElementById('date-range-chart')?.getContext('2d');
    const chartStartDate = document.getElementById('chart-start-date');
    const chartEndDate = document.getElementById('chart-end-date');

    if (chartStartDate && !chartStartDate.value) {
        if (state.allSnapshots.length > 0) {
            const oldestDate = state.allSnapshots.reduce((oldest, current) => current.snapshot_date < oldest ? current.snapshot_date : oldest, state.allSnapshots[0].snapshot_date);
            chartStartDate.value = oldestDate;
        } else {
            chartStartDate.value = getCurrentESTDateString();
        }
    }
    if (chartEndDate && !chartEndDate.value) {
        chartEndDate.value = getCurrentESTDateString();
    }

    state.allTimeChart = renderAllTimeChart(allTimeChartCtx, state.allTimeChart, state.allSnapshots, state);
    state.fiveDayChart = renderFiveDayChart(fiveDayChartCtx, state.fiveDayChart, state.allSnapshots, state);
    state.dateRangeChart = renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, state.dateRangeChart, state.allSnapshots, state);
    
    await renderPortfolioOverview(state.priceCache);

    if(chartStartDate) {
        chartStartDate.addEventListener('change', () => renderChartsPage(state));
    }
    if(chartEndDate) {
        chartEndDate.addEventListener('change', () => renderChartsPage(state));
    }

    const plStartDate = document.getElementById('pl-start-date');
    const plEndDate = document.getElementById('pl-end-date');
    if(plStartDate) plStartDate.value = '2025-09-30';
    if(plEndDate) plEndDate.value = getCurrentESTDateString();
    if(plStartDate) plStartDate.addEventListener('change', renderRangedPLSummary);
    if(plEndDate) plEndDate.addEventListener('change', renderRangedPLSummary);
    renderRangedPLSummary();
}

export async function renderPortfolioOverview(priceCache) {
    const overviewBody = document.getElementById('portfolio-overview-body');
    if (!overviewBody) return;
    overviewBody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    try {
        const overviewResponse = await fetch(`/api/reporting/portfolio/overview?holder=${state.selectedAccountHolderId}`);
        if (!overviewResponse.ok) throw new Error('Failed to load portfolio overview data');
        const data = await overviewResponse.json();
        if (data.length === 0) {
            overviewBody.innerHTML = '<tr><td colspan="8">No open positions to display.</td></tr>';
            return;
        }
        const tickersToUpdate = data.map(pos => pos.ticker);
        const priceResponse = await fetch('/api/utility/prices/batch', {
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
            const priceHTML = priceToUse && priceToUse !== 'invalid' ? formatAccounting(priceToUse) : `<span class="negative">${priceToUse || '--'}</span>`;
            const totalValue = (priceToUse && priceToUse !== 'invalid') ? pos.total_quantity * priceToUse : null;
            const totalCost = pos.total_quantity * pos.weighted_avg_cost;
            const unrealizedPL = (totalValue !== null) ? totalValue - totalCost : null;
            if(unrealizedPL) totalUnrealizedPL += unrealizedPL;

            const dayChangeAmount = (priceToUse && priceToUse !== 'invalid' && pos.previous_close) ? (priceToUse - pos.previous_close) * pos.total_quantity : null;
            const dayChangePercent = (priceToUse && priceToUse !== 'invalid' && pos.previous_close && pos.previous_close !== 0) ? ((priceToUse - pos.previous_close) / pos.previous_close) * 100 : null;

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