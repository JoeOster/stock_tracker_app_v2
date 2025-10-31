// /public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Contains action handlers for the Watchlist (Trade Ideas) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state, updateState } from '../state.js';
import { switchView } from './_navigation.js';
import { showToast } from '../ui/helpers.js';
import { addWatchlistItem } from '../api/watchlist-api.js';

/**
 * --- NEW FUNCTION ---
 * Initializes the submit handler for the new "Add Trade Idea" modal.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {void}
 */
export function initializeAddTradeIdeaModalHandler(refreshDetailsCallback) {
    const addIdeaModal = document.getElementById('add-trade-idea-modal');
    const addIdeaForm = /** @type {HTMLFormElement} */ (document.getElementById('add-trade-idea-form'));

    if (addIdeaForm && addIdeaModal) {
        
        // --- ADDED: Link dropdown change to hidden journal ID input ---
        const techniqueSelect = /** @type {HTMLSelectElement} */(document.getElementById('idea-form-technique-select'));
        const journalIdInput = /** @type {HTMLInputElement} */(document.getElementById('idea-form-journal-id'));
        if (techniqueSelect && journalIdInput) {
            techniqueSelect.addEventListener('change', () => {
                journalIdInput.value = techniqueSelect.value;
            });
        }
        // --- END ADDED ---

        addIdeaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const addButton = /** @type {HTMLButtonElement} */ (document.getElementById('add-trade-idea-submit-btn'));
            const holderId = state.selectedAccountHolderId;

            // Get context from hidden fields
            const formSourceId = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-source-id'))).value || null;
            // Get journal ID from the *hidden input*, which is controlled by the dropdown
            const formJournalId = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-journal-id'))).value || null;
            
            // Get form values
            const ticker = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-ticker'))).value.trim().toUpperCase();
            const recEntryLowStr = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-entry-low'))).value;
            const recEntryHighStr = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-entry-high'))).value;
            const tp1Str = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-tp1'))).value;
            const tp2Str = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-tp2'))).value;
            const stopLossStr = (/** @type {HTMLInputElement} */(document.getElementById('idea-form-stop-loss'))).value;

            // --- Validation ---
            if (!ticker) { return showToast('Ticker is required.', 'error'); }
            if (holderId === 'all') { return showToast('"All Accounts" selected.', 'error'); }
            // An idea MUST be linked to at least a source.
            if (!formSourceId) { return showToast('Context missing: No Source ID found.', 'error');}
            // --- End Validation ---

            const recEntryLow = (recEntryLowStr && recEntryLowStr !== '0') ? parseFloat(recEntryLowStr) : null;
            const recEntryHigh = (recEntryHighStr && recEntryHighStr !== '0') ? parseFloat(recEntryHighStr) : null;
            if (recEntryLow !== null && (isNaN(recEntryLow) || recEntryLow < 0)) { return showToast('Invalid Entry Low (must be positive).', 'error'); }
            if (recEntryHigh !== null && (isNaN(recEntryHigh) || recEntryHigh < 0)) { return showToast('Invalid Entry High (must be positive).', 'error'); }
            if (recEntryLow !== null && recEntryHigh !== null && recEntryLow > recEntryHigh) { return showToast('Entry Low cannot be greater than Entry High.', 'error'); }

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
                    formSourceId, // Pass sourceId
                    recEntryLow,
                    recEntryHigh,
                    recTp1,
                    recTp2,
                    recStopLoss,
                    formJournalId // Pass journalId
                );
                
                showToast(`${ticker} added to Trade Ideas`, 'success', 5000);
                addIdeaForm.reset();
                addIdeaModal.classList.remove('visible');
                
                // Refresh the underlying source details modal
                await refreshDetailsCallback();

            } catch (error) {
                const err = /** @type {Error} */ (error);
                showToast(`Error: ${err.message}`, 'error', 10000);
            } finally {
                addButton.disabled = false;
            }
        });
    }
}


/**
 * --- NEW FUNCTION ---
 * Handles click on "Add Idea" button from the main Source profile (Person/Group).
 * Pre-fills and shows the new "Add Trade Idea" modal.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromSource(target) {
    const { sourceId, sourceName } = target.dataset;

    if (!sourceId || !sourceName) {
        return showToast('Error: Missing data from source button.', 'error');
    }

    // Find the new "Add Trade Idea" modal
    const addIdeaModal = document.getElementById('add-trade-idea-modal');
    const addIdeaForm = /** @type {HTMLFormElement} */ (document.getElementById('add-trade-idea-form'));
    
    if (!addIdeaModal || !addIdeaForm) {
        return showToast('UI Error: Could not find the "Add Trade Idea" modal.', 'error');
    }

    // Reset form
    addIdeaForm.reset();

    // Set context (linking to the source)
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-source-id'))).value = sourceId;
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-journal-id'))).value = '';
    
    // Set the link display text
    const linkDisplaySpan = document.querySelector('#idea-form-link-display span');
    if (linkDisplaySpan) {
        linkDisplaySpan.textContent = `Source: "${sourceName}"`;
    }

    // --- HIDE the technique dropdown ---
    const techniqueGroup = document.getElementById('idea-form-technique-group');
    if (techniqueGroup) techniqueGroup.style.display = 'none';
    (/** @type {HTMLSelectElement} */(document.getElementById('idea-form-technique-select'))).disabled = true;
    // ---

    // Set the date to now
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-date'))).value = localDateTime;
    
    // Show the modal
    addIdeaModal.classList.add('visible');
    
    // Focus the ticker input
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-ticker'))).focus();
}


/**
 * --- NEW FUNCTION ---
 * Handles click on "Add Idea" button from the main Source profile (Book/Website).
 * Populates and shows the "Add Trade Idea" modal with the technique dropdown.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques for this source.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromBook(target, journalEntries) {
    const { sourceId, sourceName } = target.dataset;

    if (!sourceId || !sourceName) return showToast('Error: Missing data from source button.', 'error');

    const addIdeaModal = document.getElementById('add-trade-idea-modal');
    const addIdeaForm = /** @type {HTMLFormElement} */ (document.getElementById('add-trade-idea-form'));
    
    if (!addIdeaModal || !addIdeaForm) return showToast('UI Error: Could not find "Add Trade Idea" modal.', 'error');

    // Reset form
    addIdeaForm.reset();

    // Set context
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-source-id'))).value = sourceId;
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-journal-id'))).value = ''; // Clear journal ID
    
    // Set link display
    const linkDisplaySpan = document.querySelector('#idea-form-link-display span');
    if (linkDisplaySpan) linkDisplaySpan.textContent = `Source: "${sourceName}"`;

    // --- POPULATE AND SHOW the technique dropdown ---
    const techniqueGroup = document.getElementById('idea-form-technique-group');
    const techniqueSelect = /** @type {HTMLSelectElement} */(document.getElementById('idea-form-technique-select'));
    
    if (techniqueGroup && techniqueSelect) {
        techniqueSelect.innerHTML = '<option value="">-- None (Link to Source Only) --</option>'; // Default
        
        const openTechniques = (journalEntries || []).filter(j => j.status === 'OPEN');
        
        if (openTechniques.length > 0) {
            openTechniques.forEach(tech => {
                const option = document.createElement('option');
                option.value = String(tech.id);
                option.textContent = tech.entry_reason || `Technique #${tech.id}`;
                techniqueSelect.appendChild(option);
            });
            
            techniqueSelect.disabled = false;
            techniqueGroup.style.display = 'block'; // Show the dropdown
        } else {
            techniqueGroup.style.display = 'none'; // Hide if no techniques
            techniqueSelect.disabled = true;
        }
    }
    // ---
    
    // Set date
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-date'))).value = localDateTime;
    
    addIdeaModal.classList.add('visible');
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-ticker'))).focus();
}


/**
 * --- MODIFIED FUNCTION ---
 * Handles click on "Add Idea" button from a Technique row.
 * Pre-fills and shows the **new "Add Trade Idea" modal**.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of all techniques for this source.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromTechnique(target, journalEntries) {
    const { journalId, ticker, entry, tp1, tp2, sl } = target.dataset;
    
    if (!journalId) return showToast('Error: Missing data from technique button.', 'error');

    // Find the new "Add Trade Idea" modal
    const addIdeaModal = document.getElementById('add-trade-idea-modal');
    const addIdeaForm = /** @type {HTMLFormElement} */ (document.getElementById('add-trade-idea-form'));
    
    if (!addIdeaModal || !addIdeaForm) return showToast('UI Error: Could not find "Add Trade Idea" modal.', 'error');

    // Reset form
    addIdeaForm.reset();

    // Set context
    const sourceId = target.closest('#source-details-modal')?.dataset.sourceId;
    if (sourceId) {
        (/** @type {HTMLInputElement} */(document.getElementById('idea-form-source-id'))).value = sourceId;
    }
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-journal-id'))).value = journalId;
    
    // --- POPULATE, SHOW, AND DISABLE the technique dropdown ---
    const techniqueGroup = document.getElementById('idea-form-technique-group');
    const techniqueSelect = /** @type {HTMLSelectElement} */(document.getElementById('idea-form-technique-select'));
    
    if (techniqueGroup && techniqueSelect) {
        techniqueSelect.innerHTML = ''; // Clear
        
        const openTechniques = (journalEntries || []).filter(j => j.status === 'OPEN');

        if (openTechniques.length > 0) {
             openTechniques.forEach(tech => {
                const option = document.createElement('option');
                option.value = String(tech.id);
                option.textContent = tech.entry_reason || `Technique #${tech.id}`;
                techniqueSelect.appendChild(option);
            });
        } else {
            // Add the selected one even if it's not found (shouldn't happen)
            const option = document.createElement('option');
            option.value = journalId;
            option.textContent = target.closest('tr')?.querySelector('td:nth-child(3)')?.textContent || `Technique #${journalId}`;
            techniqueSelect.appendChild(option);
        }

        // Pre-select and disable
        techniqueSelect.value = journalId;
        techniqueSelect.disabled = true;
        techniqueGroup.style.display = 'block'; // Show it
    }
    // ---
    
    // Set link display
    const linkDisplaySpan = document.querySelector('#idea-form-link-display span');
    if (linkDisplaySpan) {
        const techniqueDescription = techniqueSelect.options[techniqueSelect.selectedIndex].text;
        linkDisplaySpan.textContent = `Technique: "${techniqueDescription.trim()}"`;
    }

    // Pre-fill form fields
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-ticker'))).value = (ticker !== 'N/A' ? ticker : '') || '';
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-entry-low'))).value = entry || '';
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-tp1'))).value = tp1 || '';
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-tp2'))).value = tp2 || '';
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-stop-loss'))).value = sl || '';

    // Set date
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-date'))).value = localDateTime;
    
    addIdeaModal.classList.add('visible');
    (/** @type {HTMLInputElement} */(document.getElementById('idea-form-ticker'))).focus();
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

/**
 * @deprecated This function is no longer used as the form has been moved to a separate modal.
 */
export async function handleAddWatchlistSubmit(e, refreshDetailsCallback) {
    console.warn("DEPRECATED: handleAddWatchlistSubmit was called. Logic has moved to initializeAddTradeIdeaModalHandler.");
}