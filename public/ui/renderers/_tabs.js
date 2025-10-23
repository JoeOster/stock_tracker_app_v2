// /public/ui/renderers/_tabs.js
// Version Updated (Renamed Orders Tab)
/**
 * @file Renderer for the main navigation tabs.
 * @module renderers/_tabs
 */
import { getTradingDays, getActivePersistentDates } from '../datetime.js';

// MODIFIED: Renamed 'New Orders' to 'Orders'
export const staticTabs = [
    { viewType: 'dashboard', textContent: 'Dashboard' },
    { viewType: 'journal', textContent: 'Journal' },
    { viewType: 'ledger', textContent: 'Ledger' },
    { viewType: 'orders', textContent: 'Orders' }, // <-- Renamed
    { viewType: 'alerts', textContent: 'Alerts' },
    { viewType: 'snapshots', textContent: 'Snapshots' },
    { viewType: 'imports', textContent: 'Imports' },
    { viewType: 'charts', textContent: 'Charts' },
];
// END MODIFICATION

/**
 * Sets the 'active' class on the currently selected tab.
 * @param {{type: string, value: string|null}} currentView - The current view state.
 */
export function styleActiveTab(currentView) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        const htmlTab = /** @type {HTMLElement} */ (tab);

        const typeMatch = htmlTab.dataset.viewType === currentView.type;

        const isStaticTab = htmlTab.dataset.viewValue === undefined;
        const isStaticView = currentView.value === null;

        const valueMatch = (isStaticTab && isStaticView) || (htmlTab.dataset.viewValue === currentView.value);

        if (typeMatch && valueMatch) {
            htmlTab.classList.add('active');
        } else {
            htmlTab.classList.remove('active');
        }
    });
}


/**
 * Renders the main navigation tabs, including dynamic date tabs and static tabs.
 * @param {{type: string, value: string|null}} currentView - An object representing the current active view.
 */
export function renderTabs(currentView) {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = ''; // Clear existing tabs

    // --- Dynamic Date Tabs ---
    const tradingDays = getTradingDays();
    const activePersistentDates = getActivePersistentDates();
    const allDates = [...new Set([...tradingDays, ...activePersistentDates])].sort();

    allDates.forEach(day => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = 'date';
        tab.dataset.viewValue = day;
        // Format date as MM/DD
        tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        tabsContainer.appendChild(tab);
    });

    // --- Static View Tabs ---
    staticTabs.forEach(tabInfo => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = tabInfo.viewType;
        tab.textContent = tabInfo.textContent;
        tabsContainer.appendChild(tab);
    });

    // Apply the 'active' style to the correct tab
    styleActiveTab(currentView);
}