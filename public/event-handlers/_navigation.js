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
    selectElement.style.width = `${tempSpan.offsetWidth + 30}px`;
    document.body.removeChild(tempSpan);
}

/**
 * Switches the main view of the application, rendering the appropriate page.
 * @param {string} viewType - The type of view to switch to (e.g., 'date', 'charts', 'journal').
 * @param {string|null} [viewValue=null] - The value associated with the view (e.g., a specific date).
 */

/**
 * Initializes all event listeners related to main application navigation.
 */
export function initializeNavigationHandlers() {
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));
    const refreshBtn = document.getElementById('refresh-prices-btn');

    if (globalHolderFilter) {
        globalHolderFilter.addEventListener('change', async (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            state.selectedAccountHolderId = target.value;
            await switchView(state.currentView.type, state.currentView.value);
            autosizeAccountSelector(target);
        });
    }

    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('master-tab')) {
                const viewType = target.dataset.viewType;
                const viewValue = target.dataset.viewValue || null;
                if (viewType) {
                     if (viewType !== state.currentView.type || viewValue !== state.currentView.value) {
                        switchView(viewType, viewValue);
                     }
                }
            }
        });
    }

    if (customDatePicker) {
        customDatePicker.addEventListener('change', (e) => {
            const selectedDate = (/** @type {HTMLInputElement} */ (e.target)).value;
            if (selectedDate) {
                let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
                const newDate = { date: selectedDate, added: Date.now() };
                persistentDates = persistentDates.filter(d => d.date !== selectedDate);
                persistentDates.push(newDate);
                localStorage.setItem('persistentDates', JSON.stringify(persistentDates));

                switchView('date', selectedDate);
                customDatePicker.value = '';
            }
        });
    }

    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => {
             if (state.currentView.type === 'date' || state.currentView.type === 'journal') {
                 showToast('Refreshing prices...', 'info', 2000);
                 updateAllPrices(); // Assuming updateAllPrices exists in api.js
             }
        });
    }
}

// /public/event-handlers/_navigation.js
// Version Updated (Add Dashboard View)

// ... other imports ...
import { loadDashboardPage } from './_dashboard_loader.js';
// ... autosizeAccountSelector ...

export async function switchView(viewType, viewValue = null) {
    state.currentView = { type: viewType, value: viewValue };

    renderTabs(state.currentView); // Render tabs first

    // ... (global filter logic remains the same) ...

    document.querySelectorAll('.page-container').forEach(c => (/** @type {HTMLElement} */(c)).style.display = 'none');

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
        pageContainer.style.display = 'block';
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
            // ... (other cases remain the same) ...
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

