// /public/event-handlers/_orders.js
// Version 0.1.6
/**
 * @file Initializes all event handlers for the Orders page.
 * @module event-handlers/_orders
 */

import { state } from '../state.js';
import { refreshLedger, fetchPendingOrders } from '../api.js';
import { switchView } from './_navigation.js';
import { formatAccounting, getCurrentESTDateString, showConfirmationModal, showToast } from '../ui/helpers.js';
import { renderOpenOrders } from '../ui/renderers/_orders.js';

/**
 * Loads data for the orders page and triggers rendering.
 */
export async function loadOrdersPage() {
    const tableBody = document.querySelector('#pending-orders-table tbody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7">Loading active orders...</td></tr>';
    try {
        // FIX: Explicitly convert the account holder ID to a string to match the function's parameter type.
        const orders = await fetchPendingOrders(String(state.selectedAccountHolderId));
        renderOpenOrders(orders);
    } catch (error) {
        console.error("Failed to load orders page:", error);
        showToast(error.message, 'error');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7">Error loading pending orders.</td></tr>';
        }
    }
}

/**
 * Initializes all event listeners for the Orders page.
 * @returns {void}
 */
export function initializeOrdersHandlers() {
    const transactionForm = /** @type {HTMLFormElement} */ (document.getElementById('add-transaction-form'));
    const addPendingOrderForm = /** @type {HTMLFormElement} */ (document.getElementById('add-pending-order-form'));
    const pendingOrdersTable = document.getElementById('pending-orders-table');
    const confirmFillForm = /** @type {HTMLFormElement} */ (document.getElementById('confirm-fill-form'));

    if (transactionForm) {
		const priceInput = /** @type {HTMLInputElement} */ (document.getElementById('price'));
		priceInput.addEventListener('change', () => {
			const price = parseFloat(priceInput.value);
			if (!price || isNaN(price)) return;
			const takeProfitPercent = state.settings.takeProfitPercent;
			const stopLossPercent = state.settings.stopLossPercent;
			const suggestedProfit = price * (1 + takeProfitPercent / 100);
			const suggestedLoss = price * (1 - stopLossPercent / 100);
			(/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-up'))).value = suggestedProfit.toFixed(2);
			(/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-down'))).value = suggestedLoss.toFixed(2);
		});
		transactionForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const isProfitLimitSet = (/** @type {HTMLInputElement} */(document.getElementById('set-profit-limit-checkbox'))).checked;
			const profitExpirationDate = (/** @type {HTMLInputElement} */(document.getElementById('add-limit-up-expiration'))).value;
			if (isProfitLimitSet && !profitExpirationDate) {
				return showToast('A Take Profit limit requires an expiration date.', 'error');
			}
			const isLossLimitSet = (/** @type {HTMLInputElement} */(document.getElementById('set-loss-limit-checkbox'))).checked;
			const lossExpirationDate = (/** @type {HTMLInputElement} */(document.getElementById('add-limit-down-expiration'))).value;
			if (isLossLimitSet && !lossExpirationDate) {
				return showToast('A Stop Loss limit requires an expiration date.', 'error');
			}
			const transaction = {
				account_holder_id: (/** @type {HTMLSelectElement} */(document.getElementById('add-tx-account-holder'))).value,
				transaction_date: (/** @type {HTMLInputElement} */(document.getElementById('transaction-date'))).value,
				ticker: (/** @type {HTMLInputElement} */(document.getElementById('ticker'))).value.toUpperCase().trim(),
				exchange: (/** @type {HTMLSelectElement} */(document.getElementById('exchange'))).value,
				transaction_type: (/** @type {HTMLSelectElement} */(document.getElementById('transaction-type'))).value,
				quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('quantity'))).value),
				price: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('price'))).value),
				limit_price_up: isProfitLimitSet ? parseFloat((/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-up'))).value) : null,
				limit_up_expiration: isProfitLimitSet ? profitExpirationDate : null,
				limit_price_down: isLossLimitSet ? parseFloat((/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-down'))).value) : null,
				limit_down_expiration: isLossLimitSet ? lossExpirationDate : null
			};
			const submitButton = /** @type {HTMLButtonElement} */ (transactionForm.querySelector('button[type="submit"]'));
			submitButton.disabled = true;
			try {
				const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transaction) });
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Server responded with an error.');
				}
				showToast('Transaction logged successfully!', 'success');
				transactionForm.reset();
				(/** @type {HTMLInputElement} */(document.getElementById('transaction-date'))).value = getCurrentESTDateString();
				await refreshLedger();
			} catch (error) {
				showToast(`Failed to log transaction: ${error.message}`, 'error');
			} finally {
				submitButton.disabled = false;
			}
		});
	}
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
                order_type: 'BUY_LIMIT',
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
                    await switchView('orders', null);
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
                        await switchView('orders', null);
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
                await switchView('orders', null);
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }
}