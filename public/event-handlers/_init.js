// /public/event-handlers/_init.js
// Version Updated (Cleaned up logging)
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
import { initializeSettingsHandlers } from './_settings.js';
import { initializeSnapshotsHandlers } from './_snapshots.js';
import { initializeJournalSettingsHandlers } from './_journal_settings.js';
import { initializeJournalHandlers } from './_journal.js';
import { initializeJournalSubTabHandlers } from './_journal_tabs.js';
import { initializeJournalFilterHandlers } from './_journal_filters.js';
import { initializeDashboardHandlers } from './_dashboard.js'; // <-- Import dashboard initializer

/**
 * Initializes all event handlers for the application.
 */
export function initializeAllEventHandlers() {
    try {
        initializeNavigationHandlers();
        initializeModalHandlers();
        initializeOrdersHandlers();
        initializeLedgerHandlers();
        initializeSnapshotsHandlers();
        initializeAlertsHandlers();
        initializeDailyReportHandlers(); // Keep for date tab interactions
        initializeSettingsHandlers();
        initializeImportHandlers();
        initializeChartsHandlers();
        initializeJournalSettingsHandlers();
        initializeJournalSubTabHandlers();
        initializeJournalFilterHandlers();
        initializeJournalHandlers();
        initializeDashboardHandlers(); // <-- Initialize dashboard handlers

    } catch (error) {
        console.error("[Init] Error occurred INSIDE initializeAllEventHandlers:", error);
    }
}