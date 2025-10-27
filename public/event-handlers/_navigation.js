// /public/event-handlers/_navigation.js
// Version 0.1.27 (Cleaned up logging)
/**
 * @file Manages the primary navigation and view switching for the application.
 * @module event-handlers/_navigation
 */
import { state } from '../state.js';
import { updateAllPrices, refreshLedger } from '../api.js';
import { renderTabs } from '../ui/renderers/_tabs.js';
import { showToast } from '../ui/helpers.js';
import { loadDailyReportPage } from './_dailyReport.js';
import { loadOrdersPage } from './_orders.js';
import { loadAlertsPage } from './_alerts.js';
import { loadChartsPage } from './_charts.js';
import { loadJournalPage } from './_journal.js';
// Import dashboard loader
import { loadDashboardPage } from './_dashboard_loader.js'; // <-- Updated import

/**
 * Autosizes an HTMLSelectElement to fit the width of its currently selected option's text.
 * @param {HTMLSelectElement} selectElement The dropdown element to resize.
 */
export function autosizeAccountSelector(selectElement) {
    if (!selectElement || selectElement.options.length === 0) return;

    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre';
    const style = window.getComputedStyle(selectElement);
    tempSpan.style.fontSize = style.fontSize;
    tempSpan.style.fontFamily = style.fontFamily;
    tempSpan.style.fontWeight = style.fontWeight;
    tempSpan.style.letterSpacing = style.letterSpacing;
    tempSpan.textContent = selectElement.options[selectElement.selectedIndex]?.text || 'All Accounts';

    document.body.appendChild(tempSpan);
    selectElement.style.width = `${tempSpan.offsetWidth + 30}px`; // Add padding for arrow
    document.body.removeChild(tempSpan);
}

/**
 * Switches the main view of the application, rendering the appropriate page.
 * @param {string} viewType - The type of view to switch to (e.g., 'date', 'charts', 'journal').
 * @param {string|null} [viewValue=null] - The value associated with the view (e.g., a specific date).
 */
export async function switchView(viewType, viewValue = null) {
    state.currentView = { type: viewType, value: viewValue };

    renderTabs(state.currentView); // Render tabs first

    // Hide all page containers
    document.querySelectorAll('.page-container').forEach(c => (/** @type {HTMLElement} */(c)).style.display = 'none');

    // Map view types to container IDs
    const containerIdMap = {
        'dashboard': 'dashboard-page-container', // <-- Add dashboard mapping
        'ledger': 'ledger-page-container',
        'orders': 'orders-page-container',
        'alerts': 'alerts-page-container',
        'imports': 'imports-page-container',
        'charts': 'charts-container',
        'date': 'daily-report-container',
        'watchlist': 'watchlist-page-container',
        'journal': 'journal-page-container'
    };

    const finalContainerId = containerIdMap[viewType] || `${viewType}-page-container`; // Fallback just in case
    const pageContainer = document.getElementById(finalContainerId);

    if (pageContainer) {
        pageContainer.style.display = 'block'; // Show the correct container
    } else {
        console.warn(`Could not find page container with ID: ${finalContainerId}`);
    }

    // --- Load data specific to the view ---
    try {
        switch (viewType) {
            case 'dashboard': // <-- Add case for dashboard
                await loadDashboardPage();
                break;
            case 'date':
                if (viewValue) await loadDailyReportPage(viewValue);
                break;
            case 'charts':
                await loadChartsPage();
                break;
            case 'ledger':
                await refreshLedger();
                break;
            case 'orders':
                await loadOrdersPage();
                break;
            case 'alerts':
                await loadAlertsPage();
                break;
            case 'journal':
                await loadJournalPage();
                break;
            case 'imports':
                // No specific load action needed, template is static until interaction
                break;
             case 'watchlist':
                 // No specific load action needed yet
                 break;
             default:
                 console.warn(`No specific load function defined for view type: ${viewType}`);
        }
    } catch(error) {
         console.error(`Error loading data for view ${viewType}:`, error);
         showToast(`Failed to load ${viewType} page: ${error.message}`, 'error');
         if(pageContainer) {
             // Display error within the page container if possible
             pageContainer.innerHTML = `<p style="color: var(--negative-color); text-align: center;">Error loading page data.</p>`;
         }
    }
}


/**
 * Initializes all event listeners related to main application navigation.
 */
export function initializeNavigationHandlers() {
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));
    const refreshBtn = document.getElementById('refresh-prices-btn'); // Assuming this ID exists for a global refresh

    // Global Account Holder Filter Change
    if (globalHolderFilter) {
        globalHolderFilter.addEventListener('change', async (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            state.selectedAccountHolderId = target.value;
            // Reload the current view with the new account holder context
            await switchView(state.currentView.type, state.currentView.value);
            autosizeAccountSelector(target); // Resize dropdown after content changes
        });
    }

    // Main Tab Clicks
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            // Ensure the click is directly on a tab or its content, and it has the necessary data attributes
            const tabElement = target.closest('.master-tab');
            if (tabElement instanceof HTMLElement) { // Check if it's an HTMLElement
                const viewType = tabElement.dataset.viewType;
                const viewValue = tabElement.dataset.viewValue || null;
                if (viewType) {
                    // Switch view only if it's different from the current one
                     if (viewType !== state.currentView.type || viewValue !== state.currentView.value) {
                        switchView(viewType, viewValue);
                     }
                }
            }
        });
    }

    // Custom Date Picker for adding date tabs
    if (customDatePicker) {
        customDatePicker.addEventListener('change', (e) => {
            const selectedDate = (/** @type {HTMLInputElement} */ (e.target)).value;
            if (selectedDate) {
                // Persist the selected date in localStorage
                let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
                const newDate = { date: selectedDate, added: Date.now() };
                // Remove existing entry for the same date before adding the new one (updates timestamp)
                persistentDates = persistentDates.filter(d => d.date !== selectedDate);
                persistentDates.push(newDate);
                localStorage.setItem('persistentDates', JSON.stringify(persistentDates));

                // Switch view to the newly selected date
                switchView('date', selectedDate);
                customDatePicker.value = ''; // Clear picker after selection
            }
        });
    }

    // Global Price Refresh Button (if applicable to the current view)
    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => {
             // Only refresh prices if the current view actually uses live prices
             // Adjusted logic: refresh button might be specific to daily/dashboard, handled there?
             // Or, updateAllPrices can internally check the current view.
             // Let's assume updateAllPrices handles the view check.
             updateAllPrices();
        });
    }
}