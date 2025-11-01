// /public/event-handlers/_navigation.js
/**
 * @file Handles main navigation logic, including tab switching and the global account filter.
 * @module event-handlers/_navigation
 */

import { state, updateState } from '../state.js';
import { renderTabs } from '../ui/renderers/_tabs.js';
import { showToast } from '../ui/helpers.js';
import { loadDailyReportPage } from './_dailyReport.js';
import { loadOrdersPage } from './_orders.js';
import { loadAlertsPage } from './_alerts.js';
import { loadChartsPage } from './_charts.js';
import { refreshLedger } from '../api/transactions-api.js';
import { loadResearchPage } from './_research.js';
import { loadDashboardPage } from './_dashboard_loader.js';
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { loadWatchlistPage } from './_watchlist.js'; 

/**
 * Autosizes a <select> element based on the width of its selected option.
 * @param {HTMLSelectElement} selectElement - The select element to autosize.
 * @returns {void}
 */
export function autosizeAccountSelector(selectElement) {
    // ... (this function remains unchanged) ...
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
 * Always reloads content for the 'sources' tab or if the target container isn't visible.
 * @async
 * @param {string} viewType - The type of view to switch to.
 * @param {string|null} [viewValue=null] - The value associated with the view (e.g., date).
 * @returns {Promise<void>}
 */
export async function switchView(viewType, viewValue = null) {
    // ... (this function remains unchanged) ...
    console.log(`[Navigation] Attempting switch view to: ${viewType} ${viewValue || ''}`);

    const previousViewType = state.currentView.type;
    const isSameViewType = state.currentView.type === viewType;
    const isSameViewValue = state.currentView.value === viewValue;
    const isSameView = isSameViewType && isSameViewValue;

    const containerIdMap = {
        'dashboard': 'dashboard-page-container', 'ledger': 'ledger-page-container',
        'orders': 'orders-page-container', 'alerts': 'alerts-page-container',
        'imports': 'imports-page-container', 'charts': 'charts-container',
        'date': 'daily-report-container', 
        'watchlist': 'watchlist-page-container',
        'sources': 'research-page-container'
    };
    
    // @ts-ignore
    const finalContainerId = containerIdMap[viewType] || `${viewType}-page-container`;
    const targetPageContainer = document.getElementById(finalContainerId);

    const isTargetVisible = targetPageContainer?.style.display === 'block';

    if (isSameView && isTargetVisible && viewType !== 'sources') {
        console.log(`[Navigation] View is the same (${viewType}) and visible, skipping reload.`);
        return;
    }

    console.log(`[Navigation] Proceeding with view switch/load for ${viewType}.`);

    if (previousViewType === 'orders' && viewType !== 'orders' && state.prefillOrderFromSource) {
        console.log("[Navigation] Navigating away from Orders, clearing prefill state.");
        updateState({ prefillOrderFromSource: null });
    }

    updateState({ currentView: { type: viewType, value: viewValue } });
    renderTabs(state.currentView);

    document.querySelectorAll('.page-container').forEach(c => (/** @type {HTMLElement} */(c)).style.display = 'none');

    if (targetPageContainer) {
        targetPageContainer.style.display = 'block';
        console.log(`[Navigation] Displaying container: #${finalContainerId}`);
    } else {
        console.warn(`[Navigation] Could not find page container with ID: ${finalContainerId}`);
        showToast(`UI Error: Could not find content area for ${viewType}.`, 'error');
        return;
    }

    try {
        console.log(`[Navigation] Loading data for view: ${viewType}`);
        switch (viewType) {
            case 'dashboard': await loadDashboardPage(); break;
            case 'date':
                if (viewValue) await loadDailyReportPage(viewValue);
                else console.warn("[Navigation] Date view selected without a date value.");
                break;
            case 'charts': await loadChartsPage(); break;
            case 'ledger': await refreshLedger(); break;
            case 'orders': await loadOrdersPage(); break;
            case 'alerts': await loadAlertsPage(); break;
            case 'sources': await loadResearchPage(); break;
            case 'imports': console.log("[Navigation] Imports tab selected."); break; 
            case 'watchlist': 
                console.log("[Navigation] Watchlist tab selected.");
                await loadWatchlistPage();
                break;
            default: console.warn(`[Navigation] No specific load function defined for view type: ${viewType}`);
        }
        console.log(`[Navigation] Finished loading data for view: ${viewType}`);
    } catch (error) {
        console.error(`[Navigation] Error loading data for view ${viewType}:`, error);
        // @ts-ignore
        showToast(`Failed to load ${viewType} page: ${error instanceof Error ? error.message : String(error)}`, 'error');
        if (targetPageContainer) {
            targetPageContainer.innerHTML = `<p style="color: var(--negative-color); text-align: center; padding: 2rem;">Error loading page data.</p>`;
        }
    }
}

/**
 * Initializes all core navigation event handlers (tabs, global filter).
 * @returns {void}
 */
export function initializeNavigationHandlers() {
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));

    // Global Account Holder Filter Change
    if (globalHolderFilter) {
        globalHolderFilter.addEventListener('change', async (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            const currentType = state.currentView.type;
            const currentValue = state.currentView.value;
            const newHolderId = target.value;
            
            updateState({ selectedAccountHolderId: newHolderId });
            
            // --- THIS IS THE FIX ---
            // Toggle read-only class on the entire body
            if (newHolderId === 'all') {
                document.body.classList.add('read-only');
            } else {
                document.body.classList.remove('read-only');
            }
            // --- END FIX ---
            
            await fetchAndStoreAdviceSources(); 
            populateAllAdviceSourceDropdowns(); 

            await switchView(currentType, currentValue);
            autosizeAccountSelector(target);
        });
    }

    // Main Tab Clicks
    if (tabsContainer) {
        // ... (this listener remains unchanged) ...
        tabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const tabElement = target.closest('.master-tab');
            
            if (tabElement instanceof HTMLElement) { 
                const viewType = tabElement.dataset.viewType;
                const viewValue = tabElement.dataset.viewValue || null;
                if (viewType) {
                    switchView(viewType, viewValue);
                }
            }
        });
    }

    // Custom Date Picker
    if (customDatePicker) {
        // ... (this listener remains unchanged) ...
        customDatePicker.addEventListener('change', (e) => {
            const selectedDate = (/** @type {HTMLInputElement} */ (e.target)).value;
            if (selectedDate) {
                // @ts-ignore
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
}