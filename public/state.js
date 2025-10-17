// /public/state.js
// Version 0.1.9
/**
 * @file Manages the application's global state.
 * @module state
 */

/**
 * @typedef {object} AppState
 * @property {Array<object>} transactions - All transactions for the selected account.
 * @property {Array<object>} openOrders - All open orders (buy transactions with remaining quantity).
 * @property {Array<object>} allSnapshots - All historical portfolio snapshots.
 * @property {Array<object>} activeAlerts - All unread notifications.
 * @property {Array<object>} allAccountHolders - All account holders in the system.
 * @property {Array<object>} allExchanges - All exchanges in the system.
 * @property {string|number} selectedAccountHolderId - The ID of the currently selected account holder.
 * @property {{type: string, value: string|null}} currentView - The current active view.
 * @property {Map<string, {price: number|string, timestamp: number}>} priceCache - A cache for recently fetched stock prices.
 * @property {import('chart.js').Chart | null} allTimeChart - The instance of the 'All Time' chart.
 * @property {import('chart.js').Chart | null} fiveDayChart - The instance of the 'Five Day' chart.
 * @property {import('chart.js').Chart | null} dateRangeChart - The instance of the 'Date Range' chart.
 * @property {import('chart.js').Chart | null} zoomedChart - The instance of the zoomed-in chart.
 * @property {Map<string, object>} activityMap - A map of open positions for the current daily view.
 * @property {object} ledgerSort - The current sort state for the transaction ledger.
 * @property {any[]} pendingOrders - All active pending orders.
 * @property {object} settings - The user's application settings.
 */

/**
 * The application's global state object.
 * @type {AppState}
 */
export let state = {
    transactions: [],
    openOrders: [],
    allSnapshots: [],
    activeAlerts: [],
    allAccountHolders: [],
    allExchanges: [],
    selectedAccountHolderId: 1,
    currentView: { type: 'charts', value: null },
    priceCache: new Map(),
    allTimeChart: null,
    fiveDayChart: null,
    dateRangeChart: null,
    zoomedChart: null,
    activityMap: new Map(),
    ledgerSort: { column: 'transaction_date', direction: 'desc' },
    pendingOrders: [],
    settings: {},
};

/**
 * Updates the global state by merging in a partial state object.
 * @param {Partial<AppState>} newState - An object containing the state properties to update.
 */
export function updateState(newState) {
    state = { ...state, ...newState };
}