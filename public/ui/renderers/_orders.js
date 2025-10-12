// Portfolio Tracker V3.03
// public/ui/renderers/_orders.js
import { state } from '../../state.js'; // FIX: Corrected import path
import { formatQuantity, formatAccounting } from '../helpers.js';

/**
 * Renders the pending orders table from a given array of order data.
 * This function no longer fetches its own data.
 * @param {any[]} orders - An array of pending order objects to render.
 * @returns {void}
 */
export function renderOrdersPage(orders) {
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#pending-orders-table tbody'));
    if (!tableBody) return;

    // The 'loading' state will now be handled by the caller. This function just renders what it's given.
    tableBody.innerHTML = '';

    // Update the global state with the new data.
    state.pendingOrders = orders;

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
}