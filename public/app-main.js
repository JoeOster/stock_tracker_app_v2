// /public/app-main.js
// Version 0.1.20
/**
 * @file Main application entry point. Handles initialization, state management,
 * and view switching.
 * @module app-main
 */

import { initializeAllEventHandlers } from './event-handlers/_init.js';
import { showToast } from './ui/helpers.js';
import { switchView } from './event-handlers/_navigation.js';

/**
 * Initializes the application after the DOM is fully loaded.
 * It fetches all necessary HTML templates, injects them into the main page,
 * initializes all event handlers, and then loads the default view.
 */
async function initialize() {
    console.log("DOM fully loaded and parsed");

    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    if (!mainContent || !modalContainer) {
        console.error("Fatal: Main content or modal container not found.");
        return;
    }

    try {
        // Fetch all page and modal templates in parallel.
        const [
            alerts, charts, dailyReport, imports, ledger, modals, orders, snapshots, watchlist
        ] = await Promise.all([
            fetch('./templates/_alerts.html').then(res => res.text()),
            fetch('./templates/_charts.html').then(res => res.text()),
            fetch('./templates/_dailyReport.html').then(res => res.text()),
            fetch('./templates/_imports.html').then(res => res.text()),
            fetch('./templates/_ledger.html').then(res => res.text()),
            fetch('./templates/_modals.html').then(res => res.text()),
            fetch('./templates/_orders.html').then(res => res.text()),
            fetch('./templates/_snapshots.html').then(res => res.text()),
            fetch('./templates/_watchlist.html').then(res => res.text()),
        ]);
        
        // Inject the templates into the DOM.
        mainContent.innerHTML = alerts + charts + dailyReport + imports + ledger + orders + snapshots + watchlist;
        modalContainer.innerHTML = modals;
        console.log("All templates loaded successfully.");

    } catch (error) {
        console.error("Failed to load one or more templates:", error);
        showToast('Error loading page templates. Please refresh.', 'error');
        return;
    }

    // Now that templates are in the DOM, initialize all event handlers.
    initializeAllEventHandlers();

    // Load the default 'charts' view to start the application.
    await switchView('charts');
}


// --- Application Entry Point ---
// Waits for the DOM to be fully loaded before initializing the application.
document.addEventListener('DOMContentLoaded', initialize);