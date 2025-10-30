// public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Handles Watchlist and Buy actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state, updateState } from '../state.js';
import { addWatchlistItem, addPendingOrder } from '../api.js';
import { switchView } from './_navigation.js';
import { showToast } from '../ui/helpers.js';
import { autosizeAccountSelector } from './_navigation.js';

/**
 * Handles submission of the "Add Recommended Trade" form.
 * Adds to watchlist (including guidelines).
 * @param {Event} e - The form submission event.
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddWatchlistSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form'));
    if (!form) return;
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-watchlist-ticker-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-ticker-input'));
    // Get Low/High Inputs
    const recEntryLowInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-low-input'));
    const recEntryHighInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-high-input'));
    // Get Guideline Inputs
    const tp1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp1-input'));
    const tp2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp2-input'));
    const stopLossInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-stop-loss-input'));
    const recDatetimeInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-datetime-input'));
    
    const ticker = tickerInput?.value.trim().toUpperCase();

    // --- Validation ---
    if (!ticker) { return showToast('Ticker is required.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }

    // Validate Low/High
    const recEntryLowStr = recEntryLowInput?.value;
    const recEntryHighStr = recEntryHighInput?.value;
    const recEntryLow = (recEntryLowStr && recEntryLowStr !== '0') ? parseFloat(recEntryLowStr) : null;
    const recEntryHigh = (recEntryHighStr && recEntryHighStr !== '0') ? parseFloat(recEntryHighStr) : null;

    if (recEntryLow !== null && (isNaN(recEntryLow) || recEntryLow < 0)) { return showToast('Invalid Entry Low (must be positive).', 'error'); }
    if (recEntryHigh !== null && (isNaN(recEntryHigh) || recEntryHigh < 0)) { return showToast('Invalid Entry High (must be positive).', 'error'); }
    if (recEntryLow !== null && recEntryHigh !== null && recEntryLow > recEntryHigh) { return showToast('Entry Low cannot be greater than Entry High.', 'error'); }

    // Validate Guidelines
    const tp1Str = tp1Input?.value;
    const tp2Str = tp2Input?.value;
    const stopLossStr = stopLossInput?.value;
    const recTp1 = (tp1Str && tp1Str !== '0') ? parseFloat(tp1Str) : null;
    const recTp2 = (tp2Str && tp2Str !== '0') ? parseFloat(tp2Str) : null;
    const recStopLoss = (stopLossStr && stopLossStr !== '0') ? parseFloat(stopLossStr) : null;

    if (recTp1 !== null && (isNaN(recTp1) || recTp1 <= 0)) { return showToast('Invalid TP1 (must be positive).', 'error'); }
    if (recTp2 !== null && (isNaN(recTp2) || recTp2 <= 0)) { return showToast('Invalid TP2 (must be positive).', 'error'); }
    if (recStopLoss !== null && (isNaN(recStopLoss) || recStopLoss <= 0)) { return showToast('Invalid Stop Loss (must be positive).', 'error'); }
    // Add cross-validation if needed (e.g., TP > Entry High, Stop < Entry Low)


    addButton.disabled = true;
    try {
        // Step 1: Always add to watchlist (now includes all guidelines)
        await addWatchlistItem(holderId, ticker, formSourceId, recEntryLow, recEntryHigh, recTp1, recTp2, recStopLoss);
        let toastMessage = `${ticker} added to Trade Ideas`;
        
        // Step 2: Refresh details modal content and reset form
        await refreshDetailsCallback();
        form.reset(); // Reset the form in the modal
        
        // Set date back to default after reset
        const dateInput = form.querySelector('.add-watchlist-rec-datetime-input');
        if (dateInput instanceof HTMLInputElement) {
            const now = new Date();
            const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            dateInput.value = localDateTime;
        }

        showToast(toastMessage, 'success', 5000);

    } catch (error) {
        // Assert error as Error type for message access
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error', 10000);
    } finally {
        addButton.disabled = false;
    }
}

/**
 * Handles click on "Buy" button from the watchlist to navigate to Orders page.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreateBuyOrderFromIdea(target) {
    const { ticker, price, sourceId } = target.dataset;
    // Find the source name from the modal title (a bit of a hack, but avoids another data attribute)
    const modalTitle = document.getElementById('source-details-modal-title')?.textContent || '';
    const sourceName = modalTitle.replace('Source Details: ', '').trim();

    const holderId = state.selectedAccountHolderId;
    
    if (!ticker || !sourceId || !sourceName || holderId === 'all') {
        return showToast('Error: Missing data (ticker, source) or "All Accounts" selected.', 'error');
    }
    
    // Ensure holderId is a number for this action
    if (typeof holderId !== 'number') {
        return showToast('Please select a specific account holder before creating an order.', 'error');
    }

    // --- MODIFICATION: Set price to an empty string ---
    console.log(`Create Buy Order for ${ticker}, Source: ${sourceId}, Holder: ${holderId}. Price field will be empty.`);
    
    updateState({ 
        prefillOrderFromSource: { 
            sourceId: sourceId, 
            sourceName: sourceName, // Pass the name for the lock message
            ticker: ticker, 
            price: '' // <-- THIS IS THE FIX: Pass empty string
        } 
    });
    // --- END MODIFICATION ---
    
    // Close the source details modal *before* navigating
    const detailsModal = document.getElementById('source-details-modal');
    if(detailsModal) detailsModal.classList.remove('visible');

    await switchView('orders', null); // Navigate to Orders tab

    // Note: Pre-fill logic is now handled by loadOrdersPage
    showToast(`Navigating to 'Orders' to create BUY order for ${ticker}.`, 'info', 7000);
}