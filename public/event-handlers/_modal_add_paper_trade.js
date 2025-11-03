// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_modal_add_paper_trade.js
/**
 * @file Initializes event handlers for the "Add/Edit Paper Trade" (Journal Entry) modal.
 * This modal is used by the "Watchlist" page and by the "Source Details" modal.
 * @module event-handlers/_modal_add_paper_trade
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { addJournalEntry, updateJournalEntry } from '../api/journal-api.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

/**
 * Initializes the event listeners for the "Add Paper Trade" modal form.
 * This handler now supports both ADDING and EDITING entries.
 * @returns {void}
 */
export function initializeAddPaperTradeModalHandler() {
  const addJournalModal = document.getElementById('add-paper-trade-modal');
  const addJournalEntryForm = /** @type {HTMLFormElement | null} */ (
    document.getElementById('add-journal-entry-form')
  );

  if (addJournalEntryForm && addJournalModal) {
    addJournalEntryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addButton = /** @type {HTMLButtonElement | null} */ (
        addJournalEntryForm.querySelector('#add-journal-entry-btn')
      );
      if (!addButton) return;

      const entryId = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-form-entry-id')
      ).value;
      const isEditing = !!entryId;

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
      if (!accountHolderId && !isEditing) {
        // Account holder is only required on create
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
        entryPrice > 0 &&
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
        entryPrice > 0 &&
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
        entryPrice > 0 &&
        stopLossPrice >= entryPrice &&
        direction === 'BUY'
      ) {
        return showToast(
          'Stop Loss Price must be less than Entry Price for a BUY.',
          'error'
        );
      }
      // --- End Validation ---

      const chartType = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-chart-type')
      ).value.trim();
      const imagePath = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-image-path')
      ).value.trim();
      const notes = /** @type {HTMLTextAreaElement} */ (
        document.getElementById('journal-notes')
      ).value.trim();

      const combinedNotes = chartType
        ? `Chart Type: ${chartType}\n\n${notes}`
        : notes || null;

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
        notes: combinedNotes,
        image_path: imagePath || null,
      };

      if (isEditing) {
        // Don't update account holder on edit
        delete entryData.account_holder_id;
      }

      addButton.disabled = true;
      try {
        if (isEditing) {
          await updateJournalEntry(entryId, entryData);
          showToast('Journal entry updated!', 'success');
        } else {
          await addJournalEntry(entryData);
          showToast('Journal entry added!', 'success');
        }

        addJournalEntryForm.reset();
        /** @type {HTMLInputElement} */ (
          document.getElementById('journal-entry-date')
        ).value = getCurrentESTDateString();
        addJournalModal.classList.remove('visible');

        const detailsModal = document.getElementById('source-details-modal');
        if (detailsModal) {
          detailsModal.classList.remove('visible');
        }

        document.dispatchEvent(new CustomEvent('journalUpdated'));
      } catch (error) {
        // @ts-ignore
        showToast(`Error saving entry: ${error.message}`, 'error');
      } finally {
        addButton.disabled = false;
      }
    });
  }
}
