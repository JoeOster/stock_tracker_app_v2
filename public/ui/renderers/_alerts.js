// Portfolio Tracker V3.03
// in public/ui/renderers/_alerts.js
import { state } from '../../state.js';
import { showToast } from '../helpers.js';

/**
 * Renders the alerts table from a given array of alert data.
 * This function no longer fetches its own data.
 * @param {any[]} alerts - An array of notification objects to render.
 * @returns {void}
 */
export function renderAlertsPage(alerts) {
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#alerts-table tbody'));
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear previous content

    // Update the global state with the new data.
    state.activeAlerts = alerts;

    if (alerts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">You have no new alerts.</td></tr>';
        return;
    }

    // Build and append a row for each alert.
    alerts.forEach(alert => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${new Date(alert.created_at).toLocaleString()}</td>
            <td>${alert.message}</td>
            <td class="actions-cell">
                <button class="alert-yes-btn" data-notification-id="${alert.id}" data-pending-order-id="${alert.pending_order_id}">Yes, it Filled</button>
                <button class="alert-no-btn delete-btn" data-notification-id="${alert.id}">No, Dismiss</button>
                <button class="alert-pending-btn" data-notification-id="${alert.id}">Review Later</button>
            </td>
        `;
    });
}