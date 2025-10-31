// /public/app-main.js
/**
 * @file Main application entry point. Handles initialization, state management,
 * and view switching.
 * @module app-main
 */
import { initializeAllEventHandlers } from './event-handlers/_init.js';
import { showToast } from './ui/helpers.js';
import { switchView, autosizeAccountSelector } from './event-handlers/_navigation.js';
import { fetchAndPopulateAccountHolders } from './event-handlers/_settings_holders.js';
import { fetchAndRenderExchanges } from './event-handlers/_settings_exchanges.js';
import { fetchAndStoreAdviceSources } from './event-handlers/_journal_settings.js';
import { populateAllAdviceSourceDropdowns } from './ui/dropdowns.js';
import { applyAppearanceSettings } from './ui/settings.js';
import { state, updateState } from './state.js'; // Import updateState
import { initializeScheduler } from './scheduler.js';

/**
 * Initializes the application after the DOM is fully loaded.
 * Fetches HTML templates, sets up initial state, populates dropdowns,
 * initializes event handlers, and navigates to the default view.
 * @async
 * @returns {Promise<void>}
 */
async function initialize() {
    console.log("[App Main] Initializing application...");
    // --- Settings Loading ---
    try {
        const storedSettings = JSON.parse(localStorage.getItem('stockTrackerSettings')) || {};
        // Merge defaults with stored settings
        const newSettings = {
            theme: 'light', font: 'Inter', takeProfitPercent: 10, stopLossPercent: 5, notificationCooldown: 15,
            defaultAccountHolderId: 1, familyName: '', marketHoursInterval: 2, afterHoursInterval: 15,
            defaultView: 'dashboard', numberOfDateTabs: 1, // Ensure defaults exist
            ...storedSettings
        };
        updateState({ settings: newSettings }); // Use updateState
        console.log("[App Main] Loaded settings:", state.settings);
        applyAppearanceSettings();
    } catch (e) {
        console.error("[App Main] Error loading or applying settings:", e);
        // Fallback to defaults if loading fails
        updateState({
            settings: {
                theme: 'light', font: 'Inter', takeProfitPercent: 10, stopLossPercent: 5, notificationCooldown: 15,
                defaultAccountHolderId: 1, familyName: '', marketHoursInterval: 2, afterHoursInterval: 15,
                defaultView: 'dashboard', numberOfDateTabs: 1
            }
        });
        applyAppearanceSettings();
    }


    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    if (!mainContent || !modalContainer) {
        console.error("[App Main] Fatal: Main content or modal container not found.");
        return;
    }

    console.log("[App Main] Fetching HTML templates...");
    
    // --- FIX: Add a cache-busting query string ---
    const cacheBust = '?v=3.0.9'; // Use the same version as your script
    // --- END FIX ---

    try {
        // Fetch all templates concurrently
        const [
            alerts, charts, dailyReport, imports, ledger, orders, watchlist,
            research, dashboard,
            // Modal templates
            modal_advice, modal_settings, modal_edit_transaction, modal_confirm,
            modal_sell_from_position, modal_confirm_fill, modal_chart_zoom,
            modal_sales_history,
            modal_selective_sell,
            modal_manage_position,
            modal_source_details,
            modal_image_zoom // --- ADDED ---
        ] = await Promise.all([
            // Page fetches
            fetch('./templates/_alerts.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_alerts.html: ${res.statusText}`)),
            fetch('./templates/_charts.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_charts.html: ${res.statusText}`)),
            fetch('./templates/_dailyReport.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_dailyReport.html: ${res.statusText}`)),
            fetch('./templates/_imports.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_imports.html: ${res.statusText}`)),
            fetch('./templates/_ledger.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_ledger.html: ${res.statusText}`)),
            fetch('./templates/_orders.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_orders.html: ${res.statusText}`)),
            fetch('./templates/_watchlist.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_watchlist.html: ${res.statusText}`)),
            fetch('./templates/_research.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_research.html: ${res.statusText}`)),
            fetch('./templates/_dashboard.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_dashboard.html: ${res.statusText}`)),
            // Modal fetches
            fetch('./templates/_modal_advice.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_advice.html: ${res.statusText}`)),
            fetch('./templates/_modal_settings.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_settings.html: ${res.statusText}`)),
            fetch('./templates/_modal_edit_transaction.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_edit_transaction.html: ${res.statusText}`)),
            fetch('./templates/_modal_confirm.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_confirm.html: ${res.statusText}`)),
            fetch('./templates/_modal_sell_from_position.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_sell_from_position.html: ${res.statusText}`)),
            fetch('./templates/_modal_confirm_fill.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_confirm_fill.html: ${res.statusText}`)),
            fetch('./templates/_modal_chart_zoom.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_chart_zoom.html: ${res.statusText}`)),
            fetch('./templates/_modal_sales_history.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_sales_history.html: ${res.statusText}`)),
            fetch('./templates/_modal_selective_sell.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_selective_sell.html: ${res.statusText}`)),
            fetch('./templates/_modal_manage_position.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_manage_position.html: ${res.statusText}`)),
            fetch('./templates/_modal_source_details.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_source_details.html: ${res.statusText}`)),
            fetch('./templates/_modal_image_zoom.html' + cacheBust).then(res => res.ok ? res.text() : Promise.reject(`_modal_image_zoom.html: ${res.statusText}`)) // --- ADDED ---
       ]);

        // Inject page templates
        mainContent.innerHTML = dashboard + alerts + charts + dailyReport + imports + ledger + orders + watchlist + research;
        console.log("[App Main] Page templates injected.");

        // Inject concatenated modal templates
        modalContainer.innerHTML =
            modal_settings +
            modal_edit_transaction +
            modal_confirm +
            modal_sell_from_position +
            modal_advice +
            modal_confirm_fill +
            modal_chart_zoom +
            modal_sales_history +
            modal_selective_sell +
            modal_manage_position +
            modal_source_details +
            modal_image_zoom; // --- ADDED ---
        console.log("[App Main] Modal templates injected.");

    } catch (error) {
        console.error("[App Main] Failed to load or inject one or more templates:", error);
        showToast(`Error loading UI templates (${error}). Please refresh.`, 'error', 30000);
        return; // Stop initialization if templates fail
    }

     // --- Initialize event handlers ---
    try {
        console.log("[App Main] Initializing all event handlers...");
        initializeAllEventHandlers(); // This now calls page-specific handlers via setTimeout
    } catch(error) {
        console.error("[App Main] Error during initializeAllEventHandlers():", error);
        showToast('Error setting up page interactions. Please refresh.', 'error');
        return;
    }

    // --- Fetch initial global data ---
     console.log("[App Main] Fetching initial global data (holders, exchanges)...");
     try {
        await Promise.all([
            fetchAndRenderExchanges(),
            fetchAndPopulateAccountHolders()
        ]);
        console.log("[App Main] Initial global data fetched.");
    } catch (error) {
        console.error("[App Main] Error fetching initial global data:", error);
        // Continue, but show error
        showToast('Error loading account data. Some features may be limited.', 'error');
    }

    // --- Set default account holder in UI ---
    try {
        console.log("[App Main] Setting default account holder...");
        // Ensure defaultAccountHolderId is treated as a number if it's not 'all'
        let defaultHolderIdSetting = state.settings.defaultAccountHolderId;
        let defaultHolderId = 1; // Fallback to Primary

        // Check if setting is a string representation of a number
        if (typeof defaultHolderIdSetting === 'string' && !isNaN(parseInt(defaultHolderIdSetting))) {
            defaultHolderId = parseInt(defaultHolderIdSetting);
        } else if (typeof defaultHolderIdSetting === 'number') {
             defaultHolderId = defaultHolderIdSetting;
        }

        // Validate the ID exists in the fetched list, otherwise default to 1
        const holderExists = state.allAccountHolders.some(h => h.id === defaultHolderId);
        if (!holderExists && defaultHolderId !== 1) {
             console.warn(`[App Main] Default holder ID ${defaultHolderId} from settings not found, defaulting to 1 (Primary).`);
             defaultHolderId = 1;
        }

        updateState({ selectedAccountHolderId: defaultHolderId }); // Set state


        const globalFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
        if (globalFilter) {
            // Check if the option *value* exists (comparing strings)
            const optionExists = Array.from(globalFilter.options).some(opt => opt.value === String(state.selectedAccountHolderId));
            if (optionExists) {
                globalFilter.value = String(state.selectedAccountHolderId);
                console.log(`[App Main] Set global filter to ID: ${globalFilter.value}`);
            } else {
                // This case should ideally not happen if validation above works, but as a fallback:
                console.warn(`[App Main] Option for holder ID ${state.selectedAccountHolderId} not found in dropdown, setting to 1.`);
                globalFilter.value = '1';
                updateState({ selectedAccountHolderId: 1 }); // Ensure state matches UI
            }
           autosizeAccountSelector(globalFilter); // Adjust width
        } else {
            console.warn("[App Main] Global account holder filter dropdown not found.");
        }
    } catch (e) {
        console.error("[App Main] Error setting default account holder:", e);
        updateState({ selectedAccountHolderId: 1 }); // Fallback
        const globalFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
        if (globalFilter) globalFilter.value = '1'; // Try to set fallback in UI too
    }

    // --- Fetch initial Advice Sources for default holder ---
    try {
        console.log(`[App Main] Fetching initial advice sources for default holder: ${state.selectedAccountHolderId}`);
        await fetchAndStoreAdviceSources(); // Fetches using the new default state.selectedAccountHolderId
        populateAllAdviceSourceDropdowns(); // Populates all '.advice-source-select' dropdowns
        console.log("[App Main] Initial advice sources populated.");
    } catch (error) {
         console.error("[App Main] Error fetching initial advice sources:", error);
         showToast('Error loading advice sources for dropdowns.', 'error');
    }


    // --- Initialize scheduler ---
    try {
        console.log("[App Main] Initializing scheduler...");
        initializeScheduler(state);
    } catch (e) {
        console.error("[App Main] Error initializing scheduler:", e);
    }

    // --- Switch to the default view ---
    const defaultViewType = state.settings.defaultView || 'dashboard';
    console.log(`[App Main] Switching to default view: ${defaultViewType}`);
    // Use setTimeout to allow DOM painting and event loop to clear before initial load
    setTimeout(async () => {
        try {
            await switchView(defaultViewType);
            console.log(`[App Main] Successfully switched to default view: ${defaultViewType}`);
        } catch (error) {
            console.error(`[App Main] Error switching to default view (${defaultViewType}):`, error);
            showToast(`Failed to load default view (${defaultViewType}). Please try selecting a tab manually.`, 'error');
            // Attempt fallback to dashboard if default fails and wasn't dashboard
            if (defaultViewType !== 'dashboard') {
                 console.log("[App Main] Attempting fallback to dashboard view...");
                 try { await switchView('dashboard'); } catch (fallbackError) {
                      console.error("[App Main] Fallback to dashboard view also failed:", fallbackError);
                      // Display a more persistent error message if everything fails
                      mainContent.innerHTML = `<p style="color: red; text-align: center; padding: 2rem;">Error: Could not load the application interface.</p>`;
                 }
            }
        }
    }, 50); // Small delay
}


// --- Application Entry Point ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM is already ready, initialize directly
    initialize();
}