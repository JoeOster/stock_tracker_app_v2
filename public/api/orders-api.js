// /public/api/orders-api.js
/**
 * @file API calls related to pending orders.
 * @module api/orders-api
 */

import { handleResponse } from './api-helpers.js';

/**
 * Fetches all active pending orders for a given account holder.
 * @async
 * @param {string|number} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of pending order objects.
 */
export async function fetchPendingOrders(holderId) {
    const response = await fetch(`/api/orders/pending?holder=${holderId}`);
    return handleResponse(response);
}

/**
 * Adds a new pending order to the database.
 * @async
 * @param {object} orderData - The data for the new pending order.
 * @param {string|number} orderData.account_holder_id - The account holder ID.
 * @param {string} orderData.ticker - The ticker symbol.
 * @param {string} orderData.exchange - The target exchange.
 * @param {string} orderData.order_type - Type of order (e.g., 'BUY_LIMIT').
 * @param {number} orderData.limit_price - The price for the limit order.
 * @param {number} orderData.quantity - The number of shares.
 * @param {string} orderData.created_date - The date the order was created (YYYY-MM-DD).
 * @param {string|null} [orderData.expiration_date] - Optional expiration date (YYYY-MM-DD).
 * @param {string|null} [orderData.notes] - Optional user notes.
 * @param {string|number|null} [orderData.advice_source_id] - Optional linked advice source ID.
 * @returns {Promise<any>} A promise that resolves to the server's response (e.g., success message).
 */
export async function addPendingOrder(orderData) {
    // Basic validation on the client side for required fields
    if (!orderData.account_holder_id || !orderData.ticker || !orderData.exchange ||
        !orderData.order_type || !orderData.limit_price || !orderData.quantity ||
        !orderData.created_date) {
        throw new Error("Missing required fields for pending order.");
    }

    const response = await fetch('/api/orders/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData) // Send the complete order data object
    });
    return handleResponse(response); // Use the existing handleResponse helper
}
