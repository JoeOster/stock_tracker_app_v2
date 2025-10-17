// /public/ui/renderers/_charts.js
// Version 0.1.17
/**
 * @file This file contains all rendering logic for the charts page.
 * @module renderers/_charts
 */

import { state } from '../../state.js';
import { formatAccounting, formatQuantity, getTradingDays, getCurrentESTDateString } from '../helpers.js';
import { createChart } from '../chart-builder.js';

// These functions remain unchanged as they are pure component renderers
function renderAllTimeChart(ctx, chartInstance, snapshots) { /* ... */ }
function renderFiveDayChart(ctx, chartInstance, snapshots) { /* ... */ }
function renderDateRangeChart(ctx, startDateEl, endDateEl, chartInstance, snapshots) { /* ... */ }
async function renderPortfolioOverview() { /* ... */ }

/**
 * Renders all components on the Charts page. It now fetches its own data.
 * @returns {Promise<void>}
 */
export async function renderChartsPage() {
    // ... (This function now contains the logic previously in renderPortfolioCharts)
}