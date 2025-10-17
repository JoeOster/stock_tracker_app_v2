// /public/event-handlers/_charts.js
// Version 0.1.17
/**
 * @file Initializes all event handlers for the Charts page.
 * @module event-handlers/_charts
 */
import { renderChartsPage } from '../ui/renderers/_charts.js';

/**
 * Loads and renders all components for the charts page.
 */
export async function loadChartsPage() {
    // This function just triggers the main renderer, which now handles its own data fetching.
    await renderChartsPage();
}

/**
 * Initializes all event listeners for the Charts page.
 */
export function initializeChartsHandlers() {
    const chartStartDate = /** @type {HTMLInputElement} */ (document.getElementById('chart-start-date'));
    const chartEndDate = /** @type {HTMLInputElement} */ (document.getElementById('chart-end-date'));
    const plStartDate = /** @type {HTMLInputElement} */ (document.getElementById('pl-start-date'));
    const plEndDate = /** @type {HTMLInputElement} */ (document.getElementById('pl-end-date'));

    // Re-render all charts and tables when the date range changes.
    if (chartStartDate) chartStartDate.addEventListener('change', renderChartsPage);
    if (chartEndDate) chartEndDate.addEventListener('change', renderChartsPage);
    if (plStartDate) plStartDate.addEventListener('change', renderChartsPage);
    if (plEndDate) plEndDate.addEventListener('change', renderChartsPage);
}