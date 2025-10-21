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
import { initializeNavigationHandlers } from './_navigation.js';
import { initializeOrdersHandlers } from './_orders.js';
// Removed: import { initializeSettingsHandlers } from './_settings.js'; // Old import
import { initializeSettingsModalHandlers } from './_settings_modal.js'; // New core modal logic
import { initializeExchangeManagementHandlers } from './_settings_exchanges.js'; // New exchange logic
import { initializeHolderManagementHandlers } from './_settings_holders.js'; // New holder logic
import { initializeJournalSettingsHandlers } from './_journal_settings.js'; // Handles Advice Sources
import { initializeSnapshotsHandlers } from './_snapshots.js';
import { initializeJournalHandlers } from './_journal.js';
// Removed redundant imports for journal tabs/filters if initializeJournalHandlers calls them
// import { initializeJournalSubTabHandlers } from './_journal_tabs.js';
// import { initializeJournalFilterHandlers } from './_journal_filters.js';
import { initializeDashboardHandlers } from './_dashboard.js';

/**
 * Initializes all event handlers for the application.
 */
export function initializeAllEventHandlers() {
    try {
        console.log("Initializing all event handlers..."); // Add log

        initializeNavigationHandlers();
        initializeModalHandlers(); // Handles general modals (Edit, Confirm, Sell, Advice, Fill)

        // Initialize Settings Modal Sections
        initializeSettingsModalHandlers();    // Core modal, main tabs, general, appearance
        initializeExchangeManagementHandlers(); // Data -> Exchanges
        initializeHolderManagementHandlers();   // Data -> Account Holders
        initializeJournalSettingsHandlers();  // Data -> Advice Sources (from its own file)

        // Initialize Page-Specific Handlers
        initializeOrdersHandlers();
        initializeLedgerHandlers();
        initializeSnapshotsHandlers();
        initializeAlertsHandlers();
        initializeDailyReportHandlers(); // Keep for date tab interactions if any remain
        initializeImportHandlers();
        initializeChartsHandlers();
        initializeJournalHandlers(); // Includes Journal tabs/filters initialization within it
        initializeDashboardHandlers();

        console.log("All event handlers initialized."); // Add log

    } catch (error) {
        console.error("[Init] Error occurred INSIDE initializeAllEventHandlers:", error);
    }
}