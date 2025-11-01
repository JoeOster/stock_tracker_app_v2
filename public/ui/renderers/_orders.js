// /public/ui/renderers/_orders.js
// Version 0.1.10 (Cleaned up logging)
/**
 * @file Renderer for the orders page.
 * @module renderers/_orders
 */

import { state } from '../../state.js';
import { formatQuantity, formatAccounting } from '../formatters.js';

// console.log("[Orders Render Module] _orders.js renderer loaded."); // Removed log

/**
 * Renders the pending orders table from a given array of order data.
 * @param {any[]} orders - An array of pending order objects to render.
 * @returns {void}
 */
export function renderOpenOrders(orders) {
    // console.log("[Orders Render] Rendering open orders table..."); // Removed log
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#pending-orders-table tbody'));
    if (!tableBody) {
        console.error("[Orders Render] Could not find table body for pending orders."); // Keep error log
        return;
    }

    tableBody.innerHTML = '';

    if (state) {
        state.pendingOrders = orders;
    } else {
        console.warn("[Orders Render] State object not found during render."); // Keep warning
    }

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">You have no active pending orders.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = tableBody.insertRow();
        // Use optional chaining and nullish coalescing for safety
        const orderId = order?.id ?? `unknown_id_${Math.random()}`;
        const ticker = order?.ticker ?? 'N/A';
        const exchange = order?.exchange ?? 'N/A';
        const quantity = order?.quantity !== undefined ? formatQuantity(order.quantity) : '--';
        const limitPrice = order?.limit_price !== undefined ? formatAccounting(order.limit_price) : '--';
        const expirationDate = order?.expiration_date ?? 'GTC';
        const createdDate = order?.created_date ?? 'N/A';

        row.innerHTML = `
            <td>${ticker}</td>
            <td>${exchange}</td>
            <td class="numeric">${quantity}</td>
            <td class="numeric">${limitPrice}</td>
            <td>${expirationDate}</td>
            <td>${createdDate}</td>
            <td class="actions-cell">
                <button class="fill-order-btn" data-id="${orderId}">Mark as Filled</button>
                <button class="cancel-order-btn delete-btn" data-id="${orderId}">Cancel</button>
            </td>
        `;
    });

}