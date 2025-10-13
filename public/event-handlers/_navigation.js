// Portfolio Tracker V3.0.5
// public/event-handlers/_navigation.js
import { state } from '../state.js';
import { updateAllPrices } from '../api.js';
import { renderTabs } from '../ui/renderers.js'; // FIX: Add missing import
import { loadDailyReportPage } from './_dailyReport.js';
import { loadChartsAndSnapshotsPage } from './_snapshots.js';
import { loadOrdersPage } from './_orders.js';
import { loadAlertsPage } from './_alerts.js';
import { refreshLedger } from '../api.js';


/**
 * Autosizes an HTMLSelectElement to fit the width of its currently selected option's text.
 * A temporary span is used to measure the text width accurately.
 * @param {HTMLSelectElement} selectElement The dropdown element to resize.
 * @returns {void}
 */
// FIX: Add 'export' to the function declaration
export function autosizeAccountSelector(selectElement) {
    if (!selectElement || selectElement.options.length === 0) return;

    // Create a temporary, invisible span to measure the text width.
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre'; // Prevent text wrapping
    tempSpan.style.fontSize = window.getComputedStyle(selectElement).fontSize;
    tempSpan.textContent = selectElement.options[selectElement.selectedIndex].text || 'All Accounts';
    document.body.appendChild(tempSpan);

    // Set the select element's width to the measured text width plus some padding.
    selectElement.style.width = `${tempSpan.offsetWidth + 30}px`;
    document.body.removeChild(tempSpan);
}

/**
 * Switches the main view of the application, rendering the appropriate page.
 * @param {string} viewType - The type of view to switch to (e.g., 'date', 'charts').
 * @param {string|null} viewValue - The value associated with the view (e.g., a specific date).
 * @returns {Promise<void>}
 */
export async function switchView(viewType, viewValue) {
    state.currentView = { type: viewType, value: viewValue };
    renderTabs(state.currentView);
    (/** @type {HTMLSelectElement} */(document.getElementById('global-account-holder-filter'))).value = state.selectedAccountHolderId;

    document.querySelectorAll('.page-container').forEach(/** @param {HTMLElement} c */ c => c.style.display = 'none');

    const containerIdMap = {
        'ledger': 'ledger-page-container',
        'orders': 'orders-page-container',
        'alerts': 'alerts-page-container',
        'snapshots': 'snapshots-page-container',
        'imports': 'imports-page-container',
        'charts': 'charts-container',
        'date': 'daily-report-container'
    };

    const finalContainerId = containerIdMap[viewType] || `${viewType}-container`;
    const pageContainer = document.getElementById(finalContainerId);

    if (pageContainer) {
        pageContainer.style.display = 'block';
    }

    if (viewType === 'date') {
        await loadDailyReportPage(viewValue);
    } else if (viewType === 'charts' || viewType === 'snapshots') {
        await loadChartsAndSnapshotsPage(viewType);
    } else if (viewType === 'ledger') {
        await refreshLedger();
    } else if (viewType === 'orders') {
        await loadOrdersPage();
    } else if (viewType === 'alerts') {
        await loadAlertsPage();
    }
}


/**
 * Initializes all event listeners related to main application navigation.
 * This includes the tab container, global account filter, and custom date picker.
 * @returns {void}
 */
export function initializeNavigationHandlers() {
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));
    const refreshBtn = document.getElementById('refresh-prices-btn');

    if (globalHolderFilter) {
        // Handle changes to the global account holder filter.
        globalHolderFilter.addEventListener('change', async (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            state.selectedAccountHolderId = target.value;
            // Refresh the current view to reflect the new account holder selection.
            await switchView(state.currentView.type, state.currentView.value);
            autosizeAccountSelector(target);
        });
    }

    if (tabsContainer) {
        // Handle clicks on the main navigation tabs.
        tabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('master-tab')) {
                const viewType = target.dataset.viewType;
                const viewValue = target.dataset.viewValue;
                if (viewType) {
                    switchView(viewType, viewValue || null);
                }
            }
        });
    }

    if (customDatePicker) {
        // Handle selection of a custom date, adding it to a persistent list.
        customDatePicker.addEventListener('change', (e) => {
            const selectedDate = (/** @type {HTMLInputElement} */ (e.target)).value;
            if (selectedDate) {
                let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
                const newDate = { date: selectedDate, added: Date.now() };
                // Ensure no duplicate dates exist.
                persistentDates = persistentDates.filter(d => d.date !== selectedDate);
                persistentDates.push(newDate);
                localStorage.setItem('persistentDates', JSON.stringify(persistentDates));
                // Switch the view to the newly selected date.
                switchView('date', selectedDate);
            }
        });
    }

    if(refreshBtn) {
        // Handle manual price refresh button clicks.
//        refreshBtn.addEventListener('click', () => 
//            updateAllPrices(state.activityMap, state.priceCache)
        refreshBtn.addEventListener('click', () => 
            updateAllPrices()
        );
    }
}