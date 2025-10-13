// public/event-handlers/_init.js
import { initializeNavigationHandlers } from './_navigation.js';
import { initializeDailyReportHandlers } from './_dailyReport.js';
import { initializeLedgerHandlers } from './_ledger.js';
import { initializeOrdersHandlers } from './_orders.js';
import { initializeSnapshotsHandlers } from './_snapshots.js';
import { initializeModalHandlers } from './_modals.js';
import { initializeSettingsHandlers } from './_settings.js';
import { initializeAlertsHandlers } from './_alerts.js';
import { initializeImportHandlers } from './_imports.js';

export function initializeAllEventListeners() {
    initializeNavigationHandlers();
    initializeDailyReportHandlers();
    initializeLedgerHandlers();
    initializeOrdersHandlers();
    initializeSnapshotsHandlers();
    initializeModalHandlers();
    initializeSettingsHandlers();
    initializeAlertsHandlers();
    initializeImportHandlers();
}