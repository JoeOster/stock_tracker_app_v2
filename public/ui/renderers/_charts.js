// Portfolio Tracker V3.03
// public/ui/renderers/_charts.js

/* global Chart */ // FIX: Informs the type checker about the global Chart object from the CDN.

import { state } from '../../app-main.js';
import { formatQuantity, formatAccounting, getTradingDays, getCurrentESTDateString } from '../helpers.js';

// --- Chart Creation Logic ---

/**
 * Generates a consistent HSL color based on a string input.
 * Used to give each exchange a unique, but predictable, color in charts.
 * @param {string} str - The input string (e.g., an exchange name).
 * @param {number} [s=75] - The saturation percentage.
 * @param {number} [l=60] - The lightness percentage.
 * @returns {string} The HSL color string.
 */
function stringToHslColor(str, s = 75, l = 60) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Wraps text within a canvas context to fit a maximum width.
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {string} text - The text to wrap.
 * @param {number} x - The x-coordinate to start drawing.
 * @param {number} y - The y-coordinate to start drawing.
 * @param {number} maxWidth - The maximum width of a line.
 * @param {number} lineHeight - The height of each line.
 * @returns {void}
 */
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

/**
 * The core chart creation function. It builds and configures a Chart.js line chart.
 * If there is not enough data, it displays a message on the canvas instead.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {any[]} snapshots - The array of snapshot data to plot.
 * @param {import('../../app-main.js').AppState} state - The main application state.
 * @returns {Chart|null} A new Chart.js instance or null if rendering is not possible.
 */
function createChart(ctx, snapshots, state) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();

    // If there isn't enough data to draw a line, display a message instead.
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

    // Group snapshot data by exchange to create separate datasets.
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
            spanGaps: true, // Connect lines across null data points
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
            },
            onClick: (e, elements, chart) => {
                // On click, open a larger version of the chart in a modal.
                const chartZoomModal = document.getElementById('chart-zoom-modal');
                const zoomedChartCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('zoomed-chart'));
                if (!chartZoomModal || !zoomedChartCanvas) return;
                const zoomedChartCtx = zoomedChartCanvas.getContext('2d');
                if (!zoomedChartCtx) return;
                if(state.zoomedChart) state.zoomedChart.destroy();
                state.zoomedChart = new Chart(zoomedChartCtx, chart.config);
                chartZoomModal.classList.add('visible');
            }
        }
    });
}

/**
 * Renders the 'All Time Value' chart.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {Chart | null} chartInstance - The existing chart instance to destroy, if any.
 * @param {any[]} snapshots - The snapshot data.
 * @param {import('../../app-main.js').AppState} state - The main application state.
 * @returns {Chart|null} The new chart instance.
 */
function renderAllTimeChart(ctx, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    return createChart(ctx, snapshots, state);
}

/**
 * Renders the 'Past Ten Day Report' chart, filtering for the last 5 trading days.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {Chart | null} chartInstance - The existing chart instance to destroy, if any.
 * @param {any[]} snapshots - The snapshot data.
 * @param {import('../../app-main.js').AppState} state - The main application state.
 * @returns {Chart|null} The new chart instance.
 */
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

/**
 * Renders the 'By Date Chart', filtering snapshots based on user-selected dates.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {HTMLInputElement} startDateEl - The start date input element.
 * @param {HTMLInputElement} endDateEl - The end date input element.
 * @param {Chart | null} chartInstance - The existing chart instance to destroy, if any.
 * @param {any[]} snapshots - The snapshot data.
 * @param {import('../../app-main.js').AppState} state - The main application state.
 * @returns {Chart|null} The new chart instance.
 */
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

/**
 * Fetches all necessary data and renders all components on the Charts page.
 * @param {import('../../app-main.js').AppState} state - The main application state.
 * @returns {Promise<void>}
 */
export async function renderChartsPage(state) {
    const plSummaryTable = document.getElementById('pl-summary-table');
    const allTimeChartCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('all-time-chart'));
    if (!plSummaryTable || !allTimeChartCanvas) return;
    const allTimeChartCtx = allTimeChartCanvas.getContext('2d');

    const overviewDateSpan = document.getElementById('overview-date');
    if(overviewDateSpan) {
        const today = new Date(getCurrentESTDateString() + 'T12:00:00Z');
        overviewDateSpan.textContent = `(as of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`;
    }

    /** Renders the realized P/L summary for a specific date range. */
    async function renderRangedPLSummary() {
        const startDateInput = /** @type {HTMLInputElement} */ (document.getElementById('pl-start-date'));
        const endDateInput = /** @type {HTMLInputElement} */ (document.getElementById('pl-end-date'));
        const rangedTable = document.getElementById('pl-summary-ranged-table');
        if (!startDateInput || !endDateInput || !rangedTable) return;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

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

    // --- Render Lifetime P&L Summary ---
    try {
        const plResponse = await fetch(`/api/reporting/realized_pl/summary?holder=${state.selectedAccountHolderId}`);
        if (plResponse.ok) {
            const plData = await plResponse.json();
            const plBody = plData.byExchange.map(row => `<tr><td>${row.exchange}</td><td class="numeric">${formatAccounting(row.total_pl)}</td></tr>`).join('');
            plSummaryTable.innerHTML = `<thead><tr><th>Exchange</th><th class="numeric">Realized P/L</th></tr></thead><tbody>${plBody}<tr><td><strong>Total</strong></td><td class="numeric"><strong>${formatAccounting(plData.total)}</strong></td></tr></tbody>`;
        }
    } catch (error) { console.error("Failed to render P&L Summary:", error); }
    
    // --- Initialize Chart Canvases and Date Pickers ---
    const fiveDayChartCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('five-day-chart'));
    const dateRangeChartCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('date-range-chart'));
    const fiveDayChartCtx = fiveDayChartCanvas ? fiveDayChartCanvas.getContext('2d') : null;
    const dateRangeChartCtx = dateRangeChartCanvas ? dateRangeChartCanvas.getContext('2d') : null;
    const chartStartDate = /** @type {HTMLInputElement} */ (document.getElementById('chart-start-date'));
    const chartEndDate = /** @type {HTMLInputElement} */ (document.getElementById('chart-end-date'));

    // Set default values for date range pickers if they are empty
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

    // --- Render All Charts ---
    state.allTimeChart = renderAllTimeChart(allTimeChartCtx, state.allTimeChart, state.allSnapshots, state);
    state.fiveDayChart = renderFiveDayChart(fiveDayChartCtx, state.fiveDayChart, state.allSnapshots, state);
    state.dateRangeChart = renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, state.dateRangeChart, state.allSnapshots, state);
    
    // --- Render Portfolio Overview Table ---
    await renderPortfolioOverview(state.priceCache);

    // --- Add Event Listeners for Date Pickers ---
    if(chartStartDate) {
        chartStartDate.addEventListener('change', () => renderChartsPage(state));
    }
    if(chartEndDate) {
        chartEndDate.addEventListener('change', () => renderChartsPage(state));
    }

    const plStartDate = /** @type {HTMLInputElement} */ (document.getElementById('pl-start-date'));
    const plEndDate = /** @type {HTMLInputElement} */ (document.getElementById('pl-end-date'));
    if(plStartDate) plStartDate.value = '2025-09-30';
    if(plEndDate) plEndDate.value = getCurrentESTDateString();
    if(plStartDate) plStartDate.addEventListener('change', renderRangedPLSummary);
    if(plEndDate) plEndDate.addEventListener('change', renderRangedPLSummary);
    renderRangedPLSummary();
}

/**
 * Fetches and renders the portfolio overview table, which summarizes all open positions by ticker.
 * @param {Map<string, number|string>} priceCache - The application's price cache.
 * @returns {Promise<void>}
 */
export async function renderPortfolioOverview(priceCache) {
    const overviewBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('portfolio-overview-body'));
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
            const priceHTML = (typeof priceToUse === 'number') ? formatAccounting(priceToUse) : `<span class="negative">${priceToUse || '--'}</span>`;
            const totalValue = (typeof priceToUse === 'number') ? pos.total_quantity * priceToUse : null;
            const totalCost = pos.total_quantity * pos.weighted_avg_cost;
            const unrealizedPL = (totalValue !== null) ? totalValue - totalCost : null;
            if(unrealizedPL) totalUnrealizedPL += unrealizedPL;

            const dayChangeAmount = (typeof priceToUse === 'number' && pos.previous_close) ? (priceToUse - pos.previous_close) * pos.total_quantity : null;
            const dayChangePercent = (typeof priceToUse === 'number' && pos.previous_close && pos.previous_close !== 0) ? ((priceToUse - pos.previous_close) / pos.previous_close) * 100 : null;

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