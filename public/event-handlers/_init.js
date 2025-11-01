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
import { initializeSettingsModalHandlers } from './_settings_modal.js';
import { initializeExchangeManagementHandlers } from './_settings_exchanges.js';
import { initializeHolderManagementHandlers } from './_settings_holders.js';
import { initializeJournalSettingsHandlers } from './_journal_settings.js';
import { initializeResearchHandlers } from './_research.js';
import { initializeDashboardHandlers } from './_dashboard_init.js';
import { initializeWatchlistHandlers } from './_watchlist.js';
// --- REMOVED: Imports for _journal and _journal_tabs ---

/**
 * Initializes all event handlers for the application.
 * Uses setTimeout for page-specific handlers to ensure DOM elements from templates are ready.
 * @returns {void}
 */
export function initializeAllEventHandlers() {
    try {
        console.log("Initializing core event handlers (Navigation, Modals, Settings)...");

        initializeNavigationHandlers();
        initializeModalHandlers();
        initializeSettingsModalHandlers();
        
        // Defer page-specific handlers slightly
        setTimeout(() => {
            try {
                console.log("Initializing page-specific event handlers (Deferred)...");
                
                initializeExchangeManagementHandlers();
                initializeHolderManagementHandlers();
                initializeJournalSettingsHandlers(); // Handles Advice Sources in Settings

                initializeOrdersHandlers();
                initializeLedgerHandlers();
                initializeAlertsHandlers();
                initializeDailyReportHandlers();
                initializeImportHandlers();
                initializeChartsHandlers();
                initializeResearchHandlers(); // This is now for "Sources"
                initializeDashboardHandlers();
                initializeWatchlistHandlers();
                // --- REMOVED: initializeJournalHandlers() and initializeJournalSubTabHandlers() ---
                console.log("All event handlers initialized.");
            } catch (deferredError) {
                 console.error("[Init - Deferred] Error occurred during deferred handler initialization:", deferredError);
            }
        }, 0);

    } catch (error) {
        console.error("[Init - Immediate] Error occurred during immediate handler initialization:", error);
    }
}