// /public/app-main.js
// Version 0.1.17
/**
 * @file Main application entry point. Handles initialization, state management,
 * and view switching.
 * @module app-main
 */

import { initializeAllEventHandlers } from './event-handlers/_init.js';
import { state, updateState } from './state.js';
import { refreshLedger } from './api.js';
import { loadAlertsPage } from './event-handlers/_alerts.js';
import { loadChartsPage } from './event-handlers/_charts.js'; // <-- Correct import
import { loadDailyReportPage } from './event-handlers/_dailyReport.js';
import { loadOrdersPage } from './event-handlers/_orders.js';
import { loadSnapshotsPage } from './event-handlers/_snapshots.js'; // <-- Correct import
import { renderTabs, styleActiveTab } from './ui/renderers/_tabs.js';
import { showToast } from './ui/helpers.js';

// ... (fetchInitialData remains unchanged)

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
                await loadChartsPage(); // <-- Use the new dedicated loader
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
                await loadSnapshotsPage(); // <-- Use the new dedicated loader
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

// ... (initializeApp and event listener remain unchanged)