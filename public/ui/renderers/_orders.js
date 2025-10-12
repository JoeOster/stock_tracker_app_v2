// Portfolio Tracker V3.03
// public/ui/renderers/_orders.js
import { state } from '../../app-main.js';
import { formatQuantity, formatAccounting, showToast } from '../helpers.js';

/**
 * Fetches pending orders from the API and renders them into the pending orders table.
 * It handles loading states, empty states, and error states.
 * @returns {Promise<void>}
 */
export async function renderOrdersPage() {
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#pending-orders-table tbody'));
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7">Loading active orders...</td></tr>';
    state.pendingOrders = []; // Clear old data before fetching

    try {
        const response = await fetch(`/api/orders/pending?holder=${state.selectedAccountHolderId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch pending orders from the server.');
        }
        const orders = await response.json();
        state.pendingOrders = orders; // Save data to state for event listeners to use

        tableBody.innerHTML = ''; // Clear loading message

        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">You have no active pending orders.</td></tr>';
            return;
        }

        // Build and append a row for each pending order.
        orders.forEach(order => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${order.ticker}</td>
                <td>${order.exchange}</td>
                <td class="numeric">${formatQuantity(order.quantity)}</td>
                <td class="numeric">${formatAccounting(order.limit_price)}</td>
                <td>${order.expiration_date || 'GTC'}</td>
                <td>${order.created_date}</td>
                <td class="actions-cell">
                    <button class="fill-order-btn" data-id="${order.id}">Mark as Filled</button>
                    <button class="cancel-order-btn delete-btn" data-id="${order.id}">Cancel</button>
                </td>
            `;
        });
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="7">Error loading pending orders.</td></tr>`;
        showToast(error.message, 'error');
    }
}