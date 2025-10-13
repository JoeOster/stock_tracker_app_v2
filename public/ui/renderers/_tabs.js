// public/ui/renderers/_tabs.js
import { getTradingDays, getActivePersistentDates } from '../helpers.js';

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
    const chartsTab = document.createElement('div');
    chartsTab.className = 'tab master-tab';
    chartsTab.dataset.viewType = 'charts';
    chartsTab.textContent = 'Charts';
    if (currentView.type === 'charts') chartsTab.classList.add('active');
    tabsContainer.appendChild(chartsTab);

    const ledgerTab = document.createElement('div');
    ledgerTab.className = 'tab master-tab';
    ledgerTab.dataset.viewType = 'ledger';
    ledgerTab.textContent = 'Ledger';
    if (currentView.type === 'ledger') ledgerTab.classList.add('active');
    tabsContainer.appendChild(ledgerTab);

    const ordersTab = document.createElement('div');
    ordersTab.className = 'tab master-tab';
    ordersTab.dataset.viewType = 'orders';
    ordersTab.textContent = 'New Orders';
    if (currentView.type === 'orders') ordersTab.classList.add('active');
    tabsContainer.appendChild(ordersTab);
    
    const alertsTab = document.createElement('div');
    alertsTab.className = 'tab master-tab';
    alertsTab.dataset.viewType = 'alerts';
    alertsTab.textContent = 'Alerts';
    if (currentView.type === 'alerts') alertsTab.classList.add('active');
    tabsContainer.appendChild(alertsTab);

    const snapshotsTab = document.createElement('div');
    snapshotsTab.className = 'tab master-tab';
    snapshotsTab.dataset.viewType = 'snapshots';
    snapshotsTab.textContent = 'Snapshots';
    if (currentView.type === 'snapshots') snapshotsTab.classList.add('active');
    tabsContainer.appendChild(snapshotsTab);
}
    // FIX: Add the new Imports tab
    const importsTab = document.createElement('div');
    importsTab.className = 'tab master-tab';
    importsTab.dataset.viewType = 'imports';
    importsTab.textContent = 'Imports';
    if (currentView.type === 'imports') importsTab.classList.add('active');
    tabsContainer.appendChild(importsTab);