/**
 * @file Orchestrates the initialization of all page-specific event handlers.
 * @module event-handlers/_init
 */

import { initializeDashboardHandlers } from './dashboard.js';
// import { initializeOrdersHandlers } from './orders.js'; // Example for other pages
// import { initializeLedgerHandlers } from './ledger.js'; // Example for other pages

/**
 * Initializes all event handlers for the application.
 * This function is called once the DOM is loaded and templates are injected.
 * It uses a setTimeout to ensure all elements are rendered before attaching handlers.
 */
export function initializeAllEventHandlers() {
  console.log('[initializeAllEventHandlers] Initializing all page handlers...');
  // Use setTimeout to ensure DOM is fully ready and painted before attaching complex handlers
  setTimeout(() => {
    initializeDashboardHandlers();
    // initializeOrdersHandlers(); // Uncomment and import as needed
    // initializeLedgerHandlers(); // Uncomment and import as needed
    console.log('[initializeAllEventHandlers] All page handlers initialized.');
  }, 200); // Increased delay to ensure DOM is ready
}
