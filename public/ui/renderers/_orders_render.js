// public/ui/renderers/_orders_render.js
/**
 * @file UI rendering functions for the Orders page.
 * @module ui/renderers/_orders_render
 */

import { state } from '../../state.js';
import { formatAccounting, formatDate } from '../formatters.js';

/**
 * Generates the HTML for a single pending order table row.
 * @param {object} order - The pending order object.
 * @returns {string} The HTML string for the table row.
 */
function createPendingOrderTableRowHTML(order) {
  const isExpired = order.expiration_date && new Date(order.expiration_date) < new Date();
  const rowClass = isExpired ? 'expired-order' : '';
  return `
    <tr class="${rowClass}">
      <td class="col-ticker">${order.ticker}</td>
      <td class="col-exchange">${order.exchange}</td>
      <td class="numeric col-qty">${order.quantity}</td>
      <td class="numeric col-price">${formatAccounting(order.limit_price)}</td>
      <td class="col-date">${order.expiration_date ? formatDate(order.expiration_date) : 'N/A'}</td>
      <td class="col-date">${formatDate(order.created_date)}</td>
      <td class="center-align col-actions-lg">
        <button class="button-sm button-green fill-pending-order" data-order-id="${order.id}">Fill</button>
        <button class="button-sm button-red cancel-pending-order" data-order-id="${order.id}">Cancel</button>
      </td>
    </tr>
  `;
}

/**
 * Renders the pending orders table.
 * @param {any[]} pendingOrders - An array of pending order objects.
 */
export function renderPendingOrdersTable(pendingOrders) {
  const tableBody = document.getElementById('pending-orders-tbody');
  if (!tableBody) {
    console.error('Pending orders table body not found.');
    return;
  }

  if (pendingOrders.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7">No open limit orders.</td></tr>';
    return;
  }

  tableBody.innerHTML = pendingOrders.map(createPendingOrderTableRowHTML).join('');
}
