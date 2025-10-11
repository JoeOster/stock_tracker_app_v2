// in public/ui/renderers/_alerts.js
import { state } from '../../app-main.js';
import { showToast } from '../helpers.js';

export async function renderAlertsPage() {
    const tableBody = document.querySelector('#alerts-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="3">Loading alerts...</td></tr>';
    state.activeAlerts = []; // Clear old data

    try {
        // CORRECTED URL:
        const response = await fetch(`/api/orders/notifications?holder=${state.selectedAccountHolderId}`);
        if (!response.ok) throw new Error('Failed to fetch alerts.');
        
        const alerts = await response.json();
        state.activeAlerts = alerts; // Save to state for event listeners
        tableBody.innerHTML = '';

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
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="3">Error loading alerts.</td></tr>`;
        showToast(error.message, 'error');
    }
}