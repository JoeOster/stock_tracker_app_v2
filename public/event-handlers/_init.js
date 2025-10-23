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
// Updated: Import specific handlers for modals
import { initializeModalHandlers } from './_modals.js';
import { initializeNavigationHandlers } from './_navigation.js';
import { initializeOrdersHandlers } from './_orders.js';
import { initializeSettingsModalHandlers } from './_settings_modal.js';
import { initializeExchangeManagementHandlers } from './_settings_exchanges.js';
import { initializeHolderManagementHandlers } from './_settings_holders.js';
import { initializeJournalSettingsHandlers } from './_journal_settings.js';
import { initializeSnapshotsHandlers } from './_snapshots.js';
import { initializeJournalHandlers } from './_journal.js';
import { initializeDashboardHandlers } from './_dashboard.js';

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
        initializeSnapshotsHandlers();
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