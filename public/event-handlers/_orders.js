// public/event-handlers/_orders.js
import { state } from '../../app-main.js';
import { formatAccounting, getCurrentESTDateString, showConfirmationModal, showToast } from '../ui/helpers.js';
import { renderOrdersPage, renderAlertsPage } from '../ui/renderers.js';

export function initializeOrdersHandlers() {
    const addPendingOrderForm = /** @type {HTMLFormElement} */ (document.getElementById('add-pending-order-form'));
    const pendingOrdersTable = document.getElementById('pending-orders-table');
    const confirmFillForm = /** @type {HTMLFormElement} */ (document.getElementById('confirm-fill-form'));
    const alertsTable = document.getElementById('alerts-table');

    if (addPendingOrderForm) {
        addPendingOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newOrder = {
                account_holder_id: (/** @type {HTMLSelectElement} */(document.getElementById('pending-order-account-holder'))).value,
                ticker: (/** @type {HTMLInputElement} */(document.getElementById('pending-order-ticker'))).value,
                exchange: (/** @type {HTMLSelectElement} */(document.getElementById('pending-order-exchange'))).value,
                quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('pending-order-quantity'))).value),
                limit_price: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('pending-order-limit-price'))).value),
                expiration_date: (/** @type {HTMLInputElement} */(document.getElementById('pending-order-expiration'))).value || null,
                created_date: getCurrentESTDateString(),
                order_type: 'BUY_LIMIT', // This is hardcoded for now
            };

            try {
                const response = await fetch('/api/orders/pending', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrder)
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Server error');
                }
                showToast('New buy limit order placed!', 'success');
                addPendingOrderForm.reset();
                
                if (state.currentView.type === 'orders') {
                    await renderOrdersPage();
                }
            } catch (error) {
                showToast(`Error placing order: ${error.message}`, 'error');
            }
        });
    }

    if (pendingOrdersTable) {
        pendingOrdersTable.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const cancelButton = /** @type {HTMLElement} */ (target.closest('.cancel-order-btn'));
            const fillButton = /** @type {HTMLElement} */ (target.closest('.fill-order-btn'));

            if (cancelButton) {
                const orderId = cancelButton.dataset.id;
                showConfirmationModal('Cancel Order?', 'This will change the order status to CANCELLED.', async () => {
                    try {
                        const response = await fetch(`/api/orders/pending/${orderId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'CANCELLED' })
                        });
                        if (!response.ok) {
                            const err = await response.json();
                            throw new Error(err.message || 'Server error');
                        }
                        showToast('Order cancelled.', 'success');
                        
                        await renderOrdersPage();
                    } catch (error) {
                        showToast(`Error cancelling order: ${error.message}`, 'error');
                    }
                });
            } 
            else if (fillButton) {
                const orderId = fillButton.dataset.id;
                const order = state.pendingOrders.find(o => o.id == orderId);

                if (!order) {
                    showToast('Could not find order details.', 'error');
                    return;
                }

                (/** @type {HTMLInputElement} */(document.getElementById('fill-pending-order-id'))).value = String(order.id);
                (/** @type {HTMLInputElement} */(document.getElementById('fill-account-holder-id'))).value = String(order.account_holder_id);
                (/** @type {HTMLInputElement} */(document.getElementById('fill-ticker'))).value = order.ticker;
                (/** @type {HTMLInputElement} */(document.getElementById('fill-exchange'))).value = order.exchange;
                (/** @type {HTMLInputElement} */(document.getElementById('fill-quantity'))).value = String(order.quantity);
                document.getElementById('fill-ticker-display').textContent = order.ticker;
                document.getElementById('fill-limit-price-display').textContent = formatAccounting(order.limit_price);
                
                (/** @type {HTMLInputElement} */(document.getElementById('fill-execution-price'))).value = String(order.limit_price);
                (/** @type {HTMLInputElement} */(document.getElementById('fill-execution-date'))).value = getCurrentESTDateString();

                document.getElementById('confirm-fill-modal').classList.add('visible');
            }
        });
    }

    if (confirmFillForm) {
        confirmFillForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = /** @type {HTMLButtonElement} */ (confirmFillForm.querySelector('button[type="submit"]'));
            submitButton.disabled = true;

            const pendingOrderId = (/** @type {HTMLInputElement} */(document.getElementById('fill-pending-order-id'))).value;

            const newTransaction = {
                account_holder_id: (/** @type {HTMLInputElement} */(document.getElementById('fill-account-holder-id'))).value,
                ticker: (/** @type {HTMLInputElement} */(document.getElementById('fill-ticker'))).value,
                exchange: (/** @type {HTMLInputElement} */(document.getElementById('fill-exchange'))).value,
                quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('fill-quantity'))).value),
                price: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('fill-execution-price'))).value),
                transaction_date: (/** @type {HTMLInputElement} */(document.getElementById('fill-execution-date'))).value,
                transaction_type: 'BUY'
            };
            
            try {
                const updateRes = await fetch(`/api/orders/pending/${pendingOrderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'FILLED' })
                });
                if (!updateRes.ok) {
                    const err = await updateRes.json();
                    throw new Error(err.message || 'Failed to update pending order status.');
                }

                const createRes = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTransaction)
                });
                if (!createRes.ok) {
                    const err = await createRes.json();
                    await fetch(`/api/orders/pending/${pendingOrderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'ACTIVE' })
                    });
                    throw new Error(err.message || 'Failed to create new transaction.');
                }

                document.getElementById('confirm-fill-modal').classList.remove('visible');
                showToast('Order filled and transaction logged!', 'success');
                
                await renderOrdersPage();

            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

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
                    await renderAlertsPage();
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
                    await renderAlertsPage();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    }
}