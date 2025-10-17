// /public/ui/renderers/_charts.js
// Version 0.1.19
/**
 * @file This file contains all rendering logic for the charts page.
 * @module renderers/_charts
 */

import { state } from '../../state.js';
import { formatAccounting, getTradingDays, getCurrentESTDateString } from '../helpers.js';
import { createChart } from '../chart-builder.js';

/**
 * Renders the 'All Time Value' chart using the generic chart builder.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {import('chart.js').Chart | null} chartInstance - The existing chart instance to destroy, if any.
 * @param {any[]} snapshots - The snapshot data.
 * @returns {import('chart.js').Chart|null} The new chart instance.
 */
export function renderAllTimeChart(ctx, chartInstance, snapshots) {
    if (chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    return createChart(ctx, snapshots);
}

/**
 * Renders the 'Past Five Day' chart, filtering for the last 5 trading days.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {import('chart.js').Chart | null} chartInstance - The existing chart instance to destroy, if any.
 * @param {any[]} snapshots - The snapshot data.
 * @returns {import('chart.js').Chart|null} The new chart instance.
 */
export function renderFiveDayChart(ctx, chartInstance, snapshots) {
    if (chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    const fiveTradingDays = getTradingDays(5);
    if (fiveTradingDays.length === 0) return createChart(ctx, []);
    const startDate = fiveTradingDays[0];
    const endDate = getCurrentESTDateString();
    const filteredSnapshots = snapshots.filter(s => s.snapshot_date >= startDate && s.snapshot_date <= endDate);
    return createChart(ctx, filteredSnapshots);
}

/**
 * Renders the 'By Date Chart', filtering snapshots based on user-selected dates.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {HTMLInputElement} startDateEl - The start date input element.
 * @param {HTMLInputElement} endDateEl - The end date input element.
 * @param {import('chart.js').Chart | null} chartInstance - The existing chart instance to destroy, if any.
 * @param {any[]} snapshots - The snapshot data.
 * @returns {import('chart.js').Chart|null} The new chart instance.
 */
export function renderDateRangeChart(ctx, startDateEl, endDateEl, chartInstance, snapshots) {
    if (chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    const start = startDateEl ? startDateEl.value : null;
    const end = endDateEl ? endDateEl.value : null;
    let filteredSnapshots = [];
    if (start && end) {
        filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end);
    }
    return createChart(ctx, filteredSnapshots);
}

/**
 * Renders the portfolio overview table, which summarizes all open positions by ticker.
 * @returns {Promise<void>}
 */
export async function renderPortfolioOverview() {
    // ... (This function is unchanged)
}

/**
 * Renders all components on the Charts page.
 * @returns {Promise<void>}
 */
export async function renderChartsPage() {
    const plSummaryTable = document.getElementById('pl-summary-table');
    const allTimeChartCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('all-time-chart'));
    if (!plSummaryTable || !allTimeChartCanvas) return;
    const allTimeChartCtx = allTimeChartCanvas.getContext('2d');

    const overviewDateSpan = document.getElementById('overview-date');
    if(overviewDateSpan) {
        const today = new Date(getCurrentESTDateString() + 'T12:00:00Z');
        overviewDateSpan.textContent = `(as of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`;
    }

    async function renderRangedPLSummary() {
        // ... (This function is unchanged)
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
    state.allTimeChart = renderAllTimeChart(allTimeChartCtx, state.allTimeChart, state.allSnapshots);
    state.fiveDayChart = renderFiveDayChart(fiveDayChartCtx, state.fiveDayChart, state.allSnapshots);
    state.dateRangeChart = renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, state.dateRangeChart, state.allSnapshots);

    // --- Render Portfolio Overview Table ---
    await renderPortfolioOverview();

    // --- Render Ranged P&L ---
    renderRangedPLSummary();
}