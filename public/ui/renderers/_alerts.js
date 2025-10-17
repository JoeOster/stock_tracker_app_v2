// /public/ui/renderers/_alerts.js
// Version 0.1.5
/**
 * @file Renderer for the alerts table.
 * @module renderers/_alerts
 */
import { state } from '../../state.js';

/**
 * Renders the alerts table from a given array of alert data.
 * @param {any[]} alerts - An array of notification objects to render.
 * @returns {void}
 */
export function renderAlerts(alerts) {
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#alerts-table tbody'));
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear previous content

    state.activeAlerts = alerts;

    if (alerts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">You have no new alerts.</td></tr>';
        return;
    }

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