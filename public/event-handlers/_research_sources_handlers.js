import { addDocument, deleteDocument } from '../api/documents-api.js';
import { addJournalEntry, executeJournalEntry } from '../api/journal-api.js';
import { addWatchlistItem, deleteWatchlistItem } from '../api/watchlist-api.js';
import { fetchSourceDetails, addSourceNote, deleteSourceNote, updateSourceNote } from '../api/sources-api.js';
import { refreshLedger } from '../api/transactions-api.js';
import { updatePricesForView } from '../api/price-api.js';
// /public/event-handlers/_research_sources_handlers.js
/**
 * @file Contains event listener logic for the "Sources" sub-tab of the Research page.
 * @module event-handlers/_research_sources_handlers
 */

import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
// Corrected import path
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
// Import the renderer function needed by the refresh helper

/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;

/**
 * Initializes or re-initializes the event listener for the sources list container.
 * Handles toggling details, adding/deleting child items (watchlist, docs, notes),
 * editing notes, handling the quick add idea form, and the regular add idea button.
 * @param {HTMLElement} sourcesListContainer - The container element (`#sources-list`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
    // Remove the previous listener if it exists to prevent duplicates
    if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
    }

    /**
     * Handles clicks within the sources list.
     * @param {Event} e - The click event.
     * @returns {Promise<void>}
     */
    const newClickHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        // Ensure state.selectedAccountHolderId is treated consistently (string 'all' or number)
        const holderId = (typeof state.selectedAccountHolderId === 'string' && state.selectedAccountHolderId.toLowerCase() === 'all')
            ? 'all'
            : state.selectedAccountHolderId;
        const sourceElement = /** @type {HTMLElement | null} */ (target.closest('.clickable-source'));
        const sourceId = sourceElement?.dataset.sourceId;

        /**
         * Refreshes the details view for the currently interacted source.
         * @async
         * @returns {Promise<void>}
         */
        const refreshDetails = async () => {
            if (sourceElement && sourceId && typeof holderId === 'number') { // Ensure holderId is a number
                const detailsContainer = /** @type {HTMLElement | null} */ (sourceElement.querySelector('.source-details-content'));
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<p><i>Refreshing details...</i></p>';
                    detailsContainer.style.display = 'block';
                    detailsContainer.dataset.isLoading = 'true';
                    try {
                        const refreshedDetails = await fetchSourceDetails(sourceId, holderId);
                    } catch (err) {
                        const error = /** @type {Error} */ (err);
                        showToast(`Error refreshing details: ${error.message}`, 'error');
                         if (detailsContainer) { // Check detailsContainer again
                             detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error refreshing details.</p>';
                             delete detailsContainer.dataset.isLoading;
                         }
                    }
                } else {
                    console.warn("Could not find details container to refresh.");
                }
            } else {
                console.warn("Cannot refresh details - missing sourceElement, sourceId, or specific holderId.");
            }
        };

        // --- Interactive Element Checks ---
        const isLinkClicked = target.closest('a');
        const isFormSubmitButton = target.matches('form button[type="submit"]');
        const isFormResetButton = target.matches('form button[type="reset"]');
        const isDeleteButton = target.closest('.delete-btn');
        const isNoteActionButton = target.closest('.note-actions button, .note-content-edit button');
        const isAddIdeaButton = target.matches('.add-idea-from-source-btn');

        // --- Toggle Details View ---
        if (sourceElement && sourceElement.contains(target) &&
            !target.closest('.source-details-content') &&
            !isLinkClicked && !isFormSubmitButton && !isFormResetButton && !isNoteActionButton && !isAddIdeaButton && !isDeleteButton) {

            const detailsContainer = /** @type {HTMLElement | null} */ (sourceElement.querySelector('.source-details-content'));
            if (!sourceId || holderId === 'all' || !detailsContainer) {
                if(holderId === 'all') showToast("Please select a specific account holder.", "info");
                console.warn("Could not toggle details: Missing sourceId, specific holderId, or detailsContainer.");
                return;
            }
            if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) {
                detailsContainer.style.display = detailsContainer.style.display === 'none' ? 'block' : 'none';
                return;
            }
            try {
                detailsContainer.innerHTML = '<p><i>Loading details...</i></p>';
                detailsContainer.style.display = 'block';
                detailsContainer.dataset.isLoading = 'true';
                // Ensure holderId is passed as number or string expected by API
                const holderIdParam = typeof holderId === 'number' ? String(holderId) : holderId;
                const details = await fetchSourceDetails(sourceId, holderIdParam);
            } catch (error) {
                const err = /** @type {Error} */ (error);
                showToast(`Error loading details: ${err.message}`, 'error');
                if (detailsContainer) { // Check detailsContainer again
                     detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error loading details.</p>';
                     delete detailsContainer.dataset.isLoading;
                }
            }
        }
        // --- Handle Add Idea Button Click (Navigation) ---
        else if (isAddIdeaButton && sourceId) {
             e.stopPropagation(); // Prevent detail toggle if button is inside header
            // 1. Switch main Research sub-tab to Paper Trading
            const researchSubTabs = document.querySelector('.research-sub-tabs');
            const paperTradingTabButton = researchSubTabs?.querySelector('[data-sub-tab="research-paper-trading-panel"]');
            if (paperTradingTabButton instanceof HTMLElement) {
                paperTradingTabButton.click(); // Simulate click to switch tab and load content
                // Use setTimeout to allow DOM updates from tab switch (loading journal template) to complete
                setTimeout(() => {
                    // 2. Switch nested Journal sub-tab to Add Entry
                    const paperTradingPanel = document.getElementById('research-paper-trading-panel');
                    const journalSubTabs = paperTradingPanel?.querySelector('.journal-sub-tabs');
                    const addEntryTabButton = journalSubTabs?.querySelector('[data-sub-tab="journal-add-panel"]');
                    if(addEntryTabButton instanceof HTMLElement) {
                        addEntryTabButton.click(); // Switch to the add form tab within paper trading
                    } else {
                        console.warn("Could not find 'Add Entry' sub-tab button within Paper Trading panel.");
                    }

                    // 3. Pre-fill and focus form elements
                    const adviceSourceSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('journal-advice-source'));
                    const tickerInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-ticker'));

                    if (adviceSourceSelect) {
                        adviceSourceSelect.value = sourceId; // Pre-select the source
                        if (adviceSourceSelect.value !== sourceId) {
                             console.warn(`Could not pre-select advice source ID ${sourceId}. Option might be missing.`);
                             showToast('Could not pre-select advice source.', 'error');
                        }
                    } else {
                         console.warn("Could not find advice source dropdown (#journal-advice-source) to pre-fill.");
                    }

                    if (tickerInput) {
                        tickerInput.focus(); // Focus the ticker input for quick entry
                    }
                    // FIX: Cast target to HTMLElement before accessing dataset
                    const sourceName = (/** @type {HTMLElement} */(target)).dataset?.sourceName ?? 'this source';
                     showToast(`Adding idea from source: ${sourceName}`, 'info');
                }, 150);
            } else {
                 console.error("Could not find Paper Trading tab button to switch.");
                 showToast('UI Error: Could not switch to Paper Trading tab.', 'error');
            }
        }
        // --- Handle Quick Add Idea Form Submission ---
        else if (target.matches('.quick-add-save-btn')) {
             e.preventDefault();
            const form = /** @type {HTMLFormElement | null} */ (target.closest('.quick-add-idea-form'));
            // Ensure holderId is a number before proceeding
            if (!form || typeof holderId !== 'number') {
                 if (holderId === 'all') showToast("Please select a specific account holder.", "error");
                 return;
            }
            const formSourceId = form.dataset.sourceId;
            if (!formSourceId) return showToast('Source ID missing from form.', 'error');

            const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-ticker'));
            const quantityInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-quantity'));
            const entryPriceInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-entry-price'));
            const target1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-target1'));
            const target2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-target2'));
            const stoplossInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-stoploss'));
            const implementCheckbox = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-implement'));
            const saveButton = /** @type {HTMLButtonElement} */ (target);

            if (!tickerInput || !quantityInput || !entryPriceInput || !target1Input || !target2Input || !stoplossInput || !implementCheckbox) { /* ... error checks ... */ return; }

            const ticker = tickerInput.value.trim().toUpperCase();
            const quantityStr = quantityInput.value;
            const entryPriceStr = entryPriceInput.value;
            const target1Str = target1Input.value;
            const target2Str = target2Input.value;
            const stoplossStr = stoplossInput.value;
            const implementTrade = implementCheckbox.checked;

            // Validation
            if (!ticker) return showToast('Ticker is required.', 'error');
            const quantity = parseFloat(quantityStr);
            const entryPrice = parseFloat(entryPriceStr);
            if (implementTrade && (isNaN(quantity) || quantity <= 0)) return showToast('Quantity is required to implement the trade.', 'error');
            if (isNaN(entryPrice) || entryPrice <= 0) return showToast('Entry Price is required and must be positive.', 'error');
            if (!implementTrade && (isNaN(quantity) || quantity < 0)) return showToast('Quantity must be zero or positive.', 'error');

            const target1 = target1Str ? parseFloat(target1Str) : null;
            const target2 = target2Str ? parseFloat(target2Str) : null;
            const stoploss = stoplossStr ? parseFloat(stoplossStr) : null;
            if (target1 !== null && target1 <= entryPrice) return showToast('Target 1 must be greater than Entry Price.', 'error');
            if (target1 !== null && target2 !== null && target2 <= target1) return showToast('Target 2 must be greater than Target 1.', 'error');
            if (target1 == null && target2 !== null && target2 <= entryPrice) return showToast('Target 2 must be greater than Entry Price.', 'error');
            if (stoploss !== null && stoploss >= entryPrice) return showToast('Stop Loss must be less than Entry Price.', 'error');

            saveButton.disabled = true;

             const defaultExchange = state.allExchanges?.find(ex => ex.name.toLowerCase() === 'default') || state.allExchanges?.[0];
             if (!defaultExchange) {
                 saveButton.disabled = false;
                 return showToast('No exchanges defined. Please add one in Settings.', 'error');
             }

            const journalEntryData = {
                account_holder_id: holderId,
                advice_source_id: formSourceId,
                entry_date: getCurrentESTDateString(),
                ticker: ticker,
                exchange: defaultExchange.name,
                direction: 'BUY',
                quantity: quantity || 0,
                entry_price: entryPrice,
                target_price: target1,
                target_price_2: target2,
                stop_loss_price: stoploss,
                entry_reason: `Quick Add from source ${sourceElement?.querySelector('.source-name')?.textContent || sourceId}`,
            };

            try {
                if (implementTrade) {
                    await updatePricesForView(getCurrentESTDateString(), [ticker]);
                    const currentPriceData = state.priceCache.get(ticker);
                    const executionPrice = (currentPriceData && typeof currentPriceData.price === 'number') ? currentPriceData.price : null;

                    if (executionPrice === null || isNaN(executionPrice) || executionPrice <= 0) {
                         throw new Error(`Could not fetch a valid current price for ${ticker} to implement.`);
                    }
                    journalEntryData.entry_price = executionPrice;

                    const newEntry = await addJournalEntry(journalEntryData);
                    const executionData = { execution_date: getCurrentESTDateString(), execution_price: executionPrice, account_holder_id: holderId };
                    const executeResult = await executeJournalEntry(newEntry.id, executionData);

                    showToast(`Implemented BUY for ${ticker} @ ${formatAccounting(executionPrice)}. Tx ID: ${executeResult.transactionId}`, 'success', 7000);
                    await refreshLedger();

                } else {
                    await addJournalEntry(journalEntryData);
                    showToast(`Idea for ${ticker} saved.`, 'success');
                }
                form.reset();
                await refreshDetails();

            } catch (error) {
                 const err = /** @type {Error} */ (error);
                 showToast(`Error saving idea: ${err.message}`, 'error', 7000);
            } finally {
                saveButton.disabled = false;
            }
        }
        // --- Handle Quick Add Idea Form Clear Button ---
        else if (isFormResetButton && target.matches('.quick-add-clear-btn')) {
             const form = /** @type {HTMLFormElement | null} */ (target.closest('.quick-add-idea-form'));
             if (form) {
                 form.reset();
             }
        }
        // --- Handle Other Add Forms ---
        else if (typeof holderId === 'number' && isFormSubmitButton) {
            const addWatchlistForm = /** @type {HTMLFormElement | null} */ (target.closest('.add-watchlist-item-form'));
            const addDocForm = /** @type {HTMLFormElement | null} */ (target.closest('.add-document-form'));
            const addNoteForm = /** @type {HTMLFormElement | null} */ (target.closest('.add-source-note-form'));

            if (addWatchlistForm) {
                e.preventDefault();
                const formSourceId = addWatchlistForm.dataset.sourceId;
                const tickerInput = /** @type {HTMLInputElement | null} */ (addWatchlistForm.querySelector('.add-watchlist-ticker-input'));
                if(!tickerInput) return;
                const ticker = tickerInput.value.trim().toUpperCase();
                if (!ticker) return showToast('Ticker cannot be empty.', 'error');
                if (!formSourceId) return showToast('Source context missing.', 'error');
                // FIX: Cast target to HTMLButtonElement
                (/** @type {HTMLButtonElement} */(target)).disabled = true;
                try {
                    await addWatchlistItem(holderId, ticker, formSourceId);
                    showToast(`${ticker} added to watchlist.`, 'success');
                    tickerInput.value = '';
                    await refreshDetails();
                } catch (error) {
                     const err = /** @type {Error} */ (error);
                     showToast(`Error adding watchlist item: ${err.message}`, 'error');
                } finally {
                    // FIX: Cast target to HTMLButtonElement
                    (/** @type {HTMLButtonElement} */(target)).disabled = false;
                }
            } else if (addDocForm) {
                 e.preventDefault();
                const formSourceId = addDocForm.dataset.sourceId;
                const linkInput = /** @type {HTMLInputElement | null} */ (addDocForm.querySelector('.add-doc-link-input'));
                const titleInput = /** @type {HTMLInputElement | null} */ (addDocForm.querySelector('.add-doc-title-input'));
                const typeInput = /** @type {HTMLInputElement | null} */ (addDocForm.querySelector('.add-doc-type-input'));
                const descriptionTextarea = /** @type {HTMLTextAreaElement | null} */ (addDocForm.querySelector('.add-doc-desc-input'));
                if(!linkInput || !titleInput || !typeInput || !descriptionTextarea) return;

                const link = linkInput.value.trim();
                const title = titleInput.value.trim();
                const type = typeInput.value.trim();
                const description = descriptionTextarea.value.trim();
                if (!link) return showToast('External link is required.', 'error');
                if (!formSourceId) return showToast('Source context missing.', 'error');
                if (!link.startsWith('http://') && !link.startsWith('https://')) { /* ... URL check ... */ }

                // FIX: Cast target to HTMLButtonElement
                (/** @type {HTMLButtonElement} */(target)).disabled = true;
                try {
                    // FIX: Add journal_entry_id: null
                    await addDocument({
                        journal_entry_id: null, // Explicitly set to null
                        advice_source_id: formSourceId,
                        external_link: link,
                        title: title || null,
                        document_type: type || null,
                        description: description || null,
                        account_holder_id: holderId
                    });
                    showToast('Document link added.', 'success');
                    addDocForm.reset();
                    await refreshDetails();
                } catch (error) {
                     const err = /** @type {Error} */ (error);
                     showToast(`Error adding document: ${err.message}`, 'error');
                } finally {
                     // FIX: Cast target to HTMLButtonElement
                    (/** @type {HTMLButtonElement} */(target)).disabled = false;
                }
            } else if (addNoteForm) {
                 e.preventDefault();
                const formSourceId = addNoteForm.dataset.sourceId;
                const contentTextarea = /** @type {HTMLTextAreaElement | null} */ (addNoteForm.querySelector('.add-note-content-textarea'));
                if(!contentTextarea) return;
                const content = contentTextarea.value.trim();
                if (!content) return showToast('Note content cannot be empty.', 'error');
                if (!formSourceId) return showToast('Source context missing.', 'error');

                // FIX: Cast target to HTMLButtonElement
                (/** @type {HTMLButtonElement} */(target)).disabled = true;
                try {
                    await addSourceNote(formSourceId, holderId, content);
                    showToast('Note added.', 'success');
                    contentTextarea.value = '';
                    await refreshDetails();
                } catch (error) {
                     const err = /** @type {Error} */ (error);
                     showToast(`Error adding note: ${err.message}`, 'error');
                } finally {
                     // FIX: Cast target to HTMLButtonElement
                    (/** @type {HTMLButtonElement} */(target)).disabled = false;
                }
            }
        } else if (isFormSubmitButton && holderId === 'all') {
            showToast("Please select a specific account holder first.", "info");
        }
        // --- Handle Delete Buttons ---
        else if (isDeleteButton) {
             e.stopPropagation();
             if (!sourceId || typeof holderId !== 'number') return showToast('Cannot delete. Context missing or "All Accounts" selected.', 'error');

            let confirmTitle = 'Confirm Deletion';
            let confirmBody = 'Are you sure? This cannot be undone.';
            /** @type {() => Promise<void>} */
            let deleteAction = async () => {};

            const deleteWatchlistBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-watchlist-item-button'));
            const deleteDocumentBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-document-button'));
            const deleteNoteBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-source-note-button'));

            if (deleteWatchlistBtn) { /* ... delete watchlist logic ... */
                 const itemId = deleteWatchlistBtn.dataset.itemId;
                if (!itemId) return;
                confirmTitle = 'Delete Watchlist Item?';
                deleteAction = async () => { await deleteWatchlistItem(itemId); showToast('Watchlist item removed.', 'success'); };
            } else if (deleteDocumentBtn) { /* ... delete document logic ... */
                 const docId = deleteDocumentBtn.dataset.docId;
                if (!docId) return;
                confirmTitle = 'Delete Document Link?';
                deleteAction = async () => { await deleteDocument(docId); showToast('Document link deleted.', 'success'); };
            } else if (deleteNoteBtn) { /* ... delete note logic ... */
                 const noteLi = target.closest('li[data-note-id]');
                const noteId = /** @type {HTMLElement} */ (noteLi)?.dataset.noteId;
                if (!noteId) return;
                confirmTitle = 'Delete Note?';
                deleteAction = async () => { await deleteSourceNote(sourceId, noteId, holderId); showToast('Note deleted.', 'success'); };
            } else { return; }

            showConfirmationModal(confirmTitle, confirmBody, async () => {
                try {
                    await deleteAction();
                    await refreshDetails();
                } catch (error) {
                     const err = /** @type {Error} */ (error);
                     showToast(`Delete failed: ${err.message}`, 'error');
                }
            });
        }
        // --- Handle Edit/Save/Cancel Note Buttons ---
        else if (isNoteActionButton) {
            const noteLi = /** @type {HTMLElement | null} */ (target.closest('li[data-note-id]'));
            if (noteLi && sourceId && typeof holderId === 'number') {
                 const noteId = noteLi.dataset.noteId;
                 const displayDiv = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-content-display'));
                 const editDiv = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-content-edit'));
                 const editBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.edit-source-note-button'));
                 const saveBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.save-edit-note-button'));
                 const cancelBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.cancel-edit-note-button'));
                 const textarea = /** @type {HTMLTextAreaElement | null} */ (editDiv?.querySelector('.edit-note-textarea'));
                 const noteActions = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-actions'));

                 if (!noteId || !displayDiv || !editDiv || !editBtn || !saveBtn || !cancelBtn || !textarea || !noteActions) { return; }

                 if (target === editBtn) { /* ... edit toggle ... */
                    e.stopPropagation();
                    displayDiv.style.display = 'none';
                    noteActions.style.display = 'none';
                    editDiv.style.display = 'block';
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
                 } else if (target === cancelBtn) { /* ... cancel toggle ... */
                    e.stopPropagation();
                    editDiv.style.display = 'none';
                    displayDiv.style.display = 'block';
                    noteActions.style.display = '';
                 } else if (target === saveBtn) { /* ... save logic ... */
                     e.stopPropagation();
                     const newContent = textarea.value.trim();
                     if (!newContent) { return showToast('Note content cannot be empty.', 'error'); }

                     saveBtn.disabled = true;
                     cancelBtn.disabled = true;
                     try {
                         await updateSourceNote(sourceId, noteId, holderId, newContent);
                         showToast('Note updated.', 'success');
                         await refreshDetails();
                     } catch (error) {
                         const err = /** @type {Error} */ (error);
                         showToast(`Error updating note: ${err.message}`, 'error');
                         const currentSaveBtn = noteLi.querySelector('.save-edit-note-button');
                         const currentCancelBtn = noteLi.querySelector('.cancel-edit-note-button');
                         if (currentSaveBtn instanceof HTMLButtonElement) currentSaveBtn.disabled = false;
                         if (currentCancelBtn instanceof HTMLButtonElement) currentCancelBtn.disabled = false;
                     }
                 }
            }
        }

    }; // End of newClickHandler

    sourcesListContainer.addEventListener('click', newClickHandler);
    currentSourcesListClickHandler = newClickHandler;
}
