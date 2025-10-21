// /public/ui/renderers/_tabs.js
// Version Updated (Added Dashboard Tab)
/**
 * @file Renderer for the main navigation tabs.
 * @module renderers/_tabs
 */
import { getTradingDays, getActivePersistentDates } from '../datetime.js';

// Add 'Dashboard' to the static tabs array and remove 'Charts' if Dashboard replaces its overview function
export const staticTabs = [
    { viewType: 'dashboard', textContent: 'Dashboard' }, // <-- Added Dashboard
    { viewType: 'journal', textContent: 'Journal' },
    { viewType: 'ledger', textContent: 'Ledger' },
    { viewType: 'orders', textContent: 'New Orders' },
    { viewType: 'alerts', textContent: 'Alerts' },
    { viewType: 'snapshots', textContent: 'Snapshots' },
    { viewType: 'imports', textContent: 'Imports' },
    { viewType: 'charts', textContent: 'Charts' }, // <-- Keep Charts for now, maybe remove later if Dashboard fully replaces its overview
    // { viewType: 'watchlist', textContent: 'Watchlist' } // Example if watchlist is added later
];

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
    const tradingDays = getTradingDays(); // Will now fetch only 1 day by default
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
        // data-view-value is intentionally left undefined for static tabs
        tab.textContent = tabInfo.textContent;
        tabsContainer.appendChild(tab);
    });

    // Apply the 'active' style to the correct tab
    styleActiveTab(currentView);
}