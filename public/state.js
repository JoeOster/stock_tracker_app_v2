// Portfolio Tracker V3.03
// public/state.js

/* global Chart */

/**
 * @typedef {object} AppSettings
 * @property {number} takeProfitPercent - Default take profit percentage.
 * @property {number} stopLossPercent - Default stop loss percentage.
 * @property {number} marketHoursInterval - Price refresh interval during market hours (minutes).
 * @property {number} afterHoursInterval - Price refresh interval after hours (minutes).
 * @property {string} theme - The current color theme.
 * @property {string} font - The current font.
 * @property {string|null} defaultAccountHolderId - The default account holder to load on startup.
 * @property {number} notificationCooldown - Cooldown for price alerts in minutes.
 * @property {string} familyName - Custom name for the app title.
 */

/**
 * @typedef {object} AppState
 * @property {AppSettings} settings - Application settings.
 * @property {{type: string|null, value: string|null}} currentView - The current active view (e.g., { type: 'date', value: '2025-10-12' }).
 * @property {Map<string, object>} activityMap - A map of open positions for the current view, keyed by lot ID (e.g., 'lot-123').
 * @property {Map<string, number|string>} priceCache - A cache of recently fetched stock prices, keyed by ticker.
 * @property {any[]} allTransactions - All transactions for the selected account holder.
 * @property {any[]} allSnapshots - All account snapshots for the selected account holder.
 * @property {any[]} pendingOrders - All pending orders for the selected account holder.
 * @property {any[]} activeAlerts - All active alerts for the selected account holder.
 * @property {string} selectedAccountHolderId - The ID of the currently selected account holder.
 * @property {{column: string, direction: string}} ledgerSort - The current sorting for the ledger table.
 * @property {Chart|null} allTimeChart - Chart.js instance for the all-time chart.
 * @property {Chart|null} fiveDayChart - Chart.js instance for the five-day chart.
 * @property {Chart|null} dateRangeChart - Chart.js instance for the date-range chart.
 * @property {Chart|null} zoomedChart - Chart.js instance for the zoomed modal chart.
 * @property {any[]} allExchanges - All available exchanges from the database.
 * @property {any[]} allAccountHolders - All available account holders from the database.
 */

/**
 * The main state object for the application.
 * It is exported to be used as a singleton across all modules.
 * @type {AppState}
 */
export const state = {
    settings: {
        takeProfitPercent: 8,
        stopLossPercent: 8,
        marketHoursInterval: 2,
        afterHoursInterval: 15,
        theme: 'light',
        font: 'Inter',
        defaultAccountHolderId: null,
        notificationCooldown: 16,
        familyName: ''
    },
    currentView: { type: null, value: null },
    activityMap: new Map(),
    priceCache: new Map(),
    allTransactions: [],
    allSnapshots: [],
    pendingOrders: [],
    activeAlerts: [],
    selectedAccountHolderId: 'all',
    ledgerSort: { column: 'transaction_date', direction: 'desc' },
    allTimeChart: null, fiveDayChart: null, dateRangeChart: null, zoomedChart: null,
    allExchanges: [],
    allAccountHolders: [],
};