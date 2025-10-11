// public/ui/renderers.js (Refactored Index)

// Import all individual renderer functions from their new modules
import { renderTabs } from './renderers/_tabs.js';
import { renderDailyReport, populatePricesFromCache } from './renderers/_dailyReport.js';
import { renderChartsPage, renderPortfolioOverview } from './renderers/_charts.js';
import { renderLedger } from './renderers/_ledger.js';
import { renderOrdersPage } from './renderers/_orders.js';
import { renderAlertsPage } from './renderers/_alerts.js';
import { renderSnapshotsPage } from './renderers/_snapshots.js';

// Re-export them for the rest of the application to use
export {
    renderTabs,
    renderDailyReport,
    populatePricesFromCache,
    renderChartsPage,
    renderPortfolioOverview,
    renderLedger,
    renderOrdersPage,
    renderAlertsPage,
    renderSnapshotsPage
};