// /public/event-handlers/_orders.js
// Version Updated (Removed Add Pending Order Form handler, added sorting, Persist Account/Exchange - Task X.12)
/**
 * @file Initializes all event handlers for the Orders page.
 * @module event-handlers/_orders
 */

import { state } from '../state.js';
import { refreshLedger, fetchPendingOrders } from '../api.js';
import { switchView } from './_navigation.js';
import { showConfirmationModal, showToast, sortTableByColumn } from '../ui/helpers.js';
import { renderOpenOrders } from '../ui/renderers/_orders.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting } from '../ui/formatters.js';

/**
 * Loads data for the orders page and triggers rendering.
 */
export async function loadOrdersPage() {
    const tableBody = document.querySelector('#pending-orders-table tbody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7">Loading open orders...</td></tr>'; // Updated colspan
    try {
        const orders = await fetchPendingOrders(String(state.selectedAccountHolderId));
        renderOpenOrders(orders);
    } catch (error) {
        console.error("[Orders] Error in loadOrdersPage:", error);
        showToast(error.message, 'error');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7">Error loading open orders.</td></tr>'; // Updated colspan
        }
    }
}

/**
 * Initializes all event listeners for the Orders page.
 * @returns {void}
 */
export function initializeOrdersHandlers() {
    try {
        const pendingOrdersTable = document.getElementById('pending-orders-table');
        const transactionForm = /** @type {HTMLFormElement} */ (document.getElementById('add-transaction-form'));
        const confirmFillForm = /** @type {HTMLFormElement} */ (document.getElementById('confirm-fill-form'));

        // --- Transaction Form Logic (Log Executed Trade) ---
        if (transactionForm) {
            const priceInput = /** @type {HTMLInputElement} */ (document.getElementById('price'));
            // Suggest limits based on price input
            priceInput.addEventListener('change', () => {
                const price = parseFloat(priceInput.value);
                if (!price || isNaN(price) || price <= 0) return;
                const takeProfitPercent = state.settings.takeProfitPercent;
                const stopLossPercent = state.settings.stopLossPercent;
                const suggestedProfit = price * (1 + takeProfitPercent / 100);
                const suggestedLoss = price * (1 - stopLossPercent / 100);
                (/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-up'))).value = suggestedProfit.toFixed(2);
                (/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-down'))).value = suggestedLoss.toFixed(2);
            });

            // Form submission with validation
            transactionForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Validation logic remains the same...
                const accountHolder = (/** @type {HTMLSelectElement} */(document.getElementById('add-tx-account-holder'))).value;
                const transactionDate = (/** @type {HTMLInputElement} */(document.getElementById('transaction-date'))).value;
                const ticker = (/** @type {HTMLInputElement} */(document.getElementById('ticker'))).value.toUpperCase().trim();
                const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('exchange'))).value;
                const transactionType = (/** @type {HTMLSelectElement} */(document.getElementById('transaction-type'))).value;
                const quantity = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('quantity'))).value);
                const price = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('price'))).value);

                if (!accountHolder || !transactionDate || !ticker || !exchange || !transactionType || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
                    return showToast('Please fill in all required fields (*) with valid positive numbers for quantity and price.', 'error');
                }
                const isProfitLimitSet = (/** @type {HTMLInputElement} */(document.getElementById('set-profit-limit-checkbox'))).checked;
                const profitPrice = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-up'))).value);
                const profitExpirationDate = (/** @type {HTMLInputElement} */(document.getElementById('add-limit-up-expiration'))).value;
                if (isProfitLimitSet && (isNaN(profitPrice) || profitPrice <= price)) {
                     return showToast('Take Profit price must be a valid number greater than the purchase price.', 'error');
                }
                if (isProfitLimitSet && !profitExpirationDate) {
                    return showToast('A Take Profit limit requires an expiration date.', 'error');
                }
                const isLossLimitSet = (/** @type {HTMLInputElement} */(document.getElementById('set-loss-limit-checkbox'))).checked;
                const lossPrice = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-down'))).value);
                const lossExpirationDate = (/** @type {HTMLInputElement} */(document.getElementById('add-limit-down-expiration'))).value;
                 if (isLossLimitSet && (isNaN(lossPrice) || lossPrice <= 0 || lossPrice >= price)) {
                     return showToast('Stop Loss price must be a valid positive number less than the purchase price.', 'error');
                 }
                if (isLossLimitSet && !lossExpirationDate) {
                    return showToast('A Stop Loss limit requires an expiration date.', 'error');
                }

                const transaction = {
                    account_holder_id: accountHolder,
                    transaction_date: transactionDate,
                    ticker: ticker,
                    exchange: exchange,
                    transaction_type: transactionType,
                    quantity: quantity,
                    price: price,
                    limit_price_up: isProfitLimitSet ? profitPrice : null,
                    limit_up_expiration: isProfitLimitSet ? profitExpirationDate : null,
                    limit_price_down: isLossLimitSet ? lossPrice : null,
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

                    // --- MODIFICATION START (Task X.12) ---
                    /** @type {HTMLSelectElement} */
                    const accountHolderSelect = (/** @type {HTMLSelectElement} */(document.getElementById('add-tx-account-holder')));
                    /** @type {HTMLSelectElement} */
                    const exchangeSelect = (/** @type {HTMLSelectElement} */(document.getElementById('exchange')));

                    /** @type {string} */
                    const savedAccountHolderValue = accountHolderSelect.value;
                    /** @type {string} */
                    const savedExchangeValue = exchangeSelect.value;

                    transactionForm.reset(); // Reset the form first

                    // Restore the saved values
                    accountHolderSelect.value = savedAccountHolderValue;
                    exchangeSelect.value = savedExchangeValue;
                    // --- MODIFICATION END (Task X.12) ---

                    (/** @type {HTMLInputElement} */(document.getElementById('transaction-date'))).value = getCurrentESTDateString();
                    await refreshLedger();
                } catch (error) {
                    showToast(`Failed to log transaction: ${error.message}`, 'error');
                } finally {
                    submitButton.disabled = false;
                }
            });
        } else {
             console.warn("[Orders Init] Add transaction form not found.");
        }

        // --- Open Limit Orders Table Logic ---
        if (pendingOrdersTable) {
             // --- Table Header Sorting ---
             const thead = pendingOrdersTable.querySelector('thead');
             if (thead) {
                 thead.addEventListener('click', (e) => {
                     const target = /** @type {HTMLElement} */ (e.target);
                     const th = /** @type {HTMLTableCellElement} */ (target.closest('th[data-sort]'));
                     if (th) {
                         const tbody = /** @type {HTMLTableSectionElement} */ (pendingOrdersTable.querySelector('tbody'));
                         if (tbody) {
                             sortTableByColumn(th, tbody);
                         }
                     }
                 });
             }

             // --- Action Button Clicks (Delegated) ---
             pendingOrdersTable.addEventListener('click', async (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                const cancelButton = /** @type {HTMLElement} */ (target.closest('.cancel-order-btn'));
                const fillButton = /** @type {HTMLElement} */ (target.closest('.fill-order-btn'));

                if (cancelButton) {
                    // Cancel logic remains the same...
                    const orderId = cancelButton.dataset.id;
                    if (!orderId) return;
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
                    // Fill logic remains the same...
                     const orderId = fillButton.dataset.id;
                    if (!orderId) return;
                    const order = state.pendingOrders.find(o => String(o.id) === orderId);
                    if (!order) {
                        showToast('Could not find order details to fill.', 'error');
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

                    const confirmFillModal = document.getElementById('confirm-fill-modal');
                    if (confirmFillModal) {
                        confirmFillModal.classList.add('visible');
                    } else {
                        console.error("[Orders Event] Confirm fill modal not found!");
                        showToast("UI Error: Could not display confirmation.", "error");
                    }
                }
            });
        } else {
            console.error("[Orders Init] Could not find #pending-orders-table element to attach listener.");
        }

        // --- Confirm Fill Modal Logic ---
        if (confirmFillForm) {
            confirmFillForm.addEventListener('submit', async (e) => {
                // Submit logic remains the same...
                e.preventDefault();
                const submitButton = /** @type {HTMLButtonElement} */ (confirmFillForm.querySelector('button[type="submit"]'));
                const executionPrice = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('fill-execution-price'))).value);
                const executionDate = (/** @type {HTMLInputElement} */(document.getElementById('fill-execution-date'))).value;
                if (isNaN(executionPrice) || executionPrice <= 0 || !executionDate) {
                     return showToast('Please enter a valid positive Execution Price and Execution Date.', 'error');
                }
                submitButton.disabled = true;
                const pendingOrderId = (/** @type {HTMLInputElement} */(document.getElementById('fill-pending-order-id'))).value;
                const newTransaction = {
                    account_holder_id: (/** @type {HTMLInputElement} */(document.getElementById('fill-account-holder-id'))).value,
                    ticker: (/** @type {HTMLInputElement} */(document.getElementById('fill-ticker'))).value,
                    exchange: (/** @type {HTMLInputElement} */(document.getElementById('fill-exchange'))).value,
                    quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('fill-quantity'))).value),
                    price: executionPrice,
                    transaction_date: executionDate,
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
                        console.warn(`Transaction creation failed for filled order ${pendingOrderId}. Attempting rollback...`);
                        await fetch(`/api/orders/pending/${pendingOrderId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'ACTIVE' })
                        });
                        throw new Error(err.message || 'Failed to create new transaction. Order status reverted.');
                    }
                    const confirmFillModal = document.getElementById('confirm-fill-modal');
                    if (confirmFillModal) confirmFillModal.classList.remove('visible');
                    showToast('Order filled and transaction logged!', 'success');
                    await switchView('orders', null);
                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                } finally {
                    submitButton.disabled = false;
                }
            });
        } else {
             console.warn("[Orders Init] Confirm fill form not found.");
        }

    } catch (error) {
        console.error("[Orders Init] CRITICAL ERROR during initialization:", error);
    }
}