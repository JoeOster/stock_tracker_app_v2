// public/event-handlers/_research_sources_actions_notes.js
/**
 * @file Handles Note and Delete actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions_notes
 */

import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { addSourceNote, deleteSourceNote, updateSourceNote } from '../api/sources-api.js';
import { deleteDocument } from '../api/documents-api.js';
import { deleteWatchlistItem } from '../api/watchlist-api.js';
// --- ADDED IMPORT ---
import { deleteJournalEntry } from '../api/journal-api.js';
// --- END ADD ---


/**
 * Handles submission of the "Add Note" form.
 * @param {Event} e - The form submission event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddNoteSubmit(e, refreshDetailsCallback) {
    // ... (This function remains unchanged) ...
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
 *... 
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleDeleteClick(target, sourceId, holderId, refreshDetailsCallback) {
    // --- UPDATED: Added delete-journal-btn ---
    const closeWatchlistBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-watchlist-item-button'));
    const deleteDocumentBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-document-button'));
    const deleteNoteBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-source-note-button'));
    const deleteJournalBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-journal-btn')); // <-- ADDED
    // --- END UPDATED ---

    if (!closeWatchlistBtn && !deleteDocumentBtn && !deleteNoteBtn && !deleteJournalBtn) return; // Not a delete button we handle here

    let confirmTitle = 'Confirm Deletion';
    let confirmBody = 'Are you sure? This cannot be undone.';
    /** @type {(() => Promise<any>) | null} */
    let deleteAction = null;
    let successMessage = 'Item deleted.'; // Default success message

    if (closeWatchlistBtn) {
        const itemId = closeWatchlistBtn.dataset.itemId;
        if (!itemId) return;
        confirmTitle = 'Close Trade Idea?';
        confirmBody = 'This will archive the idea and remove it from this list. It will not delete any real or paper trades.';
        deleteAction = async () => deleteWatchlistItem(itemId); 
        successMessage = 'Trade Idea closed/archived.';
    } else if (deleteDocumentBtn) {
        const docId = deleteDocumentBtn.dataset.docId;
        if (!docId) return;
        confirmTitle = 'Delete Document Link?';
        deleteAction = async () => deleteDocument(docId);
        successMessage = 'Document link deleted.';
    } else if (deleteNoteBtn) {
        const noteLi = target.closest('li[data-note-id]');
        const noteId = noteLi?.dataset.noteId;
        if (!noteId) return;
        confirmTitle = 'Delete Note?';
        deleteAction = async () => deleteSourceNote(sourceId, noteId, holderId);
        successMessage = 'Note deleted.';
    // --- ADDED: Handle Journal/Technique deletion ---
    } else if (deleteJournalBtn) {
        const journalId = deleteJournalBtn.dataset.journalId;
        if (!journalId) return;
        confirmTitle = 'Delete Technique?';
        confirmBody = 'Are you sure? This will delete the paper trade technique. It cannot be undone.';
        deleteAction = async () => deleteJournalEntry(journalId);
        successMessage = 'Technique deleted.';
    // --- END ADDED ---
    }

    if (deleteAction) {
        showConfirmationModal(confirmTitle, confirmBody, async () => {
            try {
                if (deleteAction) { // Re-check deleteAction inside async callback
                    await deleteAction(); // Execute the API call
                    showToast(successMessage, 'success'); // Use specific success message
                    await refreshDetailsCallback(); // Refresh modal view after successful deletion
                }
            } catch (error) {
                 const err = /** @type {Error} */ (error);
                showToast(`Action failed: ${err.message}`, 'error');
            }
        });
    }
}

/**
 * Handles clicks related to editing, saving, or canceling note edits within the modal.
 * @param {HTMLElement} target - The clicked element.
 *...
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleNoteEditActions(target, sourceId, holderId, refreshDetailsCallback) {
    // ... (This function remains unchanged) ...
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