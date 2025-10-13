// public/event-handlers/_alerts.js
import { state } from '../state.js';
import { switchView } from './_navigation.js';
import { showToast } from '../ui/helpers.js';
import { fetchAlerts } from '../api.js';
import { renderAlertsPage } from '../ui/renderers.js';

/**
 * Loads data for the alerts page and triggers rendering.
 */
export async function loadAlertsPage() {
    const tableBody = document.querySelector('#alerts-table tbody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="3">Loading alerts...</td></tr>';
    try {
        const alerts = await fetchAlerts(state.selectedAccountHolderId);
        renderAlertsPage(alerts);
    } catch (error) {
        console.error("Failed to load alerts page:", error);
        showToast(error.message, 'error');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="3">Error loading alerts.</td></tr>';
        }
    }
}

/**
 * Initializes all event listeners for the Alerts page.
 */
export function initializeAlertsHandlers() {
    const alertsTable = document.getElementById('alerts-table');
    if (alertsTable) {
        alertsTable.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const yesButton = /** @type {HTMLElement} */ (target.closest('.alert-yes-btn'));
            const noButton = /** @type {HTMLElement} */ (target.closest('.alert-no-btn'));
            const pendingButton = /** @type {HTMLElement} */ (target.closest('.alert-pending-btn'));
            if (yesButton) {
                const pendingOrderId = yesButton.dataset.pendingOrderId;
                const fillButton = /** @type {HTMLElement} */ (document.querySelector(`.fill-order-btn[data-id="${pendingOrderId}"]`));
                if (fillButton) {
                    fillButton.click();
                } else {
                     showToast("Please go to the 'Orders' tab and click 'Mark as Filled' for this item.", 'info');
                }
            } 
            else if (noButton) {
                const notificationId = noButton.dataset.notificationId;
                try {
                    const response = await fetch(`/api/orders/notifications/${notificationId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'DISMISSED' })
                    });
                    if (!response.ok) throw new Error('Failed to dismiss alert.');
                    showToast('Alert dismissed.', 'info');
                    await switchView('alerts', null);
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
            else if (pendingButton) {
                const notificationId = pendingButton.dataset.notificationId;
                try {
                    const response = await fetch(`/api/orders/notifications/${notificationId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'PENDING' })
                    });
                    if (!response.ok) throw new Error('Failed to update alert.');
                    showToast('Alert marked for later review.', 'info');
                    await switchView('alerts', null);
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    }
}