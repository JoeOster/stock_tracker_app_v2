// public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Contains action handlers for the Watchlist (Trade Ideas) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state, updateState } from '../state.js';
import { switchView } from './_navigation.js';
import { showToast } from '../ui/helpers.js';
import { addWatchlistItem } from '../api/watchlist-api.js';

/**
 * Handles submission of the "Add Recommended Trade" form (for Person/Group types).
 * Adds to watchlist (including guidelines).
 * @param {Event} e - The form submission event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddWatchlistSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form'));
    if (!form) return;
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-watchlist-ticker-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    // --- MODIFIED: Get EITHER sourceId or journalId ---
    const formSourceId = form.dataset.sourceId;
    const journalIdInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-journal-id-input'));
    const formJournalId = journalIdInput?.value || null;
    // --- END MODIFIED ---

    const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-ticker-input'));
    const recEntryLowInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-low-input'));
    const recEntryHighInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-high-input'));
    const tp1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp1-input'));
    const tp2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp2-input'));
    const stopLossInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-stop-loss-input'));
    
    const ticker = tickerInput?.value.trim().toUpperCase();

    // --- Validation ---
    if (!ticker) { return showToast('Ticker is required.', 'error'); }
    if (holderId === 'all') { return showToast('"All Accounts" selected.', 'error'); }
    // --- MODIFIED: Validate one (and only one) of source/journal ID is present ---
    if (!formSourceId && !formJournalId) { return showToast('Context missing: No Source ID or Journal ID found.', 'error');}
    if (formSourceId && formJournalId) { return showToast('Context error: Cannot link to both Source and Journal ID.', 'error');}
    // --- END MODIFIED ---

    const recEntryLowStr = recEntryLowInput?.value;
    const recEntryHighStr = recEntryHighInput?.value;
    const recEntryLow = (recEntryLowStr && recEntryLowStr !== '0') ? parseFloat(recEntryLowStr) : null;
    const recEntryHigh = (recEntryHighStr && recEntryHighStr !== '0') ? parseFloat(recEntryHighStr) : null;

    if (recEntryLow !== null && (isNaN(recEntryLow) || recEntryLow < 0)) { return showToast('Invalid Entry Low (must be positive).', 'error'); }
    if (recEntryHigh !== null && (isNaN(recEntryHigh) || recEntryHigh < 0)) { return showToast('Invalid Entry High (must be positive).', 'error'); }
    if (recEntryLow !== null && recEntryHigh !== null && recEntryLow > recEntryHigh) { return showToast('Entry Low cannot be greater than Entry High.', 'error'); }

    const tp1Str = tp1Input?.value;
    const tp2Str = tp2Input?.value;
    const stopLossStr = stopLossInput?.value;
    const recTp1 = (tp1Str && tp1Str !== '0') ? parseFloat(tp1Str) : null;
    const recTp2 = (tp2Str && tp2Str !== '0') ? parseFloat(tp2Str) : null;
    const recStopLoss = (stopLossStr && stopLossStr !== '0') ? parseFloat(stopLossStr) : null;

    if (recTp1 !== null && (isNaN(recTp1) || recTp1 <= 0)) { return showToast('Invalid TP1 (must be positive).', 'error'); }
    if (recTp2 !== null && (isNaN(recTp2) || recTp2 <= 0)) { return showToast('Invalid TP2 (must be positive).', 'error'); }
    if (recStopLoss !== null && (isNaN(recStopLoss) || recStopLoss <= 0)) { return showToast('Invalid Stop Loss (must be positive).', 'error'); }

    addButton.disabled = true;
    try {
        await addWatchlistItem(
            holderId,
            ticker,
            formSourceId || null, // Pass sourceId (or null)
            recEntryLow,
            recEntryHigh,
            recTp1,
            recTp2,
            recStopLoss,
            formJournalId || null // Pass journalId (or null)
        );
        let toastMessage = `${ticker} added to Trade Ideas`;
        
        await refreshDetailsCallback();
        form.reset(); 

        // --- MODIFIED: Hide form again after submit ---
        const formContainer = document.getElementById('add-trade-idea-form-container');
        if (formContainer) formContainer.style.display = 'none';
        // --- END MODIFIED ---
        
        showToast(toastMessage, 'success', 5000);

    } catch (error) {
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error', 10000);
    } finally {
        addButton.disabled = false;
    }
}

/**
 * --- NEW FUNCTION ---
 * Handles click on "Add Idea" button from a Technique row.
 * Pre-fills and shows the "Add Trade Idea" form.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromTechnique(target, refreshDetailsCallback) {
    const { journalId, ticker, entry, tp1, tp2, sl } = target.dataset;

    if (!journalId || !ticker) {
        return showToast('Error: Missing data from technique button.', 'error');
    }

    // Find the "Add Trade Idea" form
    const formContainer = document.getElementById('add-trade-idea-form-container');
    const form = formContainer?.querySelector('form');
    if (!formContainer || !form) {
        return showToast('UI Error: Could not find the "Add Trade Idea" form.', 'error');
    }

    // Clear any old data
    form.reset();
    
    // Set hidden fields
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-journal-id-input'))).value = journalId;
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-ticker-input'))).value = ticker;

    // Pre-fill guidelines from the technique
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-rec-entry-low-input'))).value = entry || '';
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-tp1-input'))).value = tp1 || '';
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-tp2-input'))).value = tp2 || '';
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-rec-stop-loss-input'))).value = sl || '';

    // Show the form and focus
    formContainer.style.display = 'block';
    (/** @type {HTMLInputElement} */(form.querySelector('.add-watchlist-ticker-input'))).focus();
}


/**
 * Handles click on "Buy" button from the watchlist to navigate to Orders page.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreateBuyOrderFromIdea(target) {
    // ... (This function remains unchanged) ...
    const { ticker, price, sourceId, sourceName, tp1, tp2, sl } = target.dataset;
    const holderId = state.selectedAccountHolderId;
    
    if (!ticker || !sourceId || !sourceName || holderId === 'all') {
        return showToast('Error: Missing data (ticker, source) or "All Accounts" selected.', 'error');
    }
    
    if (typeof holderId !== 'number' && typeof holderId !== 'string') { // Allow string ID
        return showToast('Please select a specific account holder before creating an order.', 'error');
    }
    
    updateState({ 
        prefillOrderFromSource: { 
            sourceId: sourceId, 
            sourceName: sourceName,
            ticker: ticker, 
            price: '', 
            tp1: tp1 || null,
            tp2: tp2 || null,
            sl: sl || null
        } 
    });
    
    const detailsModal = document.getElementById('source-details-modal');
    if(detailsModal) detailsModal.classList.remove('visible');

    await switchView('orders', null); 

    showToast(`Navigating to 'Orders' to create BUY order for ${ticker}.`, 'info', 7000);
}

/**
 * Handles click on "Paper" button from the watchlist to pre-fill the journal form.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreatePaperTradeFromIdea(target) {
    // ... (This function remains unchanged) ...
    const { 
        ticker, sourceId, sourceName, 
        entryLow, entryHigh, tp1, tp2, sl 
    } = target.dataset;

    if (!ticker || !sourceId || !sourceName) {
        return showToast('Error: Missing data (ticker, source) to create paper trade.', 'error');
    }

    const researchSubTabs = document.querySelector('.research-sub-tabs');
    const paperTradingTabButton = researchSubTabs?.querySelector('[data-sub-tab="research-paper-trading-panel"]');
    
    if (!(paperTradingTabButton instanceof HTMLElement)) {
         console.error("Could not find Paper Trading tab button to switch.");
         showToast('UI Error: Could not switch to Paper Trading tab.', 'error');
         return;
    }
    
    paperTradingTabButton.click(); 

    setTimeout(() => {
        const paperTradingPanel = document.getElementById('research-paper-trading-panel');
        const journalSubTabs = paperTradingPanel?.querySelector('.journal-sub-tabs');
        const addEntryTabButton = journalSubTabs?.querySelector('[data-sub-tab="journal-add-panel"]');
        
        if(addEntryTabButton instanceof HTMLElement) {
            addEntryTabButton.click();
        } else {
            console.warn("Could not find 'Add Entry' sub-tab button within Paper Trading panel.");
        }

        const adviceSourceSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('journal-advice-source'));
        const tickerInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-ticker'));
        const entryPriceInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-entry-price'));
        const tp1Input = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-target-price'));
        const tp2Input = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-target-price-2'));
        const slInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-stop-loss-price'));
        const quantityInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-quantity'));
        
        let entryPriceGuess = entryHigh || entryLow || '';

        if (adviceSourceSelect) adviceSourceSelect.value = sourceId;
        if (tickerInput) tickerInput.value = ticker;
        if (entryPriceInput) entryPriceInput.value = entryPriceGuess;
        if (tp1Input) tp1Input.value = tp1 || '';
        if (tp2Input) tp2Input.value = tp2 || '';
        if (slInput) slInput.value = sl || '';

        if (quantityInput) {
            quantityInput.focus();
        }

        const detailsModal = document.getElementById('source-details-modal');
        if(detailsModal) detailsModal.classList.remove('visible');

        showToast(`Pre-filling journal entry for ${ticker}.`, 'info');

    }, 150);
}