// /public/event-handlers/_init.js
/**
 * @file Initializes all event handlers for the application.
 * @module event-handlers/_init
 */

import { initializeAlertsHandlers } from './_alerts.js';
import { initializeChartsHandlers } from './_charts.js';
import { initializeDailyReportHandlers } from './_dailyReport.js';
import { initializeImportHandlers } from './_imports.js';
import { initializeLedgerHandlers } from './_ledger.js';
import { initializeModalHandlers } from './_modals.js';
// Correctly import initializeNavigationHandlers
import { initializeNavigationHandlers } from './_navigation.js'; // <<< ENSURE THIS LINE IS PRESENT AND CORRECT
import { initializeOrdersHandlers } from './_orders.js';
import { initializeSettingsModalHandlers } from './_settings_modal.js';
import { initializeExchangeManagementHandlers } from './_settings_exchanges.js';
import { initializeHolderManagementHandlers } from './_settings_holders.js';
import { initializeJournalSettingsHandlers } from './_journal_settings.js';
import { initializeJournalHandlers } from './_journal.js';
// Import from the new dashboard init file
import { initializeDashboardHandlers } from './_dashboard_init.js';

/**
 * Initializes all event handlers for the application.
 */
export function initializeAllEventHandlers() {
    try {
        console.log("Initializing all event handlers...");

        initializeNavigationHandlers(); // Now it should be defined
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
        initializeDashboardHandlers();

        console.log("All event handlers initialized.");

    } catch (error) {
        console.error("[Init] Error occurred INSIDE initializeAllEventHandlers:", error);
    }
}