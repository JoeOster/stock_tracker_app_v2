// /public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Contains action handlers for the Watchlist (Trade Ideas) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { addWatchlistItem, deleteWatchlistItem } from '../api/watchlist-api.js';
import { switchView } from './_navigation.js';

/**
 * Initializes the "Add Trade Idea" form (for 'Person'/'Group' types).
 * @param {HTMLFormElement} form - The form element.
 * @param {object} source - The advice source object.
 */
export function initializeWatchlistForm(form, source) {
    // --- FIX: Add async to the event listener ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tickerInput = /** @type {HTMLInputElement} */(document.getElementById('source-watchlist-ticker'));
        const entryLowInput = /** @type {HTMLInputElement} */(document.getElementById('source-watchlist-entry-low'));
        const entryHighInput = /** @type {HTMLInputElement} */(document.getElementById('source-watchlist-entry-high'));
        const tp1Input = /** @type {HTMLInputElement} */(document.getElementById('source-watchlist-tp1'));
        const slInput = /** @type {HTMLInputElement} */(document.getElementById('source-watchlist-sl'));

        const ticker = tickerInput.value.toUpperCase();
        if (!ticker) {
            showToast('Ticker is required.', 'error');
            return;
        }

        try {
            await addWatchlistItem(
                // @ts-ignore
                state.selectedAccountHolderId,
                ticker,
                source.id, // Link to the advice_source_id
                entryLowInput.value ? parseFloat(entryLowInput.value) : null,
                entryHighInput.value ? parseFloat(entryHighInput.value) : null,
                tp1Input.value ? parseFloat(tp1Input.value) : null,
                null, // tp2 - not in this form
                slInput.value ? parseFloat(slInput.value) : null,
                null // journal_entry_id (null)
            );
            showToast('Trade Idea added!', 'success');
            form.reset();
            // Refresh the modal to show the new item
            // --- FIX: Add @ts-ignore for linter bug ---
            // @ts-ignore
            const { openSourceDetailsModal } = await import('./_research_sources_modal.js');
            await openSourceDetailsModal(source.id);
        } catch (error) {
            console.error('Failed to add watchlist item:', error);
            // @ts-ignore
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

/**
 * Handles the click event for the "Delete" button on a watchlist item.
 * @param {HTMLElement} button - The button that was clicked.
 * @param {object} source - The advice source object (for refreshing).
 */
export function handleWatchlistDelete(button, source) {
    const watchlistId = button.dataset.id;
    if (!watchlistId) return;

    showConfirmationModal('Archive Trade Idea?', 'This will move the idea to archives. This cannot be undone.', async () => {
        try {
            await deleteWatchlistItem(watchlistId);
            showToast('Trade Idea archived.', 'success');
            // Refresh the modal to remove the item from the list
            // --- FIX: Add @ts-ignore for linter bug ---
            // @ts-ignore
            const { openSourceDetailsModal } = await import('./_research_sources_modal.js');
            await openSourceDetailsModal(source.id);
        } catch (error) {
            console.error('Failed to delete watchlist item:', error);
            // @ts-ignore
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

/**
 * Handles the click event for the "Buy" button on a watchlist item.
 * Navigates to the Orders tab and pre-fills the form.
 * @param {HTMLElement} button - The button that was clicked.
 * @param {object} source - The advice source object.
 */
export function handleWatchlistBuyClick(button, source) {
    const row = button.closest('tr');
    if (!row) return;

    const ticker = row.dataset.ticker;
    const watchlistId = button.dataset.watchlistId;
    
    // Find the item details from state to get entry prices
    // @ts-ignore
    const item = state.researchWatchlistItems.find(i => String(i.id) === watchlistId);
    
    const prefillData = {
        ticker: ticker,
        advice_source_id: source.id, // Link to the source
        price: item?.rec_entry_low || '',
        limit_price_up: item?.rec_tp1 || '',
        limit_price_down: item?.rec_stop_loss || ''
    };

    // Close the modal
    const modal = document.getElementById('source-details-modal');
    if (modal) modal.classList.remove('visible');

    // Switch to the Orders tab and pass prefill data
    switchView('orders', prefillData);
}