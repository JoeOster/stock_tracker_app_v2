// public/event-handlers/_init.js
import { initializeNavigationHandlers } from './_navigation.js';
import { initializeDailyReportHandlers } from './_dailyReport.js';
import { initializeLedgerHandlers } from './_ledger.js';
import { initializeOrdersHandlers } from './_orders.js';
import { initializeSnapshotsHandlers } from './_snapshots.js';
import { initializeModalHandlers } from './_modals.js';
import { initializeSettingsHandlers } from './_settings.js';

/**
 * Initializes all event listeners for the entire application by calling
 * the initializer function from each specific event handler module.
 * This function is called once when the application starts.
 * @returns {void}
 */
export function initializeAllEventListeners() {
    initializeNavigationHandlers();
    initializeDailyReportHandlers();
    initializeLedgerHandlers();
    initializeOrdersHandlers();
    initializeSnapshotsHandlers();
    initializeModalHandlers();
    initializeSettingsHandlers();
}