// /public/api/alerts-api.js
/**
 * @file API calls related to notifications (alerts).
 * @module api/alerts-api
 */

import { handleResponse } from './api-helpers.js';

/**
 * Fetches all 'UNREAD' notifications for a given account holder.
 * @async
 * @param {string|number} holderId - The ID of the account holder ('all' for everyone).
 * @returns {Promise<any[]>} A promise that resolves to an array of notification objects.
 */
export async function fetchAlerts(holderId) {
  const response = await fetch(`/api/orders/notifications?holder=${holderId}`);
  return handleResponse(response);
}
