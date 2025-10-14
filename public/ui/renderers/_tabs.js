// public/ui/renderers/_tabs.js
import { getTradingDays, getActivePersistentDates } from '../helpers.js';

// FIX: Define and export the list of static tabs to be used by the test file.
export const staticTabs = [
    { viewType: 'charts', textContent: 'Charts' },
    { viewType: 'ledger', textContent: 'Ledger' },
    { viewType: 'orders', textContent: 'New Orders' },
    { viewType: 'alerts', textContent: 'Alerts' },
    { viewType: 'snapshots', textContent: 'Snapshots' },
    { viewType: 'imports', textContent: 'Imports' }
];

/**
 * Renders the main navigation tabs, including static tabs and dynamic date-based tabs.
 * It highlights the currently active tab based on the application's state.
 * @param {{type: string, value: string}} currentView - An object representing the current active view.
 * @returns {void}
 */
export function renderTabs(currentView) {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';

    // --- Dynamic Date Tabs ---
    const tradingDays = getTradingDays(6);
    const activePersistentDates = getActivePersistentDates();
    // Combine and deduplicate recent trading days and any user-selected persistent dates.
    const allDates = [...new Set([...tradingDays, ...activePersistentDates])].sort();

    allDates.forEach(day => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = 'date';
        tab.dataset.viewValue = day;
        tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        if (day === currentView.value && currentView.type === 'date') { tab.classList.add('active'); }
        tabsContainer.appendChild(tab);
    });

    // --- Static Application Tabs ---
    // FIX: Loop through the exported array to create the static tabs.
    staticTabs.forEach(tabInfo => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = tabInfo.viewType;
        tab.textContent = tabInfo.textContent;
        if (currentView.type === tabInfo.viewType) {
            tab.classList.add('active');
        }
        tabsContainer.appendChild(tab);
    });
}