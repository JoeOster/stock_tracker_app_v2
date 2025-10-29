// public/event-handlers/_research_sources_actions.js
/**
 * @file Handles specific actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions
 */

import { state } from '../state.js';
import {
    addWatchlistItem, addDocument, addSourceNote, deleteWatchlistItem,
    deleteDocument, deleteSourceNote, updateSourceNote, addPendingOrder,
    updatePricesForView
} from '../api.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

// --- Action Handlers ---

/**
 * Handles submission of the "Add Recommended Ticker" form.
 * @param {Event} e - The form submission event.
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddWatchlistSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target);
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-watchlist-ticker-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-ticker-input'));
    const tp1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp1-input'));
    const tp2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp2-input'));
    const recEntryInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-input'));
    const recDatetimeInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-datetime-input'));
    const createOrderCheckbox = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-create-order-checkbox'));
    const exchangeSelect = /** @type {HTMLSelectElement | null} */ (form.querySelector('.add-watchlist-exchange-select'));
    const quantityInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-qty-input'));
    const expirationInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-exp-input'));

    const ticker = tickerInput?.value.trim().toUpperCase();
    const tp1 = tp1Input?.value ? parseFloat(tp1Input.value) : null;
    const tp2 = tp2Input?.value ? parseFloat(tp2Input.value) : null;
    const recEntryPrice = recEntryInput?.value ? parseFloat(recEntryInput.value) : null;
    const recDatetime = recDatetimeInput?.value || null; // Allow empty string initially?
    const createOrder = createOrderCheckbox?.checked ?? false;
    const selectedExchange = exchangeSelect?.value;
    const orderQuantity = quantityInput?.value ? parseFloat(quantityInput.value) : 1;
    const orderExpiration = expirationInput?.value || null; // Use null if empty

    // --- Validation ---
    if (!ticker) { return showToast('Ticker is required.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing.', 'error'); }
    if (recEntryPrice !== null && (isNaN(recEntryPrice) || recEntryPrice <= 0)) { return showToast('Invalid Rec. Entry Price.', 'error');}
    if (createOrder && (!tp1 || tp1 <= 0)) { return showToast('TP1 required for order.', 'error'); }
    if (createOrder && !selectedExchange) { return showToast('Exchange required for order.', 'error'); }
    if (createOrder && (isNaN(orderQuantity) || orderQuantity <= 0)) { return showToast('Invalid Order Quantity.', 'error'); }
    if (tp1 !== null && (isNaN(tp1) || tp1 <= 0)) { return showToast('Invalid TP1.', 'error'); }
    if (tp2 !== null && (isNaN(tp2) || tp2 <= 0)) { return showToast('Invalid TP2.', 'error'); }
    if (tp1 !== null && tp2 !== null && tp2 <= tp1) { showToast('TP2 should be > TP1.', 'warning'); }

    addButton.disabled = true;
    try {
        await addWatchlistItem(holderId, ticker, formSourceId); // Add recEntryPrice/recDatetime if API supports
        let toastMessage = `${ticker} added to watchlist`;

        if (createOrder && tp1 && selectedExchange && orderQuantity > 0) {
            await updatePricesForView(getCurrentESTDateString(), [ticker]);
            const priceData = state.priceCache.get(ticker);
            const currentPrice = (priceData && typeof priceData.price === 'number') ? priceData.price : null;

            if (!currentPrice || currentPrice <= 0) { throw new Error(`Could not fetch valid price for ${ticker}.`); }
            if (tp1 <= currentPrice) { throw new Error(`TP1 (${formatAccounting(tp1)}) must be > current price (${formatAccounting(currentPrice)}).`); }

            const pendingOrderData = {
                account_holder_id: holderId, ticker, exchange: selectedExchange, order_type: 'BUY_LIMIT',
                limit_price: tp1, quantity: orderQuantity, created_date: getCurrentESTDateString(),
                expiration_date: orderExpiration,
                notes: `Rec by Source ${formSourceId}. Entry: ${recEntryPrice ? formatAccounting(recEntryPrice) : 'N/A'} (${recDatetime || 'N/A'}). TP2: ${tp2 ? formatAccounting(tp2) : 'N/A'}`,
                advice_source_id: formSourceId
            };
            await addPendingOrder(pendingOrderData);
            toastMessage += ` & Pending Order created (Qty: ${formatQuantity(orderQuantity)}, Target: ${formatAccounting(tp1)})`;
        }

        showToast(toastMessage, 'success');
        form.reset(); // Reset the form
        // Manually reset quantity to 1 and hide order fields after reset
        if(quantityInput) quantityInput.value = '1';
        form.querySelectorAll('.add-wl-order-fields').forEach(el => (/**@type{HTMLElement}*/(el)).style.display = 'none');

        await refreshDetailsCallback(); // Refresh the details view

    } catch (error) {
        showToast(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error', 10000);
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
    const form = /** @type {HTMLFormElement} */ (e.target);
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
    if (!formSourceId || holderId === 'all') { return showToast('Context missing.', 'error'); }

    const documentData = {
        advice_source_id: formSourceId,
        external_link: link,
        title: titleInput?.value.trim() || null,
        document_type: typeInput?.value.trim() || null,
        description: descInput?.value.trim() || null,
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
        showToast(`Error adding document: ${error instanceof Error ? error.message : String(error)}`, 'error');
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
    const form = /** @type {HTMLFormElement} */ (e.target);
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-source-note-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const contentTextarea = /** @type {HTMLTextAreaElement | null} */ (form.querySelector('.add-note-content-textarea'));
    const noteContent = contentTextarea?.value.trim();

    if (!noteContent) { return showToast('Note content cannot be empty.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing.', 'error'); }

    addButton.disabled = true;
    try {
        await addSourceNote(formSourceId, holderId, noteContent);
        showToast('Note added.', 'success');
        if (contentTextarea) contentTextarea.value = '';
        await refreshDetailsCallback();
    } catch (error) {
        showToast(`Error adding note: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
        addButton.disabled = false;
    }
}

/**
 * Handles clicks on delete buttons within the source details.
 * @param {HTMLElement} target - The clicked element.
 * @param {string} sourceId - The ID of the source context.
 * @param {string|number} holderId - The current account holder ID.
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
    /** @type {(() => Promise<void>) | null} */
    let deleteAction = null;

    if (deleteWatchlistBtn) {
        const itemId = deleteWatchlistBtn.dataset.itemId;
        if (!itemId) return;
        confirmTitle = 'Delete Watchlist Item?';
        deleteAction = async () => { await deleteWatchlistItem(itemId); showToast('Watchlist item removed.', 'success'); };
    } else if (deleteDocumentBtn) {
        const docId = deleteDocumentBtn.dataset.docId;
        if (!docId) return;
        confirmTitle = 'Delete Document Link?';
        deleteAction = async () => { await deleteDocument(docId); showToast('Document link deleted.', 'success'); };
    } else if (deleteNoteBtn) {
        const noteLi = target.closest('li[data-note-id]');
        const noteId = noteLi?.dataset.noteId;
        if (!noteId) return;
        confirmTitle = 'Delete Note?';
        deleteAction = async () => { await deleteSourceNote(sourceId, noteId, holderId); showToast('Note deleted.', 'success'); };
    }

    if (deleteAction) {
        showConfirmationModal(confirmTitle, confirmBody, async () => {
            try {
                if (deleteAction) { // Check again inside callback
                    await deleteAction();
                    await refreshDetailsCallback(); // Refresh view after successful deletion
                }
            } catch (error) {
                showToast(`Delete failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
            }
        });
    }
}

/**
 * Handles clicks related to editing, saving, or canceling note edits.
 * @param {HTMLElement} target - The clicked element.
 * @param {string} sourceId - The ID of the source context.
 * @param {string|number} holderId - The current account holder ID.
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
        displayDiv.style.display = 'none';
        noteActions.style.display = 'none';
        editDiv.style.display = 'block';
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    } else if (target === cancelBtn) {
        editDiv.style.display = 'none';
        displayDiv.style.display = 'block';
        noteActions.style.display = '';
        textarea.value = displayDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n'); // Reset content
    } else if (target === saveBtn) {
        const newContent = textarea.value.trim();
        if (!newContent) { return showToast('Note content cannot be empty.', 'error'); }
        if (!sourceId || holderId === 'all') { return showToast('Context missing.', 'error'); }

        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
            await updateSourceNote(sourceId, noteId, holderId, newContent);
            showToast('Note updated.', 'success');
            await refreshDetailsCallback(); // Refresh details view
        } catch (error) {
            showToast(`Error updating note: ${error instanceof Error ? error.message : String(error)}`, 'error');
            saveBtn.disabled = false; // Re-enable only on error
            cancelBtn.disabled = false;
        }
    }
}