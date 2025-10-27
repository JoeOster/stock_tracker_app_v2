// public/event-handlers/_dashboard_loader.js
/**
 * @file Contains the loader function for the dashboard page.
 * @module event-handlers/_dashboard_loader
 */

import { renderDashboardPage } from '../ui/renderers/_dashboard_renders';
/**
 * Loads data for the dashboard page (which triggers the renderer).
 */
export async function loadDashboardPage() {
    // Currently, this just calls the main renderer which handles its own data loading.
    // Kept separate for potential future pre-loading logic.
    await renderDashboardPage();
}