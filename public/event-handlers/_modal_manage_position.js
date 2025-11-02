// public/event-handlers/_modal_manage_position.js
/**
 * @file Initializes event handlers for the "Manage Position Details" modal.
 * @module event-handlers/_modal_manage_position
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import {
  formatAccounting,
  formatQuantity,
  formatDate,
} from '../ui/formatters.js';
import { fetchBatchSalesHistory } from '../api/transactions-api.js';
// --- ADDED: Imports for modal functionality ---
import { populateEditModal } from './_modal_edit_transaction.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
// --- END ADDED ---

/**
 * Renders the HTML for a single lot item.
 * @param {object} lot - The transaction object for the lot.
 * @returns {string} HTML string for the lot item.
 */
function _renderLotItem(lot) {
  const pnl = lot.unrealized_pnl || 0;
  const pnlClass = pnl >= 0 ? 'positive' : 'negative';
  const pnlPercent = lot.unrealized_pnl_percent || 0;

  return `
        <div class="lot-item" data-lot-id="${lot.id}">
            <div class="lot-item-info">
                <strong>${formatQuantity(lot.quantity_remaining)} shares</strong> @ ${formatAccounting(lot.price)}
                <br>
                <small>
                    Purchased: ${formatDate(lot.transaction_date)} | 
                    P/L: <span class="${pnlClass}">${formatAccounting(pnl)} (${pnlPercent.toFixed(2)}%)</span>
                </small>
            </div>
            <div class="lot-item-actions">
                <button type="button" class="edit-lot-btn" data-id="${lot.id}">Edit Lot</button>
                <button type="button" class="set-limits-btn" data-id="${lot.id}">Set Limits</button>
            </div>
        </div>
    `;
}

/**
 * Renders the HTML for the combined sales history table.
 * @param {any[]} sales - The array of sorted sales transactions.
 * @returns {string} HTML string for the table.
 */
function _renderSalesHistory(sales) {
  if (!sales || sales.length === 0) {
    return '<p>No sales history found for this position.</p>';
  }

  // Create a simple table (using the .mini-journal-table class for styling)
  let tableHTML = '<table class="mini-journal-table" style="width: 100%;">';
  tableHTML += `
        <thead>
            <tr>
                <th>Sale Date</th>
                <th class="numeric">Quantity</th>
                <th class="numeric">Sale Price</th>
                <th class="numeric">Realized P/L</th>
            </tr>
        </thead>
        <tbody>
    `;

  let totalPL = 0;
  sales.forEach((sale) => {
    const pl = sale.realizedPL || 0;
    const plClass = pl >= 0 ? 'positive' : 'negative';
    totalPL += pl;
    tableHTML += `
            <tr>
                <td>${formatDate(sale.transaction_date)}</td>
                <td class="numeric">${formatQuantity(sale.quantity)}</td>
                <td class="numeric">${formatAccounting(sale.price)}</td>
                <td class="numeric ${plClass}">${formatAccounting(pl)}</td>
            </tr>
        `;
  });

  // Add footer
  const totalPlClass = totalPL >= 0 ? 'positive' : 'negative';
  tableHTML += `
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" style="text-align: right; font-weight: bold;"><strong>Total Realized P/L</strong></td>
                <td class="numeric ${totalPlClass}"><strong>${formatAccounting(totalPL)}</strong></td>
            </tr>
        </tfoot>
    `;

  tableHTML += '</table>';
  return tableHTML;
}

/**
 * Populates the "Manage Position" modal with data for the selected ticker.
 * @param {boolean} doFetchSales - Flag to control if sales history is fetched.
 * @returns {Promise<void>}
 */
export async function populateManagementModal(doFetchSales = true) {
  const modal = document.getElementById('manage-position-modal');
  if (!modal) return;

  const { ticker, exchange, lotIds } = /** @type {HTMLElement} */ (modal)
    .dataset;
  if (!ticker || !exchange || !lotIds) {
    throw new Error(
      'Modal is missing required data (ticker, exchange, or lotIds).'
    );
  }

  // --- 1. Set Modal Header ---
  const titleEl = document.getElementById('manage-position-title');
  const exchangeEl = document.getElementById('manage-position-exchange');
  if (titleEl) titleEl.textContent = `Manage Position: ${ticker}`;
  if (exchangeEl) exchangeEl.textContent = exchange;

  // --- 2. Populate Lot List (from state) ---
  const lotListEl = document.getElementById('manage-position-lots-list');
  let lotIdArray = []; // Store lot IDs

  if (lotListEl) {
    lotIdArray = lotIds.split(',').map((id) => parseInt(id, 10));
    // @ts-ignore
    const lots = state.dashboardOpenLots
      .filter((p) => lotIdArray.includes(p.id))
      .sort(
        (a, b) =>
          new Date(a.transaction_date).getTime() -
          new Date(b.transaction_date).getTime()
      );

    if (lots.length > 0) {
      lotListEl.innerHTML = lots.map(_renderLotItem).join('');
    } else {
      lotListEl.innerHTML = '<p>No open lots found for this position.</p>';
    }
  }

  // --- 3. Populate Sales History ---
  const salesListEl = document.getElementById('manage-position-sales-history');
  if (salesListEl) {
    if (doFetchSales && lotIdArray.length > 0) {
      salesListEl.innerHTML = '<p><i>Fetching sales history...</i></p>';
      try {
        const sales = await fetchBatchSalesHistory(
          lotIdArray,
          state.selectedAccountHolderId
        );
        salesListEl.innerHTML = _renderSalesHistory(sales);
      } catch (error) {
        console.error('Error fetching batch sales history:', error);
        // @ts-ignore
        salesListEl.innerHTML = `<p style="color: var(--negative-color);">Error loading sales history: ${error.message}</p>`;
      }
    } else if (!doFetchSales) {
      salesListEl.innerHTML =
        '<p><i>Sales history loading was skipped.</i></p>';
    } else {
      salesListEl.innerHTML = '<p>No lots to fetch history for.</p>';
    }
  }
}

/**
 * Initializes all event listeners for the "Manage Position" modal.
 * @returns {void}
 */
export function initializeManagePositionModalHandler() {
  console.log('[Manage Position Modal] Handler initialized.');

  const modal = document.getElementById('manage-position-modal');
  if (!modal) return;

  // We will use delegation to handle clicks inside the modal
  modal.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    // --- Handle "Edit Lot" button ---
    if (target.matches('.edit-lot-btn')) {
      const lotId = target.dataset.id;
      if (!lotId) return;

      // @ts-ignore
      const lot = state.dashboardOpenLots.find((p) => String(p.id) === lotId);
      if (!lot) {
        return showToast('Error: Could not find lot data in state.', 'error');
      }

      await populateAllAdviceSourceDropdowns(); // Ensure dropdowns are ready
      populateEditModal(lot, false); // false = full edit
    }

    // --- Handle "Set Limits" button ---
    if (target.matches('.set-limits-btn')) {
      const lotId = target.dataset.id;
      if (!lotId) return;

      // @ts-ignore
      const lot = state.dashboardOpenLots.find((p) => String(p.id) === lotId);
      if (!lot) {
        return showToast('Error: Could not find lot data in state.', 'error');
      }

      // This reuses the edit modal in its "limits only" state
      populateEditModal(lot, true); // true = limits only
    }
  });
}
