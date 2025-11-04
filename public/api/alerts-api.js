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

/**
 * Updates the status of a specific notification.
 * @async
 * @param {string|number} notificationId - The ID of the notification to update.
 * @param {'DISMISSED'|'PENDING'|'READ'} status - The new status for the notification.
 * @returns {Promise<object>} A promise that resolves to the updated notification object.
 */
export async function updateNotificationStatus(notificationId, status) {
  const response = await fetch(
    `/api/orders/notifications/${notificationId}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    }
  );
  return handleResponse(response);
}
