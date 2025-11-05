// /Portfolio V4/public/event-handlers/alerts.js
/**
 * @file Manages all logic for the "Alerts" tab.
 * @module event-handlers/alerts
 */

import { state, updateState } from '../../../public/state.js';
import { switchView } from './_navigation.js';
import { showToast, sortTableByColumn } from '../ui/helpers.js';
import {
  fetchAlerts,
  updateNotificationStatus,
} from '../../../public/api/alerts-api.js';
import { renderAlerts } from '../../../public/ui/renderers/_alerts.js';

// #region Main Loader and Initializer

/**
 * Loads data for the alerts page and triggers rendering.
 */
export async function loadAlertsPage() {
  const tableBody = document.querySelector('#alerts-table tbody');
  if (tableBody)
    tableBody.innerHTML = '<tr><td colspan="3">Loading alerts...</td></tr>';

  try {
    const holderId = state.selectedAccountHolderId;
    if (holderId === 'all' || !holderId) {
      renderAlerts([]);
      return;
    }
    const alerts = await fetchAlerts(String(holderId));
    renderAlerts(alerts);
  } catch (error) {
    const err = /** @type {Error} */ (error);
    showToast(`Error loading alerts: ${err.message}`, 'error');
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="3">Error loading alerts.</td></tr>';
  }
}

/**
 * Initializes all event listeners for the Alerts page.
 */
export function initializeAlertsHandlers() {
  console.log('[Alerts Init] Initializing Alerts page handlers...');
  const alertsTable = document.getElementById('alerts-table');
  if (!alertsTable) return;

  // Sorting
  const thead = alertsTable.querySelector('thead');
  if (thead) {
    thead.addEventListener('click', (e) => {
      const th = /** @type {HTMLTableCellElement} */ (
        /** @type {HTMLElement} */ (e.target).closest('th[data-sort]')
      );
      if (th)
        sortTableByColumn(
          th,
          /** @type {HTMLTableSectionElement} */ (
            alertsTable.querySelector('tbody')
          )
        );
    });
  }

  // Action buttons
  alertsTable.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const yesButton = target.closest('.alert-yes-btn');
    const noButton = target.closest('.alert-no-btn');
    const pendingButton = target.closest('.alert-pending-btn');

    if (yesButton) {
      await handleYesItFilled(/** @type {HTMLElement} */ (yesButton));
    } else if (noButton) {
      await handleDismissAlert(/** @type {HTMLElement} */ (noButton));
    } else if (pendingButton) {
      await handleReviewLater(/** @type {HTMLElement} */ (pendingButton));
    }
  });
  console.log('[Alerts Init] Alerts page handlers initialized.');
}

// #endregion

// #region Action Handlers

/**
 * FIX: Handles the "Yes, it Filled" button click with a new, robust pre-fill mechanism.
 * @param {HTMLElement} yesButton The button that was clicked.
 */
async function handleYesItFilled(yesButton) {
  const pendingOrderId = yesButton.dataset.pendingOrderId;
  if (!pendingOrderId) {
    return showToast('Error: Missing order ID on alert button.', 'error');
  }

  // Find the full order object from the state
  const orderToFill = state.pendingOrders.find(
    (o) => String(o.id) === pendingOrderId
  );

  if (!orderToFill) {
    return showToast(
      `Could not find pending order with ID ${pendingOrderId}. Please go to the 'Orders' tab to fill it manually.`,
      'info',
      6000
    );
  }

  // Create the prefillData object, similar to how the "Sources" tab does it
  const prefillData = {
    sourceId: orderToFill.advice_source_id || '',
    sourceName: orderToFill.source_name || 'Unknown', // Assuming source_name is available
    ticker: orderToFill.ticker,
    price: orderToFill.limit_price, // Use the limit price as the default fill price
    tp1: null, // Alerts don't carry TP/SL info
    tp2: null,
    sl: null,
    journalId: null, // Alerts are not linked to journal entries
  };

  // Set the state and switch views
  updateState({ prefillOrderFromSource: prefillData });
  await switchView('orders');
  showToast(
    `Prefilling form to log filled order for ${orderToFill.ticker}...`,
    'info'
  );
}

/**
 * Handles dismissing an alert.
 * @param {HTMLElement} noButton The button that was clicked.
 */
async function handleDismissAlert(noButton) {
  const notificationId = noButton.dataset.notificationId;
  if (!notificationId) return;
  try {
    await updateNotificationStatus(notificationId, 'DISMISSED');
    showToast('Alert dismissed.', 'info');
    await loadAlertsPage(); // Refresh the alerts list
  } catch (error) {
    showToast(`${/** @type {Error} */ (error).message}`, 'error');
  }
}

/**
 * Handles marking an alert for later review.
 * @param {HTMLElement} pendingButton The button that was clicked.
 */
async function handleReviewLater(pendingButton) {
  const notificationId = pendingButton.dataset.notificationId;
  if (!notificationId) return;
  try {
    await updateNotificationStatus(notificationId, 'PENDING');
    showToast('Alert marked for later review.', 'info');
    await loadAlertsPage(); // Refresh the alerts list
  } catch (error) {
    showToast(`${/** @type {Error} */ (error).message}`, 'error');
  }
}

// #endregion
