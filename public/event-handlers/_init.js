// /public/event-handlers/_init.js
// Version 0.1.19
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

/**
 * Initializes all event handlers for the application.
 */
export function initializeAllEventHandlers() {
    initializeNavigationHandlers();
    initializeModalHandlers();
    initializeOrdersHandlers();
    initializeLedgerHandlers();
    initializeSnapshotsHandlers();
    initializeAlertsHandlers();
    initializeDailyReportHandlers();
    initializeSettingsHandlers();
    initializeImportHandlers();
    initializeChartsHandlers();
}