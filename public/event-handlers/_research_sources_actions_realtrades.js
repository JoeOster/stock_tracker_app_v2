// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_research_sources_actions_realtrades.js
/**
 * @file Contains action handlers for the "Linked Real Trades" panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_realtrades
 */

import { showToast } from '../ui/helpers.js';
import { populateSellFromPositionModal } from './_modal_sell_from_position.js';

/**
 * Handles a click on the "Sell" button from a real trade row in the source modal.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {object} details - The full details object from the modal.
 * @returns {Promise<void>}
 */
export async function handleSellFromLotSource(target, details) {
  console.log(
    '[Modal Actions] Delegating to handleSellFromLotSource (Real Trades)'
  );
  const sellBtn = target.closest('.sell-from-lot-btn-source');
  if (!sellBtn) return;

  const buyId = sellBtn.dataset.buyId;
  if (!buyId) {
    return showToast('Error: Missing Lot ID on sell button.', 'error');
  }

  const lotData = details.linkedTransactions.find(
    (lot) => String(lot.id) === buyId
  );

  if (lotData) {
    // This function lives in _modal_sell_from_position.js and opens the modal
    populateSellFromPositionModal(lotData);
  } else {
    console.error(`[Modal Actions] Could not find lot data for ID ${buyId}`);
    showToast('Error: Could not find lot data to sell.', 'error');
  }
}
