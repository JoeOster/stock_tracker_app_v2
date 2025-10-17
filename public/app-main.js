// /public/app-main.js
// Version 0.1.16
/**
 * @file Main application entry point. Handles initialization, state management,
 * and view switching.
 * @module app-main
 */

import { initializeAllEventHandlers } from './event-handlers/_init.js';
import { state, updateState } from './state.js';
import { refreshLedger } from './api.js';
import { loadAlertsPage } from './event-handlers/_alerts.js';
import { loadDailyReportPage } from './event-handlers/_dailyReport.js';
import { loadOrdersPage } from './event-handlers/_orders.js';
import { loadChartsAndSnapshotsPage } from './event-handlers/_snapshots.js';
import { renderPortfolioCharts } from './ui/renderers/_charts.js';
import { renderLedgerPage } from './ui/renderers/_ledger.js';
import { renderOpenOrders } from './ui/renderers/_orders.js';
import { renderSnapshots } from './ui/renderers/_snapshots.js';
import { renderAlerts } from './ui/renderers/_alerts.js';
import { renderTabs, styleActiveTab } from './ui/renderers/_tabs.js';
import { showToast } from './ui/helpers.js';

/**
 * Fetches the initial data required for the application to start.
 * @returns {Promise<void>}
 */
async function fetchInitialData() {
    try {
        const [
            transactions,
            openOrders,
            snapshots,
            alerts,
            accountHolders,
            exchanges
        ] = await Promise.all([
            fetch(`/api/transactions?holder=${state.selectedAccountHolderId}`).then(res => res.json()),
            fetch(`/api/orders/pending?holder=${state.selectedAccountHolderId}`).then(res => res.json()),
            fetch(`/api/reporting/snapshots?holder=${state.selectedAccountHolderId}`).then(res => res.json()),
            fetch(`/api/notifications?holder=${state.selectedAccountHolderId}`).then(res => res.json()),
            fetch('/api/accounts/holders').then(res => res.json()),
            fetch('/api/accounts/exchanges').then(res => res.json())
        ]);

        updateState({
            transactions,
            openOrders,
            allSnapshots: snapshots,
            activeAlerts: alerts,
            allAccountHolders: accountHolders,
            allExchanges: exchanges
        });

    } catch (error) {
        console.error('Failed to fetch initial data:', error);
        showToast('Error loading initial application data.', 'error');
    }
}

/**
 * Switches the main view of the application and renders the necessary components.
 * @param {string} viewType - The type of view to switch to (e.g., 'charts', 'ledger').
 * @param {string|null} [viewValue=null] - An optional value for the view (e.g., a date).
 */
export async function switchView(viewType, viewValue = null) {
    updateState({ currentView: { type: viewType, value: viewValue } });
    styleActiveTab(state.currentView);

    document.querySelectorAll('.page-container').forEach(c => (/** @type {HTMLElement} */ (c)).style.display = 'none');

    try {
        let container;
        switch (viewType) {
            case 'charts':
                container = document.getElementById('charts-container');
                if (container) container.style.display = 'block';
                await loadChartsAndSnapshotsPage('charts');
                break;
            case 'ledger':
                container = document.getElementById('ledger-page-container');
                if (container) container.style.display = 'block';
                await refreshLedger();
                break;
            case 'orders':
                container = document.getElementById('orders-page-container');
                if (container) container.style.display = 'block';
                await loadOrdersPage();
                break;
            case 'alerts':
                container = document.getElementById('alerts-page-container');
                if (container) container.style.display = 'block';
                await loadAlertsPage();
                break;
            case 'snapshots':
                container = document.getElementById('snapshots-page-container');
                if (container) container.style.display = 'block';
                await loadChartsAndSnapshotsPage('snapshots');
                break;
            case 'imports':
                container = document.getElementById('imports-page-container');
                if (container) container.style.display = 'block';
                break;
            case 'date':
                container = document.getElementById('daily-report-container');
                if (container) container.style.display = 'block';
                if(viewValue) await loadDailyReportPage(viewValue);
                break;
        }
    } catch (error) {
        console.error(`Failed to switch view to ${viewType}:`, error);
        showToast('Error loading page data.', 'error');
    }
}

/**
 * Initializes the application.
 */
async function initializeApp() {
    initializeAllEventHandlers();
    await fetchInitialData();

    renderTabs(state.currentView);
    await switchView(state.currentView.type, state.currentView.value);

    const accountHolderSelectors = document.querySelectorAll('.account-holder-select');
    accountHolderSelectors.forEach(select => {
        const selector = /** @type {HTMLSelectElement} */ (select);
        selector.innerHTML = '';
        state.allAccountHolders.forEach(holder => {
            const option = new Option(holder.name, String(holder.id));
            selector.add(option);
        });
        selector.value = String(state.selectedAccountHolderId);
    });
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', initializeApp);