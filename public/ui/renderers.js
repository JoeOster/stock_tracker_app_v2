// public/ui/renderers.js (Corrected API URLs)
import { formatQuantity, formatAccounting, getActivePersistentDates, getTradingDays, getCurrentESTDateString, showToast } from './helpers.js';
import { renderAllTimeChart, renderFiveDayChart, renderDateRangeChart } from './charts.js';
import { state } from '../app-main.js';

export function renderTabs(currentView) { /* ... (This function is unchanged) ... */ }

export function renderLedger(allTransactions, ledgerSort) { /* ... (This function is unchanged) ... */ }

export async function renderChartsPage(state) {
    const plSummaryTable = document.getElementById('pl-summary-table');
    const allTimeChartCtx = document.getElementById('all-time-chart')?.getContext('2d');
    if (!plSummaryTable || !allTimeChartCtx) return;

    const overviewDateSpan = document.getElementById('overview-date');
    if(overviewDateSpan) { /* ... */ }

    async function renderRangedPLSummary() {
        const startDate = document.getElementById('pl-start-date').value;
        const endDate = document.getElementById('pl-end-date').value;
        const rangedTable = document.getElementById('pl-summary-ranged-table');
        if (!startDate || !endDate || !rangedTable) return;
        try {
            const res = await fetch('/api/reporting/realized_pl/summary', { // <-- URL CORRECTED
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate, accountHolderId: state.selectedAccountHolderId })
            });
            if (res.ok) { /* ... */ }
        } catch (error) { /* ... */ }
    }

    try {
        const plResponse = await fetch(`/api/reporting/realized_pl/summary?holder=${state.selectedAccountHolderId}`); // <-- URL CORRECTED
        if (plResponse.ok) { /* ... */ }
    } catch (error) { /* ... */ }
    
    const fiveDayChartCtx = document.getElementById('five-day-chart')?.getContext('2d');
    const dateRangeChartCtx = document.getElementById('date-range-chart')?.getContext('2d');
    const chartStartDate = document.getElementById('chart-start-date');
    const chartEndDate = document.getElementById('chart-end-date');

    if (chartStartDate && !chartStartDate.value) { /* ... */ }
    if (chartEndDate && !chartEndDate.value) { /* ... */ }

    state.allTimeChart = renderAllTimeChart(allTimeChartCtx, state.allTimeChart, state.allSnapshots, state);
    state.fiveDayChart = renderFiveDayChart(fiveDayChartCtx, state.fiveDayChart, state.allSnapshots, state);
    state.dateRangeChart = renderDateRangeChart(dateRangeChartCtx, chartStartDate, chartEndDate, state.dateRangeChart, state.allSnapshots, state);
    
    await renderPortfolioOverview(state.priceCache);

    if(chartStartDate) { /* ... */ }
    if(chartEndDate) { /* ... */ }

    const plStartDate = document.getElementById('pl-start-date');
    const plEndDate = document.getElementById('pl-end-date');
    if(plStartDate) { /* ... */ }
    if(plEndDate) { /* ... */ }
    renderRangedPLSummary();
}

export async function renderPortfolioOverview(priceCache) {
    const overviewBody = document.getElementById('portfolio-overview-body');
    if (!overviewBody) return;
    overviewBody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    try {
        const overviewResponse = await fetch(`/api/reporting/portfolio/overview?holder=${state.selectedAccountHolderId}`); // <-- URL CORRECTED
        if (!overviewResponse.ok) throw new Error('Failed to load portfolio overview data');
        const data = await overviewResponse.json();
        if (data.length === 0) { /* ... */ return; }
        const tickersToUpdate = data.map(pos => pos.ticker);
        const priceResponse = await fetch('/api/utility/prices/batch', { // <-- URL CORRECTED
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersToUpdate, date: getCurrentESTDateString() })
        });
        if (!priceResponse.ok) throw new Error('Failed to fetch batch prices for overview');
        const prices = await priceResponse.json();
        /* ... (rest of the function is unchanged) ... */
    } catch (error) { /* ... */ }
}

export async function renderDailyReport(date, activityMap) {
    /* ... */
    try {
        const perfResponse = await fetch(`/api/reporting/daily_performance/${date}?holder=${state.selectedAccountHolderId}`); // <-- URL CORRECTED
        if(perfResponse.ok) { /* ... */ }
    } catch (e) { /* ... */ }

    try {
        const response = await fetch(`/api/reporting/positions/${date}?holder=${state.selectedAccountHolderId}`); // <-- URL CORRECTED
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);
        /* ... (rest of the function is unchanged) ... */
    } catch (error) { /* ... */ }
}

export function renderSnapshotsPage() { /* ... (This function is unchanged) ... */ }
export function populatePricesFromCache(activityMap, priceCache) { /* ... (This function is unchanged) ... */ }

export async function renderOrdersPage() {
    /* ... */
    try {
        const response = await fetch(`/api/orders/pending?holder=${state.selectedAccountHolderId}`); // <-- URL CORRECTED
        if (!response.ok) { /* ... */ }
        /* ... (rest of the function is unchanged) ... */
    } catch (error) { /* ... */ }
}

export async function renderAlertsPage() {
    /* ... */
    try {
        const response = await fetch(`/api/orders/notifications?holder=${state.selectedAccountHolderId}`); // <-- URL CORRECTED
        if (!response.ok) throw new Error('Failed to fetch alerts.');
        /* ... (rest of the function is unchanged) ... */
    } catch (error) { /* ... */ }
}