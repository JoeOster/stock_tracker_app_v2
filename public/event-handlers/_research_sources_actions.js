// public/event-handlers/_research_sources_actions.js
/**
 * @file Handles specific actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions
 */

import { state } from '../state.js';
import {
    addWatchlistItem, addDocument, addSourceNote, deleteWatchlistItem,
    deleteDocument, deleteSourceNote, updateSourceNote, addPendingOrder,
    updatePricesForView,
    refreshLedger
} from '../api.js';
import { switchView } from './_navigation.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
// @ts-ignore
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

// --- Action Handlers ---

/**
 * Handles submission of the "Add Recommended Trade" form.
 * Adds to watchlist (including guidelines) and optionally navigates to Orders page.
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
    const createBuyCheckbox = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-create-buy-checkbox'));

    const ticker = tickerInput?.value.trim().toUpperCase();
    const createBuy = createBuyCheckbox?.checked ?? false;

    // --- Validation ---
    if (!ticker) { return showToast('Ticker is required.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }

    // Validate Low/High
    const recEntryLowStr = recEntryLowInput?.value;
    const recEntryHighStr = recEntryHighInput?.value;
    const recEntryLow = (recEntryLowStr && recEntryLowStr !== '0') ? parseFloat(recEntryLowStr) : null;
    const recEntryHigh = (recEntryHighStr && recEntryHighStr !== '0') ? parseFloat(recEntryHighStr) : null;

    if (recEntryLow !== null && (isNaN(recEntryLow) || recEntryLow < 0)) { return showToast('Invalid Rec. Entry Low (must be positive).', 'error'); }
    if (recEntryHigh !== null && (isNaN(recEntryHigh) || recEntryHigh < 0)) { return showToast('Invalid Rec. Entry High (must be positive).', 'error'); }
    if (recEntryLow !== null && recEntryHigh !== null && recEntryLow > recEntryHigh) { return showToast('Rec. Entry Low cannot be greater than Rec. Entry High.', 'error'); }

    // Validate Guidelines
    const tp1Str = tp1Input?.value;
    const tp2Str = tp2Input?.value;
    const stopLossStr = stopLossInput?.value;
    const recTp1 = (tp1Str && tp1Str !== '0') ? parseFloat(tp1Str) : null;
    const recTp2 = (tp2Str && tp2Str !== '0') ? parseFloat(tp2Str) : null;
    const recStopLoss = (stopLossStr && stopLossStr !== '0') ? parseFloat(stopLossStr) : null;

    if (recTp1 !== null && (isNaN(recTp1) || recTp1 <= 0)) { return showToast('Invalid Rec. TP1 (must be positive).', 'error'); }
    if (recTp2 !== null && (isNaN(recTp2) || recTp2 <= 0)) { return showToast('Invalid Rec. TP2 (must be positive).', 'error'); }
    if (recStopLoss !== null && (isNaN(recStopLoss) || recStopLoss <= 0)) { return showToast('Invalid Rec. Stop Loss (must be positive).', 'error'); }
    // Add cross-validation if needed (e.g., TP > Entry High, Stop < Entry Low)


    addButton.disabled = true;
    try {
        // Step 1: Always add to watchlist (now includes all guidelines)
        await addWatchlistItem(holderId, ticker, formSourceId, recEntryLow, recEntryHigh, recTp1, recTp2, recStopLoss);
        let toastMessage = `${ticker} added to Recommended Trades`;

        // Step 2: If checkbox checked, navigate and pre-fill Orders form
        if (createBuy && typeof holderId === 'number') { // Ensure holderId is a number
            console.log("Create Buy checked, navigating to Orders page...");
            // Close the source details modal *before* navigating
            const detailsModal = document.getElementById('source-details-modal');
            if(detailsModal) detailsModal.classList.remove('visible');

            await switchView('orders', null); // Navigate to Orders tab

            // Use setTimeout to allow the DOM for the Orders page to render
            setTimeout(() => {
                console.log("Attempting to pre-fill Orders form...");
                const orderTickerInput = /** @type {HTMLInputElement | null} */(document.getElementById('ticker'));
                const orderAccountSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('add-tx-account-holder'));
                const orderQuantityInput = /** @type {HTMLInputElement | null} */(document.getElementById('quantity')); // For focus

                if (orderTickerInput) {
                    orderTickerInput.value = ticker; // Pre-fill ticker
                    console.log(`Pre-filled ticker: ${ticker}`);
                } else {
                    console.warn("Could not find Ticker input on Orders page.");
                }
                if (orderAccountSelect) {
                    orderAccountSelect.value = String(holderId); // Pre-select account holder
                    console.log(`Pre-selected account holder: ${holderId}`);
                    if (orderAccountSelect.value !== String(holderId)) {
                        console.warn(`Failed to pre-select account holder ${holderId}.`);
                    }
                     // Trigger autosize for the account selector if needed
                     const navigationModule = import('./_navigation.js');
                     navigationModule.then(mod => {
                         if (mod.autosizeAccountSelector) {
                             mod.autosizeAccountSelector(orderAccountSelect);
                         }
                     });
                } else {
                     console.warn("Could not find Account Holder select on Orders page.");
                }
                // Focus quantity for quick entry
                if (orderQuantityInput) {
                    orderQuantityInput.focus();
                    console.log("Focused Quantity input.");
                }

                // Add source info as a hint (maybe placeholder or small text) - Optional
                const addButtonOrders = document.querySelector('#add-transaction-form button[type="submit"]');
                if (addButtonOrders) {
                    // This is just an example, could add a small <p> tag instead
                    // @ts-ignore
                    addButtonOrders.title = `Source ID: ${formSourceId}`;
                }

            }, 150); // Small delay to ensure Orders page DOM is ready

            toastMessage += `. Navigate to 'Orders' to complete BUY details.`;
            // Do NOT refresh details modal immediately as we are navigating away
            form.reset(); // Reset the form in the modal

        } else {
             // If not creating buy order, just refresh the details modal content
             if (!createBuy) { // Ensure refresh only happens if NOT navigating
                await refreshDetailsCallback();
                form.reset(); // Reset the form in the modal
             }
        }

        showToast(toastMessage, 'success', createBuy ? 10000 : 5000); // Longer toast if navigating


    } catch (error) {
        // Assert error as Error type for message access
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error', 10000);
    } finally {
        addButton.disabled = false;
    }
}


/**
 * Handles submission of the "Add Document Link" form.
 * @param {Event} e - The form submission event.
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddDocumentSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form'));
    if (!form) return;
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-document-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const titleInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-doc-title-input'));
    const typeInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-doc-type-input'));
    const linkInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-doc-link-input'));
    const descInput = /** @type {HTMLTextAreaElement | null} */ (form.querySelector('.add-doc-desc-input'));

    const link = linkInput?.value.trim();
    if (!link) { return showToast('External link is required.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }
    // Basic URL validation
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
        console.warn("Adding document link that doesn't start with http/https:", link);
    }

    /** @type {import('../api.js').DocumentData} */
    const documentData = {
        advice_source_id: formSourceId,
        external_link: link,
        title: titleInput?.value.trim() || null,
        document_type: typeInput?.value.trim() || null,
        description: descInput?.value.trim() || null,
        // @ts-ignore
        account_holder_id: holderId,
        journal_entry_id: null // Explicitly null
    };

    addButton.disabled = true;
    try {
        await addDocument(documentData);
        showToast('Document link added.', 'success');
        form.reset();
        await refreshDetailsCallback();
    } catch (error) {
         // Assert error as Error type for message access
         const err = /** @type {Error} */ (error);
        showToast(`Error adding document: ${err.message}`, 'error');
    } finally {
        addButton.disabled = false;
    }
}

/**
 * Handles submission of the "Add Note" form.
 * @param {Event} e - The form submission event.
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddNoteSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form'));
    if (!form) return;
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-source-note-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const contentTextarea = /** @type {HTMLTextAreaElement | null} */ (form.querySelector('.add-note-content-textarea'));
    const noteContent = contentTextarea?.value.trim();

    if (!noteContent) { return showToast('Note content cannot be empty.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }

    addButton.disabled = true;
    try {
        await addSourceNote(formSourceId, holderId, noteContent);
        showToast('Note added.', 'success');
        if (contentTextarea) contentTextarea.value = ''; // Clear textarea
        await refreshDetailsCallback();
    } catch (error) {
         // Assert error as Error type for message access
         const err = /** @type {Error} */ (error);
        showToast(`Error adding note: ${err.message}`, 'error');
    } finally {
        addButton.disabled = false;
    }
}

/**
 * Handles clicks on delete buttons within the source details modal content.
 * @param {HTMLElement} target - The clicked element.
 * @param {string} sourceId - The ID of the source context (from modal dataset).
 * @param {string|number} holderId - The current account holder ID (from modal dataset).
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleDeleteClick(target, sourceId, holderId, refreshDetailsCallback) {
    const deleteWatchlistBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-watchlist-item-button'));
    const deleteDocumentBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-document-button'));
    const deleteNoteBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-source-note-button'));

    if (!deleteWatchlistBtn && !deleteDocumentBtn && !deleteNoteBtn) return; // Not a delete button we handle here

    let confirmTitle = 'Confirm Deletion';
    let confirmBody = 'Are you sure? This cannot be undone.';
    /** @type {(() => Promise<any>) | null} */
    let deleteAction = null;

    if (deleteWatchlistBtn) {
        const itemId = deleteWatchlistBtn.dataset.itemId;
        if (!itemId) return;
        confirmTitle = 'Delete Recommended Trade?';
        deleteAction = async () => deleteWatchlistItem(itemId);
    } else if (deleteDocumentBtn) {
        const docId = deleteDocumentBtn.dataset.docId;
        if (!docId) return;
        confirmTitle = 'Delete Document Link?';
        deleteAction = async () => deleteDocument(docId);
    } else if (deleteNoteBtn) {
        const noteLi = target.closest('li[data-note-id]');
        const noteId = noteLi?.dataset.noteId;
        if (!noteId) return;
        confirmTitle = 'Delete Note?';
        deleteAction = async () => deleteSourceNote(sourceId, noteId, holderId);
    }

    if (deleteAction) {
        showConfirmationModal(confirmTitle, confirmBody, async () => {
            try {
                if (deleteAction) { // Re-check deleteAction inside async callback
                    await deleteAction(); // Execute the API call
                    showToast('Item deleted.', 'success'); // Generic success message
                    await refreshDetailsCallback(); // Refresh modal view after successful deletion
                }
            } catch (error) {
                 // Assert error as Error type for message access
                 const err = /** @type {Error} */ (error);
                showToast(`Delete failed: ${err.message}`, 'error');
            }
        });
    }
}

/**
 * Handles clicks related to editing, saving, or canceling note edits within the modal.
 * @param {HTMLElement} target - The clicked element.
 * @param {string} sourceId - The ID of the source context (from modal dataset).
 * @param {string|number} holderId - The current account holder ID (from modal dataset).
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleNoteEditActions(target, sourceId, holderId, refreshDetailsCallback) {
    const noteLi = /** @type {HTMLElement | null} */ (target.closest('li[data-note-id]'));
    if (!noteLi) return; // Click wasn't within a note item

    const noteId = noteLi.dataset.noteId;
    const displayDiv = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-content-display'));
    const editDiv = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-content-edit'));
    const editBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.edit-source-note-button'));
    const saveBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.save-edit-note-button'));
    const cancelBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.cancel-edit-note-button'));
    const textarea = /** @type {HTMLTextAreaElement | null} */ (editDiv?.querySelector('.edit-note-textarea'));
    const noteActions = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-actions'));

    if (!noteId || !displayDiv || !editDiv || !editBtn || !saveBtn || !cancelBtn || !textarea || !noteActions) {
        console.warn("[Research Sources Actions] Missing elements for note edit/save/cancel on note ID:", noteId);
        return;
    }

    if (target === editBtn) {
        // Toggle to edit mode
        displayDiv.style.display = 'none';
        noteActions.style.display = 'none';
        editDiv.style.display = 'block';
        textarea.focus();
        // Move cursor to end
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    } else if (target === cancelBtn) {
        // Cancel edit mode
        editDiv.style.display = 'none';
        displayDiv.style.display = 'block';
        noteActions.style.display = '';
        // Reset textarea content from display (convert <br> back to newline)
        textarea.value = displayDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    } else if (target === saveBtn) {
        // Save edited note
        const newContent = textarea.value.trim();
        if (!newContent) { return showToast('Note content cannot be empty.', 'error'); }
        if (!sourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }

        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
            // Call API to update the note
            await updateSourceNote(sourceId, noteId, holderId, newContent);
            showToast('Note updated.', 'success');
            await refreshDetailsCallback(); // Refresh details view in modal
        } catch (error) {
             // Assert error as Error type for message access
             const err = /** @type {Error} */ (error);
            showToast(`Error updating note: ${err.message}`, 'error');
            // Re-enable buttons only on error
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    }
}