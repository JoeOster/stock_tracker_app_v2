import { addPendingOrder } from '../api/orders-api.js';
import { addWatchlistItem } from '../api/watchlist-api.js';
// public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Handles Watchlist and Buy actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state, updateState } from '../state.js';
import { switchView } from './_navigation.js';
import { showToast } from '../ui/helpers.js';
import { autosizeAccountSelector } from './_navigation.js';

/**
 * Handles submission of the "Add Recommended Trade" form.
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
    // --- UPDATED: Destructure tp1, tp2, and sl ---
    const { ticker, price, sourceId, sourceName, tp1, tp2, sl } = target.dataset;
    const holderId = state.selectedAccountHolderId;
    
    if (!ticker || !sourceId || !sourceName || holderId === 'all') {
        return showToast('Error: Missing data (ticker, source) or "All Accounts" selected.', 'error');
    }
    
    // Ensure holderId is a number for this action
    if (typeof holderId !== 'number' && typeof holderId !== 'string') { // Allow string ID
        return showToast('Please select a specific account holder before creating an order.', 'error');
    }
    
    // Set price to an empty string to allow manual entry,
    console.log(`Create Buy Order for ${ticker}, Source: ${sourceId}, Holder: ${holderId}.`);
    
    // --- UPDATED: Add guidelines to prefill state ---
    updateState({ 
        prefillOrderFromSource: { 
            sourceId: sourceId, 
            sourceName: sourceName, // Pass the name for the lock message
            ticker: ticker, 
            price: '', // Pass empty string to allow manual price entry
            tp1: tp1 || null,
            tp2: tp2 || null,
            sl: sl || null
        } 
    });
    
    // Close the source details modal *before* navigating
    const detailsModal = document.getElementById('source-details-modal');
    if(detailsModal) detailsModal.classList.remove('visible');

    await switchView('orders', null); // Navigate to Orders tab

    // Note: Pre-fill logic is now handled by loadOrdersPage
    showToast(`Navigating to 'Orders' to create BUY order for ${ticker}.`, 'info', 7000);
}

/**
 * Handles click on "Paper" button from the watchlist to pre-fill the journal form.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreatePaperTradeFromIdea(target) {
    const { 
        ticker, sourceId, sourceName, 
        entryLow, entryHigh, tp1, tp2, sl 
    } = target.dataset;

    if (!ticker || !sourceId || !sourceName) {
        return showToast('Error: Missing data (ticker, source) to create paper trade.', 'error');
    }

    // 1. Switch main Research sub-tab to Paper Trading
    const researchSubTabs = document.querySelector('.research-sub-tabs');
    const paperTradingTabButton = researchSubTabs?.querySelector('[data-sub-tab="research-paper-trading-panel"]');
    
    if (!(paperTradingTabButton instanceof HTMLElement)) {
         console.error("Could not find Paper Trading tab button to switch.");
         showToast('UI Error: Could not switch to Paper Trading tab.', 'error');
         return;
    }
    
    // Click the tab, which will also trigger loadResearchPage for the journal
    paperTradingTabButton.click(); 

    // Use setTimeout to allow DOM updates from tab switch (loading journal template) to complete
    setTimeout(() => {
        // 2. Switch nested Journal sub-tab to Add Entry
        const paperTradingPanel = document.getElementById('research-paper-trading-panel');
        const journalSubTabs = paperTradingPanel?.querySelector('.journal-sub-tabs');
        const addEntryTabButton = journalSubTabs?.querySelector('[data-sub-tab="journal-add-panel"]');
        
        if(addEntryTabButton instanceof HTMLElement) {
            addEntryTabButton.click(); // Switch to the add form tab
        } else {
            console.warn("Could not find 'Add Entry' sub-tab button within Paper Trading panel.");
        }

        // 3. Pre-fill and focus form elements
        const adviceSourceSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('journal-advice-source'));
        const tickerInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-ticker'));
        const entryPriceInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-entry-price'));
        const tp1Input = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-target-price'));
        const tp2Input = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-target-price-2'));
        const slInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-stop-loss-price'));
        const quantityInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-quantity'));
        
        // Determine best entry price to pre-fill
        let entryPriceGuess = entryHigh || entryLow || '';

        if (adviceSourceSelect) adviceSourceSelect.value = sourceId;
        if (tickerInput) tickerInput.value = ticker;
        if (entryPriceInput) entryPriceInput.value = entryPriceGuess;
        if (tp1Input) tp1Input.value = tp1 || '';
        if (tp2Input) tp2Input.value = tp2 || '';
        if (slInput) slInput.value = sl || '';

        if (quantityInput) {
            quantityInput.focus(); // Focus the quantity input
        }

        // Close the source details modal *after* navigating and pre-filling
        const detailsModal = document.getElementById('source-details-modal');
        if(detailsModal) detailsModal.classList.remove('visible');

        showToast(`Pre-filling journal entry for ${ticker}.`, 'info');

    }, 150); // 150ms delay to allow tabs to switch and render
}