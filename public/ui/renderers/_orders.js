// /public/ui/renderers/_orders.js
// Version 0.1.5
/**
 * @file Renderer for the orders page.
 * @module renderers/_orders
 */

// FIX: Correct all relative import paths.
import { state } from '../../state.js';
import { formatQuantity, formatAccounting } from '../helpers.js';

/**
 * Renders the pending orders table from a given array of order data.
 * @param {any[]} orders - An array of pending order objects to render.
 * @returns {void}
 */
export function renderOpenOrders(orders) {
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#pending-orders-table tbody'));
    if (!tableBody) return;

    tableBody.innerHTML = '';

    state.pendingOrders = orders;

    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">You have no active pending orders.</td></tr>';
        return;
    }

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