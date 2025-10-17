// /public/ui/renderers.js
/**
 * @file This file acts as a central hub for importing and exporting all the renderer modules.
 */

import { renderAlerts } from './renderers/_alerts.js';
import { renderPortfolioCharts } from './renderers/_charts.js';
import { renderDailyReport } from './renderers/_dailyReport.js';
import { renderTransactionLedger } from './renderers/_ledger.js';
import { renderOpenOrders } from './renderers/_orders.js';
import { renderSnapshots } from './renderers/_snapshots.js';
import { renderTabs, styleActiveTab } from './renderers/_tabs.js';

export {
    renderAlerts,
    renderPortfolioCharts,
    renderDailyReport,
    renderTransactionLedger,
    renderOpenOrders,
    renderSnapshots,
    renderTabs,
    styleActiveTab,
};