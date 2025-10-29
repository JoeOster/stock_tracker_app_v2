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
    console.log("[handleAddWatchlistSubmit] Function called.");
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form'));
    if (!form) {
        console.error("[handleAddWatchlistSubmit] Could not find parent form.");
        return;
    }
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-watchlist-ticker-button'));
    if (!addButton) {
         console.error("[handleAddWatchlistSubmit] Could not find add button inside form.");
         return;
    }

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;
    const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-ticker-input'));
    const tp1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp1-input'));
    // *** GET TP2 INPUT ***
    const tp2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-tp2-input'));
    const recEntryInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-entry-input'));
    const recDatetimeInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-rec-datetime-input'));
    const createBuyCheckbox = /** @type {HTMLInputElement | null} */ (form.querySelector('.add-watchlist-create-buy-checkbox'));

    const ticker = tickerInput?.value.trim().toUpperCase();
    const createBuy = createBuyCheckbox?.checked ?? false;

    // --- Validation ---
    if (!ticker) { return showToast('Ticker is required.', 'error'); }
    if (!formSourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }

    const tp1 = tp1Input?.value ? parseFloat(tp1Input.value) : null;
    const tp2 = tp2Input?.value ? parseFloat(tp2Input.value) : null;
    const recEntryPrice = recEntryInput?.value ? parseFloat(recEntryInput.value) : null;
    if (tp1 !== null && (isNaN(tp1) || tp1 <= 0)) { showToast('Invalid TP1 (must be positive).', 'warning'); /* Continue */ }
    if (tp2 !== null && (isNaN(tp2) || tp2 <= 0)) { showToast('Invalid TP2 (must be positive).', 'warning'); /* Continue */ }
    if (tp1 !== null && tp2 !== null && tp2 <= tp1) { showToast('TP2 must be greater than TP1.', 'warning'); return; } // Stop if invalid
    if (recEntryPrice !== null && (isNaN(recEntryPrice) || recEntryPrice <= 0)) { showToast('Invalid Rec. Entry Price (must be positive).', 'warning'); /* Continue */ }


    addButton.disabled = true;
    try {
        console.log(`[handleAddWatchlistSubmit] Adding ${ticker} to watchlist... CreateBuy: ${createBuy}`);
        // Step 1: Always add to watchlist
        await addWatchlistItem(holderId, ticker, formSourceId);
        let toastMessage = `${ticker} added to watchlist`;

        // Step 2: If checkbox checked, navigate and pre-fill Orders form
        if (createBuy && typeof holderId === 'number') {
            console.log("[handleAddWatchlistSubmit] Create Buy checked, closing modal and navigating to Orders page...");
            const detailsModal = document.getElementById('source-details-modal');
            if(detailsModal) detailsModal.classList.remove('visible');

            await switchView('orders', null);
            console.log("[handleAddWatchlistSubmit] switchView('orders') called. Setting timeout for pre-fill...");

            // *** GET TP1 AND TP2 VALUES ***
            const tp1Value = tp1Input?.value || null;
            const tp2Value = tp2Input?.value || null; // Get TP2 value

            setTimeout(() => {
                console.log("[setTimeout] Callback executing. Attempting to pre-fill Orders form...");
                const orderTickerInput = /** @type {HTMLInputElement | null} */(document.getElementById('ticker'));
                const orderAccountSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('add-tx-account-holder'));
                const orderQuantityInput = /** @type {HTMLInputElement | null} */(document.getElementById('quantity'));
                const orderTp1Input = /** @type {HTMLInputElement | null} */(document.getElementById('add-limit-price-up'));
                const orderTp1Checkbox = /** @type {HTMLInputElement | null} */(document.getElementById('set-profit-limit-checkbox'));
                const orderTp1ExpInput = /** @type {HTMLInputElement | null} */(document.getElementById('add-limit-up-expiration'));
                // *** GET TP2 ELEMENTS ***
                const orderTp2Input = /** @type {HTMLInputElement | null} */(document.getElementById('add-limit-price-up-2'));
                const orderTp2Checkbox = /** @type {HTMLInputElement | null} */(document.getElementById('set-profit-limit-2-checkbox'));
                const orderTp2ExpInput = /** @type {HTMLInputElement | null} */(document.getElementById('add-limit-up-expiration-2'));


                if (orderTickerInput) {
                    orderTickerInput.value = ticker;
                    console.log(`[setTimeout] Pre-filled ticker: ${ticker}`);
                } else { console.warn("[setTimeout] Could not find Ticker input on Orders page."); }

                if (orderAccountSelect) {
                    orderAccountSelect.value = String(holderId);
                    console.log(`[setTimeout] Pre-selected account holder: ${holderId}`);
                    if (orderAccountSelect.value !== String(holderId)) { console.warn(`[setTimeout] Failed to pre-select account holder ${holderId}.`); }
                     import('./_navigation.js').then(mod => { if (mod.autosizeAccountSelector) mod.autosizeAccountSelector(orderAccountSelect); });
                } else { console.warn("[setTimeout] Could not find Account Holder select on Orders page."); }

                // Pre-fill TP1
                if (tp1Value && orderTp1Input && orderTp1Checkbox && orderTp1ExpInput) {
                    orderTp1Input.value = tp1Value;
                    orderTp1Checkbox.checked = true;
                    orderTp1ExpInput.value = getCurrentESTDateString();
                    console.log(`[setTimeout] Pre-filled TP1: ${tp1Value} and set default expiration.`);
                } else if (tp1Value) {
                     console.warn("[setTimeout] TP1 value existed but could not find TP1 input, checkbox, or expiration input on Orders page.");
                }

                // *** PRE-FILL TP2 ***
                if (tp2Value && orderTp2Input && orderTp2Checkbox && orderTp2ExpInput) {
                    orderTp2Input.value = tp2Value;
                    orderTp2Checkbox.checked = true;
                    orderTp2ExpInput.value = getCurrentESTDateString(); // Set default expiration
                    console.log(`[setTimeout] Pre-filled TP2: ${tp2Value} and set default expiration.`);
                } else if (tp2Value) {
                     console.warn("[setTimeout] TP2 value existed but could not find TP2 input, checkbox, or expiration input on Orders page.");
                }
                // *** END TP2 LOGIC ***

                if (orderQuantityInput) {
                    orderQuantityInput.focus();
                    console.log("[setTimeout] Focused Quantity input.");
                }

                const addButtonOrders = document.querySelector('#add-transaction-form button[type="submit"]');
                if (addButtonOrders) addButtonOrders.title = `Source ID: ${formSourceId}`;

                console.log("[setTimeout] Pre-fill attempt finished.");

            }, 250);

            toastMessage += `. Navigate to 'Orders' to complete BUY details.`;
            form.reset();

        } else {
             if (!createBuy) {
                console.log("[handleAddWatchlistSubmit] Create Buy NOT checked. Calling refreshDetailsCallback...");
                await refreshDetailsCallback();
                console.log("[handleAddWatchlistSubmit] refreshDetailsCallback finished.");
                form.reset();
             }
        }

        showToast(toastMessage, 'success', createBuy ? 10000 : 5000);


    } catch (error) {
        const err = /** @type {Error} */ (error);
        console.error("[handleAddWatchlistSubmit] Error during execution:", err);
        showToast(`Error: ${err.message}`, 'error', 10000);
    } finally {
        addButton.disabled = false;
        console.log("[handleAddWatchlistSubmit] Function finished.");
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
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
        console.warn("Adding document link that doesn't start with http/https:", link);
    }

    const documentData = {
        advice_source_id: formSourceId,
        external_link: link,
        title: titleInput?.value.trim() || null,
        document_type: typeInput?.value.trim() || null,
        description: descInput?.value.trim() || null,
        account_holder_id: holderId,
        journal_entry_id: null
    };

    addButton.disabled = true;
    try {
        await addDocument(documentData);
        showToast('Document link added.', 'success');
        form.reset();
        await refreshDetailsCallback();
    } catch (error) {
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
        if (contentTextarea) contentTextarea.value = '';
        await refreshDetailsCallback();
    } catch (error) {
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

    if (!deleteWatchlistBtn && !deleteDocumentBtn && !deleteNoteBtn) return;

    let confirmTitle = 'Confirm Deletion';
    let confirmBody = 'Are you sure? This cannot be undone.';
    /** @type {(() => Promise<any>) | null} */
    let deleteAction = null;

    if (deleteWatchlistBtn) {
        const itemId = deleteWatchlistBtn.dataset.itemId;
        if (!itemId) return;
        confirmTitle = 'Delete Watchlist Item?';
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
                if (deleteAction) {
                    await deleteAction();
                    showToast('Item deleted.', 'success');
                    await refreshDetailsCallback();
                }
            } catch (error) {
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
    if (!noteLi) return;

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
        textarea.value = displayDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    } else if (target === saveBtn) {
        const newContent = textarea.value.trim();
        if (!newContent) { return showToast('Note content cannot be empty.', 'error'); }
        if (!sourceId || holderId === 'all') { return showToast('Context missing or "All Accounts" selected.', 'error'); }

        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
            await updateSourceNote(sourceId, noteId, holderId, newContent);
            showToast('Note updated.', 'success');
            await refreshDetailsCallback();
        } catch (error) {
             const err = /** @type {Error} */ (error);
            showToast(`Error updating note: ${err.message}`, 'error');
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    }
}