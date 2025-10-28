// /public/event-handlers/_navigation.js
// Version Updated (Handle 'research' viewType)
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
// ADDED: Import loadResearchPage
import { loadResearchPage } from './_research.js';
// Import dashboard loader
import { loadDashboardPage } from './_dashboard_loader.js'; // Keep dashboard loader

/**
 * Autosizes an HTMLSelectElement to fit the width of its currently selected option's text.
 * @param {HTMLSelectElement} selectElement The dropdown element to resize.
 * @returns {void}
 */
export function autosizeAccountSelector(selectElement) {
    // ... function content remains the same ...
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
 * @param {string} viewType - The type of view to switch to (e.g., 'date', 'charts', 'research').
 * @param {string|null} [viewValue=null] - The value associated with the view (e.g., a specific date).
 * @returns {Promise<void>}
 */
export async function switchView(viewType, viewValue = null) {
    state.currentView = { type: viewType, value: viewValue };

    renderTabs(state.currentView); // Render tabs first

    // Hide all page containers
    document.querySelectorAll('.page-container').forEach(c => (/** @type {HTMLElement} */(c)).style.display = 'none');

    // Map view types to container IDs
    const containerIdMap = {
        'dashboard': 'dashboard-page-container',
        'ledger': 'ledger-page-container',
        'orders': 'orders-page-container',
        'alerts': 'alerts-page-container',
        'imports': 'imports-page-container',
        'charts': 'charts-container',
        'date': 'daily-report-container',
        'watchlist': 'watchlist-page-container',
        // ADDED: Mapping for research
        'research': 'research-page-container'
        // REMOVED: 'journal': 'journal-page-container'
    };

    // --- MODIFIED: Use correct container ID ---
    const finalContainerId = containerIdMap[viewType]; // Get ID from map
    const pageContainer = finalContainerId ? document.getElementById(finalContainerId) : null;
    // --- END MODIFICATION ---

    if (pageContainer) {
        pageContainer.style.display = 'block'; // Show the correct container
    } else {
        console.warn(`Could not find page container for view type: ${viewType}`); // Updated warning
    }

    // --- Load data specific to the view ---
    try {
        switch (viewType) {
            case 'dashboard':
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
            // ADDED: Case for research
            case 'research':
                await loadResearchPage(); // Use the existing research loader
                break;
            // REMOVED: Case for journal
            case 'imports':
                 // No specific load function needed for imports view itself
                break;
            case 'watchlist':
                 // TODO: Add loadWatchlistPage() if/when implemented
                break;
            default:
                console.warn(`No specific load function defined for view type: ${viewType}`);
        }
    } catch (error) {
        console.error(`Error loading data for view ${viewType}:`, error);
        showToast(`Failed to load ${viewType} page: ${error.message}`, 'error');
        if (pageContainer) {
            pageContainer.innerHTML = `<p style="color: var(--negative-color); text-align: center;">Error loading page data.</p>`;
        }
    }
}


/**
 * Initializes all event listeners related to main application navigation.
 * @returns {void}
 */
export function initializeNavigationHandlers() {
    // ... function content remains the same ...
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));
    const refreshBtn = document.getElementById('refresh-prices-btn'); // Assuming this ID exists for a global refresh

    // Global Account Holder Filter Change
    if (globalHolderFilter) {
        globalHolderFilter.addEventListener('change', async (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            state.selectedAccountHolderId = target.value === 'all' ? 'all' : parseInt(target.value, 10); // Store as 'all' or number
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
                let persistentDates = JSON.parse(localStorage.getItem('persistentDates') || '[]') || [];
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
             // updateAllPrices handles the view check internally.
             updateAllPrices();
        });
    }
}