// public/ui/renderers.js

// --- Central Export File for All Rendering Logic ---

// Import functions from the individual renderer modules.
import { renderTabs } from './renderers/_tabs.js';
import { renderDailyReport } from './renderers/_dailyReport.js';
import { renderChartsPage, renderPortfolioOverview } from './renderers/_charts.js';
import { renderLedger } from './renderers/_ledger.js';
import { renderOrdersPage } from './renderers/_orders.js';
import { renderAlertsPage } from './renderers/_alerts.js';
import { renderSnapshotsPage } from './renderers/_snapshots.js';

// Export the functions explicitly by name.
export {
    renderTabs,
    renderDailyReport,
    renderChartsPage,
    renderPortfolioOverview,
    renderLedger,
    renderOrdersPage,
    renderAlertsPage,
    renderSnapshotsPage
};

// ...
    const snapshotsTab = document.createElement('div');
    snapshotsTab.className = 'tab master-tab';
    snapshotsTab.dataset.viewType = 'snapshots';
    snapshotsTab.textContent = 'Snapshots';
    if (currentView.type === 'snapshots') snapshotsTab.classList.add('active');
    tabsContainer.appendChild(snapshotsTab);

    // --- NEW Importer Tab ---
    const importsTab = document.createElement('div');
    importsTab.className = 'tab master-tab';
    importsTab.dataset.viewType = 'imports';
    importsTab.textContent = 'Imports';
    if (currentView.type === 'imports') importsTab.classList.add('active');
    tabsContainer.appendChild(importsTab);
}