// /public/event-handlers/_orders_table.js
/**
 * @file Initializes event handlers for the "Open Limit Orders" table on the Orders page.
 * @module event-handlers/_orders_table
 */

import { state } from '../state.js';
import { switchView } from './_navigation.js';
import {
  showConfirmationModal,
  showToast,
  sortTableByColumn,
} from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting } from '../ui/formatters.js';

/**
 * Initializes event listeners for the "Open Limit Orders" table.
 * @returns {void}
 */
export function initializeOrdersTableHandlers() {
  const pendingOrdersTable = document.getElementById('pending-orders-table');

  if (pendingOrdersTable) {
    // --- Table Header Sorting ---
    const thead = pendingOrdersTable.querySelector('thead');
    if (thead) {
      thead.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const th = /** @type {HTMLTableCellElement} */ (
          target.closest('th[data-sort]')
        );
        if (th) {
          const tbody = /** @type {HTMLTableSectionElement} */ (
            pendingOrdersTable.querySelector('tbody')
          );
          if (tbody) {
            sortTableByColumn(th, tbody);
          }
        }
      });
    }

    // --- Action Button Clicks (Delegated) ---
    pendingOrdersTable.addEventListener('click', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const cancelButton = /** @type {HTMLElement} */ (
        target.closest('.cancel-order-btn')
      );
      const fillButton = /** @type {HTMLElement} */ (
        target.closest('.fill-order-btn')
      );

      if (cancelButton) {
        // Cancel logic
        const orderId = cancelButton.dataset.id;
        if (!orderId) return;
        showConfirmationModal(
          'Cancel Order?',
          'This will change the order status to CANCELLED.',
          async () => {
            try {
              const response = await fetch(`/api/orders/pending/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' }),
              });
              if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Server error');
              }
              showToast('Order cancelled.', 'success');
              await switchView('orders', null);
            } catch (error) {
              const err = /** @type {Error} */ (error);
              showToast(`Error cancelling order: ${err.message}`, 'error');
            }
          }
        );
      } else if (fillButton) {
        // Fill logic
        const orderId = fillButton.dataset.id;
        if (!orderId) return;
        const order = state.pendingOrders.find((o) => String(o.id) === orderId);
        if (!order) {
          showToast('Could not find order details to fill.', 'error');
          return;
        }
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-pending-order-id')
        ).value = String(order.id);
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-account-holder-id')
        ).value = String(order.account_holder_id);
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-ticker')
        ).value = order.ticker;
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-exchange')
        ).value = order.exchange;
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-quantity')
        ).value = String(order.quantity);
        document.getElementById('fill-ticker-display').textContent =
          order.ticker;
        document.getElementById('fill-limit-price-display').textContent =
          formatAccounting(order.limit_price);
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-execution-price')
        ).value = String(order.limit_price);
        /** @type {HTMLInputElement} */ (
          document.getElementById('fill-execution-date')
        ).value = getCurrentESTDateString();

        const confirmFillModal = document.getElementById('confirm-fill-modal');
        if (confirmFillModal) {
          confirmFillModal.classList.add('visible');
        } else {
          console.error('[Orders Event] Confirm fill modal not found!');
          showToast('UI Error: Could not display confirmation.', 'error');
        }
      }
    });
  } else {
    console.error(
      '[Orders Init] Could not find #pending-orders-table element to attach listener.'
    );
  }
}
