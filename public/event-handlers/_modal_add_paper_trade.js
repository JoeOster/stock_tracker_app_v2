// /public/event-handlers/_modal_add_paper_trade.js
/**
 * @file Initializes event handlers for the "Add/Edit Paper Trade" (Journal Entry) modal.
 * @module event-handlers/_modal_add_paper_trade
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { addJournalEntry } from '../api/journal-api.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

/**
 * Initializes the event listeners for the "Add Paper Trade" modal form.
 * @returns {void}
 */
export function initializeAddPaperTradeModalHandler() {
  const addJournalModal = document.getElementById('add-paper-trade-modal');
  const addJournalEntryForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('add-journal-entry-form')
  );

  if (addJournalEntryForm && addJournalModal) {
    // --- Logic moved from _journal.js ---
    addJournalEntryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addButton = /** @type {HTMLButtonElement | null} */ (
        addJournalEntryForm.querySelector('#add-journal-entry-btn')
      );
      if (!addButton) return;

      // ... (all the validation code from lines 30-160) ...
      const accountHolderId =
        state.selectedAccountHolderId === 'all'
          ? null
          : String(state.selectedAccountHolderId);
      const entryDate = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-entry-date')
      ).value;
      const ticker = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-ticker')
      ).value
        .toUpperCase()
        .trim();
      const exchange = /** @type {HTMLSelectElement} */ (
        document.getElementById('journal-exchange')
      ).value;
      const direction = /** @type {HTMLSelectElement} */ (
        document.getElementById('journal-direction')
      ).value;
      const quantityStr = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-quantity')
      ).value;
      const entryPriceStr = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-entry-price')
      ).value;
      const targetPriceStr = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-target-price')
      ).value;
      const targetPrice2Str = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-target-price-2')
      ).value;
      const stopLossPriceStr = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-stop-loss-price')
      ).value;

      // --- Validation ---
      if (!accountHolderId) {
        return showToast('Please select a specific account holder.', 'error');
      }
      if (!entryDate || !ticker || !exchange || !direction) {
        return showToast('Please fill in all required fields (*).', 'error');
      }
      const quantity = parseFloat(quantityStr);
      const entryPrice = parseFloat(entryPriceStr);
      if (isNaN(quantity) || quantity < 0) {
        return showToast(
          'Quantity must be a valid positive number (or 0 for techniques).',
          'error'
        );
      }
      if (isNaN(entryPrice) || entryPrice < 0) {
        return showToast(
          'Entry Price must be a valid positive number (or 0 for techniques).',
          'error'
        );
      }

      const targetPrice = targetPriceStr ? parseFloat(targetPriceStr) : null;
      if (targetPrice !== null && (isNaN(targetPrice) || targetPrice <= 0)) {
        return showToast(
          'Target Price 1 must be a valid positive number if entered.',
          'error'
        );
      }
      if (
        targetPrice !== null &&
        targetPrice <= entryPrice &&
        direction === 'BUY'
      ) {
        return showToast(
          'Target Price 1 must be greater than Entry Price for a BUY.',
          'error'
        );
      }

      const targetPrice2 = targetPrice2Str ? parseFloat(targetPrice2Str) : null;
      if (targetPrice2 !== null && (isNaN(targetPrice2) || targetPrice2 <= 0)) {
        return showToast(
          'Target Price 2 must be a valid positive number if entered.',
          'error'
        );
      }
      if (
        targetPrice !== null &&
        targetPrice2 !== null &&
        targetPrice2 <= targetPrice
      ) {
        return showToast(
          'Target Price 2 must be greater than Target Price 1.',
          'error'
        );
      }
      if (
        targetPrice === null &&
        targetPrice2 !== null &&
        targetPrice2 <= entryPrice &&
        direction === 'BUY'
      ) {
        return showToast(
          'Target Price 2 must be greater than Entry Price for a BUY.',
          'error'
        );
      }

      const stopLossPrice = stopLossPriceStr
        ? parseFloat(stopLossPriceStr)
        : null;
      if (
        stopLossPrice !== null &&
        (isNaN(stopLossPrice) || stopLossPrice <= 0)
      ) {
        return showToast(
          'Stop Loss Price must be a valid positive number if entered.',
          'error'
        );
      }
      if (
        stopLossPrice !== null &&
        stopLossPrice >= entryPrice &&
        direction === 'BUY'
      ) {
        return showToast(
          'Stop Loss Price must be less than Entry Price for a BUY.',
          'error'
        );
      }
      // --- End Validation ---

      const entryData = {
        account_holder_id: accountHolderId,
        entry_date: entryDate,
        ticker: ticker,
        exchange: exchange,
        direction: direction,
        quantity: quantity,
        entry_price: entryPrice,
        target_price: targetPrice,
        target_price_2: targetPrice2,
        stop_loss_price: stopLossPrice,
        advice_source_id:
          /** @type {HTMLSelectElement} */ (
            document.getElementById('journal-advice-source')
          ).value || null,
        advice_source_details:
          /** @type {HTMLInputElement} */ (
            document.getElementById('journal-advice-details')
          ).value.trim() || null,
        entry_reason:
          /** @type {HTMLInputElement} */ (
            document.getElementById('journal-entry-reason')
          ).value.trim() || null,
        notes:
          /** @type {HTMLTextAreaElement} */ (
            document.getElementById('journal-notes')
          ).value.trim() || null,
      };

      addButton.disabled = true;
      try {
        await addJournalEntry(entryData);
        showToast('Journal entry added!', 'success');
        addJournalEntryForm.reset();
        /** @type {HTMLInputElement} */ (
          document.getElementById('journal-entry-date')
        ).value = getCurrentESTDateString(); // Reset date to today
        addJournalModal.classList.remove('visible');

        // --- THIS IS THE FIX (Bug #4) ---
        // Also close the Source Details modal that is open underneath
        const detailsModal = document.getElementById('source-details-modal');
        if (detailsModal) {
          detailsModal.classList.remove('visible');
        }
        // --- END FIX ---

        // Dispatch a custom event to notify other parts of the app (like the new Watchlist)
        document.dispatchEvent(new CustomEvent('journalUpdated'));
      } catch (error) {
        // @ts-ignore
        showToast(`Error adding entry: ${error.message}`, 'error');
      } finally {
        addButton.disabled = false;
      }
    });
  }
}
