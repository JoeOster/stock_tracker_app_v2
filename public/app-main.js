// /public/app-main.js
// Version 0.1.8
/**
 * @file Main application entry point. Handles initialization, state management,
 * and view switching.
 * @module app-main
 */

import { initializeAllEventHandlers } from './event-handlers/_init.js';
import { state, updateState } from './state.js';
import {
    renderAlerts,
    renderPortfolioCharts,
    renderDailyReport,
    renderTransactionLedger,
    renderOpenOrders,
    renderSnapshots,
} from './ui/renderers.js';
import { renderTabs, styleActiveTab } from './ui/renderers/_tabs.js'; // <-- Direct import
import { showToast } from './ui/helpers.js';

/**
 * Fetches the initial data required for the application to start.
 * @returns {Promise<void>}
 */
async function fetchInitialData() {
    // ... (rest of the function is unchanged)
}

/**
 * Switches the main view of the application and renders the necessary components.
 * @param {string} viewType - The type of view to switch to (e.g., 'charts', 'ledger').
 * @param {string|null} [viewValue=null] - An optional value for the view (e.g., a date).
 */
export async function switchView(viewType, viewValue = null) {
    updateState({ currentView: { type: viewType, value: viewValue } });
    styleActiveTab(state.currentView);

    const containers = document.querySelectorAll('.page-container');
    containers.forEach(c => {
        const container = /** @type {HTMLElement} */ (c);
        container.style.display = 'none';
    });

    try {
        let data;
        switch (viewType) {
            case 'charts':
                document.getElementById('charts-page-container').style.display = 'block';
                await renderPortfolioCharts();
                break;
            case 'ledger':
                data = await (await fetch(`/api/transactions?holder=${state.selectedAccountHolderId}`)).json();
                updateState({ transactions: data });
                document.getElementById('ledger-page-container').style.display = 'block';
                renderTransactionLedger(data);
                break;
            case 'orders':
                data = await (await fetch(`/api/orders/pending?holder=${state.selectedAccountHolderId}`)).json();
                updateState({ openOrders: data });
                document.getElementById('orders-page-container').style.display = 'block';
                renderOpenOrders(data);
                break;
            case 'alerts':
                data = await (await fetch(`/api/notifications?holder=${state.selectedAccountHolderId}`)).json();
                updateState({ activeAlerts: data });
                document.getElementById('alerts-page-container').style.display = 'block';
                renderAlerts(data);
                break;
            case 'snapshots':
                data = await (await fetch(`/api/reporting/snapshots?holder=${state.selectedAccountHolderId}`)).json();
                updateState({ allSnapshots: data });
                document.getElementById('snapshots-page-container').style.display = 'block';
                renderSnapshots(data);
                break;
            case 'imports':
                document.getElementById('imports-page-container').style.display = 'block';
                break;
            case 'date':
                // This will be updated when we decouple the daily report renderer
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
    switchView(state.currentView.type, state.currentView.value);

    // ... (rest of the function is unchanged)
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', initializeApp);