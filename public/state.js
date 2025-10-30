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
 * @typedef {object} AppState
 * @property {Array<object>} transactions - All transactions for the selected account.
 * @property {Array<object>} openOrders - Deprecated? (Consider removing or clarifying usage)
 * @property {Array<object>} allSnapshots - All historical portfolio snapshots.
 * @property {Array<object>} activeAlerts - All unread notifications.
 * @property {Array<object>} allAccountHolders - All account holders in the system.
 * @property {Array<object>} allExchanges - All exchanges in the system.
 * @property {string|number} selectedAccountHolderId - The ID of the currently selected account holder ('all' or number).
 * @property {{type: string, value: string|null}} currentView - The current active view.
 * @property {Map<string, PriceData>} priceCache - A cache for recently fetched stock prices.
 * @property {import('chart.js').Chart | null} allTimeChart - The instance of the 'All Time' chart.
 * @property {import('chart.js').Chart | null} fiveDayChart - The instance of the 'Five Day' chart.
 * @property {import('chart.js').Chart | null} dateRangeChart - The instance of the 'Date Range' chart.
 * @property {import('chart.js').Chart | null} zoomedChart - The instance of the zoomed-in chart.
 * @property {Map<string, object>} activityMap - A map of open positions for the current daily view ('date' viewType).
 * @property {object} ledgerSort - The current sort state for the transaction ledger.
 * @property {string} ledgerSort.column - The column to sort by.
 * @property {'asc'|'desc'} ledgerSort.direction - The sort direction.
 * @property {any[]} pendingOrders - All active pending orders for the selected account.
 * @property {any[]} allAdviceSources - All advice sources for the selected account.
 * @property {JournalEntriesState | null} journalEntries - Holds fetched journal entries (open and closed).
 * @property {any[]} dashboardOpenLots - Raw array of open lots fetched for the dashboard view.
 * @property {any[]} researchWatchlistItems - Raw array of watchlist items fetched for the source details modal.
 * @property {{sourceId: string, sourceName: string, ticker: string, price: string}|null} prefillOrderFromSource - Temp state for pre-filling the order form.
 * @property {object} settings - The user's application settings.
 * @property {number} settings.takeProfitPercent
 * @property {number} settings.stopLossPercent
 * @property {string} settings.theme
 * @property {string} settings.font
 * @property {number} settings.notificationCooldown
 * @property {string} settings.familyName
 * @property {string|number|null} settings.defaultAccountHolderId
 * @property {number} settings.marketHoursInterval
 * @property {number} settings.afterHoursInterval
 * @property {string} [settings.defaultView]
 * @property {number} [settings.numberOfDateTabs]
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
    currentView: { type: 'dashboard', value: null },
    priceCache: new Map(),
    allTimeChart: null,
    fiveDayChart: null,
    dateRangeChart: null,
    zoomedChart: null,
    activityMap: new Map(),
    ledgerSort: { column: 'transaction_date', direction: 'desc' },
    pendingOrders: [],
    allAdviceSources: [],
    journalEntries: null,
    dashboardOpenLots: [],
    researchWatchlistItems: [],
    prefillOrderFromSource: null, // This line was already here
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
}