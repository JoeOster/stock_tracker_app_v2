// /public/ui/renderers/_tabs.js
// Version 0.1.8
/**
 * @file Renderer for the main navigation tabs.
 * @module renderers/_tabs
 */
import { getTradingDays, getActivePersistentDates } from '../helpers.js';

export const staticTabs = [
    { viewType: 'charts', textContent: 'Charts' },
    { viewType: 'ledger', textContent: 'Ledger' },
    { viewType: 'orders', textContent: 'New Orders' },
    { viewType: 'alerts', textContent: 'Alerts' },
    { viewType: 'snapshots', textContent: 'Snapshots' },
    { viewType: 'imports', textContent: 'Imports' }
];

/**
 * Sets the 'active' class on the currently selected tab.
 * @param {{type: string, value: string}} currentView - The current view state.
 */
export function styleActiveTab(currentView) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        const htmlTab = /** @type {HTMLElement} */ (tab);
        if (htmlTab.dataset.viewType === currentView.type && htmlTab.dataset.viewValue === currentView.value) {
            htmlTab.classList.add('active');
        } else if (htmlTab.dataset.viewType === currentView.type && !currentView.value) {
            htmlTab.classList.add('active');
        } else {
            htmlTab.classList.remove('active');
        }
    });
}

/**
 * Renders the main navigation tabs.
 * @param {{type: string, value: string}} currentView - An object representing the current active view.
 */
export function renderTabs(currentView) {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';

    const tradingDays = getTradingDays(6);
    const activePersistentDates = getActivePersistentDates();
    const allDates = [...new Set([...tradingDays, ...activePersistentDates])].sort();

    allDates.forEach(day => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = 'date';
        tab.dataset.viewValue = day;
        tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        tabsContainer.appendChild(tab);
    });

    staticTabs.forEach(tabInfo => {
        const tab = document.createElement('div');
        tab.className = 'tab master-tab';
        tab.dataset.viewType = tabInfo.viewType;
        tab.textContent = tabInfo.textContent;
        tabsContainer.appendChild(tab);
    });

    styleActiveTab(currentView);
}