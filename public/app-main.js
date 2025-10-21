// /public/app-main.js
// Version Updated (Default view logic changed to Dashboard)
/**
 * @file Main application entry point. Handles initialization, state management,
 * and view switching.
 * @module app-main
 */

import { initializeAllEventHandlers } from './event-handlers/_init.js';
import { showToast } from './ui/helpers.js';
import { switchView, autosizeAccountSelector } from './event-handlers/_navigation.js';
import { fetchAndRenderExchanges, fetchAndPopulateAccountHolders } from './event-handlers/_settings.js';
import { applyAppearanceSettings } from './ui/settings.js';
import { state } from './state.js';
import { initializeScheduler } from './scheduler.js';


/**
 * Initializes the application after the DOM is fully loaded.
 */
async function initialize() {
    // Load settings from localStorage first
    try {
        const storedSettings = JSON.parse(localStorage.getItem('stockTrackerSettings')) || {};
        // Merge defaults with stored settings
        state.settings = {
            theme: 'light', font: 'Inter', takeProfitPercent: 10, stopLossPercent: 5, notificationCooldown: 15,
            defaultAccountHolderId: 1, familyName: '', marketHoursInterval: 2, afterHoursInterval: 15,
            defaultView: 'dashboard', numberOfDateTabs: 1, // <-- Updated defaultView, added numberOfDateTabs
            ...storedSettings // Overwrite defaults with stored values
        };
        applyAppearanceSettings();
    } catch (e) {
        console.error("[App Main] Error loading or applying settings:", e);
        // Reset to full defaults on error
        state.settings = {
            theme: 'light', font: 'Inter', takeProfitPercent: 10, stopLossPercent: 5, notificationCooldown: 15,
            defaultAccountHolderId: 1, familyName: '', marketHoursInterval: 2, afterHoursInterval: 15,
            defaultView: 'dashboard', numberOfDateTabs: 1 // <-- Updated defaultView, added numberOfDateTabs
        };
        applyAppearanceSettings();
    }

    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    if (!mainContent || !modalContainer) {
        console.error("[App Main] Fatal: Main content or modal container not found.");
        return;
    }

    try {
        const [
            alerts, charts, dailyReport, imports, ledger, modals, orders, snapshots, watchlist, journal, dashboard // <-- Added dashboard
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
            fetch('./templates/_journal.html').then(res => res.text()),
            fetch('./templates/_dashboard.html').then(res => res.text()), // <-- Fetch dashboard template
        ]);

        mainContent.innerHTML = dashboard + alerts + charts + dailyReport + imports + ledger + orders + snapshots + watchlist + journal; // <-- Added dashboard
        modalContainer.innerHTML = modals;

    } catch (error) {
        console.error("[App Main] Failed to load or inject one or more templates:", error);
        showToast('Error loading page templates. Please refresh.', 'error');
        return;
    }

    try {
        initializeAllEventHandlers();
    } catch(error) {
        console.error("[App Main] Error during initializeAllEventHandlers():", error);
        showToast('Error setting up page interactions. Please refresh.', 'error');
        return;
    }

    try {
        await Promise.all([
            fetchAndRenderExchanges(),
            fetchAndPopulateAccountHolders()
        ]);
    } catch (error) {
        console.error("[App Main] Error fetching initial global data:", error);
        showToast('Error loading account data. Some features may be limited.', 'error');
    }

    try {
        state.selectedAccountHolderId = state.settings.defaultAccountHolderId || 1;
        const globalFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
        if (globalFilter) {
            const optionExists = Array.from(globalFilter.options).some(opt => opt.value == state.selectedAccountHolderId);
            if (optionExists) {
                globalFilter.value = String(state.selectedAccountHolderId);
            } else {
                console.warn(`[App Main] Default holder ID ${state.selectedAccountHolderId} not found in dropdown, defaulting to 1.`);
                globalFilter.value = '1';
                state.selectedAccountHolderId = 1;
            }
           autosizeAccountSelector(globalFilter);
        } else {
            console.warn("[App Main] Global account holder filter dropdown not found.");
        }
    } catch (e) {
        console.error("[App Main] Error setting default account holder:", e);
    }

    try {
        initializeScheduler(state);
    } catch (e) {
        console.error("[App Main] Error initializing scheduler:", e);
    }

    const defaultViewType = state.settings.defaultView || 'dashboard'; // <-- Use dashboard as fallback
    try {
        await switchView(defaultViewType);
    } catch (error) {
        console.error(`[App Main] Error switching to default view (${defaultViewType}):`, error);
        showToast(`Failed to load default view (${defaultViewType}). Please try selecting a tab manually.`, 'error');
    }
}

// --- Application Entry Point ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}