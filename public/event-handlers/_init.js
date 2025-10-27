// /public/event-handlers/_init.js
/**
 * @file Initializes all event handlers for the application.
 * @module event-handlers/_init
 */

// ... (other imports remain the same) ...
// UPDATED: Import from _dashboard_init.js
import { initializeDashboardHandlers } from './_dashboard_init.js';

/**
 * Initializes all event handlers for the application.
 */
export function initializeAllEventHandlers() {
    try {
        console.log("Initializing all event handlers...");

        initializeNavigationHandlers();
        // initializeModalHandlers now includes selective sell init
        initializeModalHandlers();

        // Initialize Settings Modal Sections
        initializeSettingsModalHandlers();
        initializeExchangeManagementHandlers();
        initializeHolderManagementHandlers();
        initializeJournalSettingsHandlers();

        // Initialize Page-Specific Handlers
        initializeOrdersHandlers();
        initializeLedgerHandlers();
        initializeAlertsHandlers();
        initializeDailyReportHandlers();
        initializeImportHandlers();
        initializeChartsHandlers();
        initializeJournalHandlers();
        initializeDashboardHandlers(); // This now points to the function in _dashboard_init.js

        console.log("All event handlers initialized.");

    } catch (error) {
        console.error("[Init] Error occurred INSIDE initializeAllEventHandlers:", error);
    }
}