const state = {
    // User and settings
    accountHolders: [],
    selectedAccountHolderId: null,
    settings: {},

    // Page-specific data
    dashboard: {
        positions: [],
        summary: {},
    },
    ledger: {
        transactions: [],
        filters: {},
    },
    watchlist: {
        ideas: [],
        real: [],
        watched: [],
    },
    sources: {
        sources: [],
        techniques: [],
    },
    orders: {
        pending: [],
        executed: [],
    },
    alerts: {
        alerts: [],
    },
    imports: {
        files: [],
        data: [],
    },

    // Shared data
    prices: {},

    // UI state
    prefillOrderFromSource: null,
};

export default state;