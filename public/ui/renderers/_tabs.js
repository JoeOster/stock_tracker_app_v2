// /public/ui/renderers/_tabs.js
/**
 * @file Renderer for the main navigation tabs.
 * @module renderers/_tabs
 */
import { getTradingDays, getActivePersistentDates } from '../datetime.js';
import { state } from '../../state.js'; // --- ADDED: Import state ---

/**
 * @typedef {object} TabInfo
 * @property {string} viewType - The view type this tab navigates to.
 * @property {string} textContent - The display text for the tab.
 */

/**
 * The list of static (non-date) tabs.
 * @type {TabInfo[]}
 */
export const staticTabs = [
  { viewType: 'dashboard', textContent: 'Dashboard' },
  { viewType: 'sources', textContent: 'Sources' },
  { viewType: 'watchlist', textContent: 'Watchlist' },
  // --- REMOVED: { viewType: 'journal', textContent: 'Journal' }, ---
  { viewType: 'ledger', textContent: 'Ledger' },
  { viewType: 'orders', textContent: 'Orders' },
  { viewType: 'alerts', textContent: 'Alerts' },
  { viewType: 'imports', textContent: 'Imports' },
  // --- REMOVED: { viewType: 'charts', textContent: 'Charts' }, ---
];
// --- END MODIFICATION ---

/**
 * Sets the 'active' class on the currently selected tab.
 * @param {{type: string, value: string|null}} currentView - The current view state.
 * @returns {void}
 */
export function styleActiveTab(currentView) {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    const htmlTab = /** @type {HTMLElement} */ (tab);

    const typeMatch = htmlTab.dataset.viewType === currentView.type;

    const isStaticTab = htmlTab.dataset.viewValue === undefined;
    const isStaticView = currentView.value === null;

    const valueMatch =
      (isStaticTab && isStaticView) ||
      htmlTab.dataset.viewValue === currentView.value;

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
 * @returns {void}
 */
export function renderTabs(currentView) {
  const tabsContainer = document.getElementById('tabs-container');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = ''; // Clear existing tabs

  // --- Dynamic Date Tabs ---
  // --- MODIFIED: Use state.settings ---
  const tradingDays = getTradingDays(state.settings.numberOfDateTabs || 1);
  const activePersistentDates = getActivePersistentDates();
  // --- END MODIFIED ---
  const allDates = [
    ...new Set([...tradingDays, ...activePersistentDates]),
  ].sort();

  allDates.forEach((day) => {
    const tab = document.createElement('div');
    tab.className = 'tab master-tab';
    tab.dataset.viewType = 'date';
    tab.dataset.viewValue = day;
    // Format date as MM/DD
    tab.textContent = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });
    tabsContainer.appendChild(tab);
  });

  // --- Static View Tabs ---
  staticTabs.forEach((tabInfo) => {
    const tab = document.createElement('div');
    tab.className = 'tab master-tab';
    tab.dataset.viewType = tabInfo.viewType;
    tab.textContent = tabInfo.textContent;
    tabsContainer.appendChild(tab);
  });

  // Apply the 'active' style to the correct tab
  styleActiveTab(currentView);
}
