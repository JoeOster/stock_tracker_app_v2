// /public/state.js
/**
 * @file Manages the application's global state.
 * @module state
 */

/**
 * @typedef {object} JournalEntriesState
 * @property {any[]} openEntries - Array of open journal entries.
 * @property {any[]} closedEntries - Array of closed/executed/cancelled entries.
 */

/**
 * @typedef {object} PriceData
 * @property {number|string|null} price - The fetched price ('invalid', null, or number).
 * @property {number|null} previousPrice - The previous price, if available.
 * @property {number} timestamp - The timestamp when the price was fetched or retrieved from cache.
 */

/**
 * @typedef {object} AppSettings
 * @property {number} takeProfitPercent
 * @property {number} stopLossPercent
 * @property {string} theme
 * @property {string} font
 * @property {number} notificationCooldown
 * @property {string} familyName
 * @property {string|number|null} defaultAccountHolderId
 * @property {number} marketHoursInterval
 * @property {number} afterHoursInterval
 * @property {string} [defaultView]
 * @property {number} [numberOfDateTabs]
 */

// --- *** THIS IS THE FIX (Part 3) *** ---
/**
 * @typedef {object} PrefillOrderData
 * @property {string} sourceId
 * @property {string} sourceName
 * @property {string} ticker
 * @property {string} price
 * @property {string | null} tp1
 * @property {string | null} tp2
 * @property {string | null} sl
 * @property {string | null} journalId - The ID of the journal entry (technique) it came from.
 */
// --- *** END FIX *** ---

/**
 * @typedef {object} AppState
 * @property {Array<object>} transactions - All transactions for the selected account.
 * @property {Array<object>} openOrders - Deprecated? (Consider removing or clarifying usage)
 * @property {Array<object>} activeAlerts - All unread notifications.
 * @property {Array<object>} allAccountHolders - All account holders in the system.
 *Setting
 * @property {Array<object>} allExchanges - All exchanges in the system.
 * @property {string|number} selectedAccountHolderId - The ID of the currently selected account holder ('all' or number).
 * @property {{type: string, value: string|null}} currentView - The current active view.
 * @property {Map<string, PriceData>} priceCache - A cache for recently fetched stock prices.
 * @property {Map<string, object>} activityMap - A map of open positions for the current daily view ('date' viewType).
 * @property {object} ledgerSort - The current sort state for the transaction ledger.
 * @property {string} ledgerSort.column - The column to sort by.
 * @property {'asc'|'desc'} ledgerSort.direction - The sort direction.
 * @property {any[]} pendingOrders - All active pending orders for the selected account.
 * @property {any[]} allAdviceSources - All advice sources for the selected account.
 * @property {JournalEntriesState | null} journalEntries - Holds fetched journal entries (open and closed).
 * @property {any[]} dashboardOpenLots - Raw array of open lots fetched for the dashboard view.
 * @property {any[]} researchWatchlistItems - Raw array of watchlist items fetched for the source details modal.
 * @property {PrefillOrderData|null} prefillOrderFromSource - Temp state for pre-filling the order form.
 * @property {AppSettings} settings - The user's application settings.
 */

/**
 * The application's global state object.
 * @type {AppState}
 */
export let state = {
  transactions: [],
  openOrders: [],
  // REMOVED: allSnapshots: [],
  activeAlerts: [],
  allAccountHolders: [],
  allExchanges: [],
  selectedAccountHolderId: 1,
  currentView: { type: 'dashboard', value: null },
  priceCache: new Map(),
  // REMOVED: allTimeChart: null,
  // REMOVED: fiveDayChart: null,
  // REMOVED: dateRangeChart: null,
  // REMOVED: zoomedChart: null,
  activityMap: new Map(),
  ledgerSort: { column: 'transaction_date', direction: 'desc' },
  pendingOrders: [],
  allAdviceSources: [],
  journalEntries: null,
  dashboardOpenLots: [],
  dashboardOpenOrders: [],
  dashboardOpenOrders: [],
  researchWatchlistItems: [],
  prefillOrderFromSource: null,
  settings: {
    takeProfitPercent: 10,
    stopLossPercent: 5,
    theme: 'light',
    font: 'Inter',
    notificationCooldown: 15,
    familyName: '',
    defaultAccountHolderId: 1,
    marketHoursInterval: 2,
    afterHoursInterval: 15,
    defaultView: 'dashboard',
    numberOfDateTabs: 1,
  },
};

/**
 * Dispatches a custom event to notify listeners that the global state has been updated.
 * @returns {void}
 */
export function dispatchDataUpdate() {
  const event = new CustomEvent('dataUpdate');
  window.dispatchEvent(event);
}

/**
 * Updates the global state by merging in a partial state object.
 * @param {Partial<AppState>} newState - An object containing the state properties to update.
 * @returns {void}
 */
export function updateState(newState) {
  // Deep merge settings object if present in newState
  if (newState.settings && typeof newState.settings === 'object') {
    state.settings = { ...state.settings, ...newState.settings };
    // Avoid overwriting the whole settings object later
    delete newState.settings;
  }
  // Merge the rest of the state properties
  state = { ...state, ...newState };
  // console.log("State updated:", state); // Optional: log state changes
  dispatchDataUpdate(); // Notify listeners of state change
}
