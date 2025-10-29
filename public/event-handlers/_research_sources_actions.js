// public/event-handlers/_research_sources_actions.js
/**
 * @file Handles specific actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions
 */

import { state } from '../state.js';
import {
    addWatchlistItem, addDocument, addSourceNote, deleteWatchlistItem,
    deleteDocument, deleteSourceNote, updateSourceNote, addPendingOrder, // Keep addPendingOrder for now if needed elsewhere
    updatePricesForView // Keep updatePricesForView for now if needed elsewhere
} from '../api.js';
// *** Import switchView ***
import { switchView } from './_navigation.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

// --- Action Handlers ---

/**
 * Handles submission of the "Add Recommended Ticker" form.
 * Adds to watchlist and optionally navigates to Orders page to log a BUY.
 * @param {Event} e - The form submission event.
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddWatchlistSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form')); // Use closest('form')
    if (!form) return; // Exit if form not found
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-watchlist-ticker-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-ticker-input'));
    // Guideline fields (not used for order creation anymore)
    const tp1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp1-input'));
    const tp2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp2-input'));
    const recEntryInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-input'));
    const recDatetimeInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-datetime-input'));
    // *** Use new checkbox class ***
    const createBuyCheckbox = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-create-buy-checkbox'));

    const ticker = tickerInput?.value.trim().toUpperCase();
    const createBuy = createBuyCheckbox?.checked ?? false;

    // --- Validation ---
    if (!ticker) { return showToast('Ticker is required.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }
    // Basic validation for guideline fields if entered (optional)
    const tp1 = tp1Input?.value ? parseFloat(tp1Input.value) : null;
    const tp2 = tp2Input?.value ? parseFloat(tp2Input.value) : null;
    const recEntryPrice = recEntryInput?.value ? parseFloat(recEntryInput.value) : null;
    if (tp1 !== null && (isNaN(tp1) || tp1 <= 0)) { showToast('Invalid TP1 (must be positive).', 'warning'); /* Continue */ }
    if (tp2 !== null && (isNaN(tp2) || tp2 <= 0)) { showToast('Invalid TP2 (must be positive).', 'warning'); /* Continue */ }
    if (recEntryPrice !== null && (isNaN(recEntryPrice) || recEntryPrice <= 0)) { showToast('Invalid Rec. Entry Price (must be positive).', 'warning'); /* Continue */ }


    addButton.disabled = true;
    try {
        // Step 1: Always add to watchlist
        // TODO: Update addWatchlistItem API to accept and store guideline prices/dates if desired
        await addWatchlistItem(holderId, ticker, formSourceId);
        let toastMessage = `${ticker} added to watchlist`;

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
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form')); // Use closest('form')
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
        // Consider making this stricter if needed
        console.warn("Adding document link that doesn't start with http/https:", link);
    }


    const documentData = {
        advice_source_id: formSourceId,
        external_link: link,
        title: titleInput?.value.trim() || null,
        document_type: typeInput?.value.trim() || null,
        description: descInput?.value.trim() || null,
        // Ensure account_holder_id is passed if needed by backend (depends on API logic)
        // account_holder_id: holderId,
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
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form')); // Use closest('form')
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
    /** @type {(() => Promise<any>) | null} */ // Changed to return Promise<any>
    let deleteAction = null;

    if (deleteWatchlistBtn) {
        const itemId = deleteWatchlistBtn.dataset.itemId;
        if (!itemId) return;
        confirmTitle = 'Delete Watchlist Item?';
        deleteAction = async () => deleteWatchlistItem(itemId); // Use imported API function
    } else if (deleteDocumentBtn) {
        const docId = deleteDocumentBtn.dataset.docId;
        if (!docId) return;
        confirmTitle = 'Delete Document Link?';
        deleteAction = async () => deleteDocument(docId); // Use imported API function
    } else if (deleteNoteBtn) {
        const noteLi = target.closest('li[data-note-id]');
        const noteId = noteLi?.dataset.noteId;
        if (!noteId) return;
        confirmTitle = 'Delete Note?';
        // Pass sourceId and holderId to the API function
        deleteAction = async () => deleteSourceNote(sourceId, noteId, holderId); // Use imported API function
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