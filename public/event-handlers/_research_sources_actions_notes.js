// /public/event-handlers/_research_sources_actions_notes.js
/**
 * @file Contains action handlers for the Notes and Documents panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_notes
 */

// --- MODIFIED: Added 'state' import ---
import { state } from '../state.js';
// --- END MODIFICATION ---
import {
  addSourceNote,
  updateSourceNote,
  deleteSourceNote,
} from '../api/sources-api.js';
import { deleteDocument } from '../api/documents-api.js';
import { deleteJournalEntry } from '../api/journal-api.js';
import { closeWatchlistIdea } from '../api/watchlist-api.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';

/**
 * Handles the submission of the "Add New Note" form.
 * @param {Event} e - The submit event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddNoteSubmit(e, refreshDetailsCallback) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  if (!form) return;

  const sourceId = form.dataset.sourceId;
  const textarea = /** @type {HTMLTextAreaElement} */ (
    form.querySelector('.add-note-content-textarea')
  );
  const content = textarea.value.trim();

  if (!sourceId || !content) {
    return showToast('Note content cannot be empty.', 'error');
  }

  const addButton = /** @type {HTMLButtonElement} */ (
    form.querySelector('.add-source-note-button')
  );
  addButton.disabled = true;

  try {
    // --- MODIFIED: Added state.selectedAccountHolderId ---
    await addSourceNote(sourceId, state.selectedAccountHolderId, content);
    // --- END MODIFICATION ---
    showToast('Note added!', 'success');
    textarea.value = ''; // Clear textarea
    await refreshDetailsCallback();
  } catch (error) {
    console.error('Failed to add source note:', error);
    // @ts-ignore
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    addButton.disabled = false;
  }
}

/**
 * Handles clicks on "Edit", "Save", or "Cancel" buttons for an individual note.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {string} modalSourceId - The ID of the source (from modal dataset).
 * @param {string} modalHolderId - The ID of the holder (from modal dataset).
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleNoteEditActions(
  target,
  modalSourceId,
  modalHolderId,
  refreshDetailsCallback
) {
  const noteLi = /** @type {HTMLLIElement} */ (
    /** @type {HTMLElement} */ (target).closest('li[data-note-id]')
  );
  if (!noteLi) return;

  const noteId = noteLi.dataset.noteId;
  const displayDiv = /** @type {HTMLElement} */ (
    noteLi.querySelector('.note-content-display')
  );
  const editDiv = /** @type {HTMLElement} */ (
    noteLi.querySelector('.note-content-edit')
  );
  const editTextArea = /** @type {HTMLTextAreaElement} */ (
    editDiv?.querySelector('.edit-note-textarea')
  );

  if (!noteId || !displayDiv || !editDiv || !editTextArea) {
    return console.warn('Could not find note edit elements.', noteLi);
  }

  // --- Handle "Edit" button click ---
  if (target.matches('.edit-source-note-button')) {
    displayDiv.style.display = 'none';
    editDiv.style.display = 'block';
    editTextArea.focus();
    // Ensure text area has the latest content (in case of stale HTML)
    editTextArea.value = displayDiv.textContent || '';
  }

  // --- Handle "Cancel" button click ---
  else if (target.matches('.cancel-edit-note-button')) {
    displayDiv.style.display = 'block';
    editDiv.style.display = 'none';
    // No save, just revert UI
  }

  // --- Handle "Save" button click ---
  else if (target.matches('.save-edit-note-button')) {
    const newContent = editTextArea.value.trim();
    if (!newContent) {
      return showToast('Note content cannot be empty.', 'error');
    }

    /** @type {HTMLButtonElement} */ (target).disabled = true;
    try {
      // --- MODIFIED: Added modalSourceId and modalHolderId ---
      await updateSourceNote(modalSourceId, noteId, modalHolderId, newContent);
      // --- END MODIFICATION ---
      showToast('Note updated!', 'success');
      // Update display div immediately
      displayDiv.innerHTML = newContent.replace(/\n/g, '<br>');
      displayDiv.style.display = 'block';
      editDiv.style.display = 'none';
      // We can do a full refresh, or just update the timestamps manually
      await refreshDetailsCallback(); // Easiest way to ensure all data is fresh
    } catch (error) {
      console.error('Failed to update source note:', error);
      // @ts-ignore
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      /** @type {HTMLButtonElement} */ (target).disabled = false;
    }
  }
}

/**
 * Handles clicks on various "Delete" buttons within the source details modal.
 * @param {HTMLElement} target - The delete button element that was clicked.
 * @param {string} modalSourceId - The ID of the source (from modal dataset).
 * @param {string} modalHolderId - The ID of the holder (from modal dataset).
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleDeleteClick(
  target,
  modalSourceId,
  modalHolderId,
  refreshDetailsCallback
) {
  // --- THIS IS THE FIX ---
  // Added dataset.journalId to the list of possible ID sources
  const itemId =
    /** @type {HTMLElement} */ (target).dataset.id ||
    /** @type {HTMLElement} */ (target).dataset.docId ||
    /** @type {HTMLElement} */ (target).dataset.noteId ||
    /** @type {HTMLElement} */ (target).dataset.itemId ||
    /** @type {HTMLElement} */ (target).dataset.journalId;
  // --- END FIX ---

  if (!itemId) return;

  // --- Case 1: Delete Watchlist "Trade Idea" ---
  if (target.matches('.delete-watchlist-item-button')) {
    const ticker =
      target.closest('tr')?.querySelector('td:first-child')?.textContent ||
      'this idea';
    showConfirmationModal(
      `Archive ${ticker} Idea?`,
      'Are you sure you want to close this trade idea? This will hide it from the list.',
      async () => {
        try {
          await closeWatchlistIdea(itemId);
          showToast(`Trade idea for ${ticker} archived.`, 'success');
          await refreshDetailsCallback(); // Refresh the modal
        } catch (error) {
          // @ts-ignore
          showToast(`Error: ${error.message}`, 'error');
        }
      }
    );
  }

  // --- Case 2: Delete "Technique" (Journal Entry) ---
  else if (target.matches('.delete-journal-btn')) {
    const ticker =
      target.closest('tr')?.querySelector('td:nth-child(3)')?.textContent ||
      'this technique';
    showConfirmationModal(
      `Archive ${ticker} Technique?`,
      'Are you sure you want to archive this technique? This will close it.',
      async () => {
        try {
          await deleteJournalEntry(itemId); // This function uses the correct 'itemId'
          showToast(`Technique archived.`, 'success');
          await refreshDetailsCallback();
        } catch (error) {
          // @ts-ignore
          showToast(`Error: ${error.message}`, 'error');
        }
      }
    );
  }

  // --- Case 3: Delete Linked Document ---
  else if (target.matches('.delete-document-button')) {
    showConfirmationModal(
      'Delete Document Link?',
      'Are you sure? This only removes the link, not the document itself.',
      async () => {
        try {
          await deleteDocument(itemId);
          showToast('Document link removed.', 'success');
          await refreshDetailsCallback();
        } catch (error) {
          // @ts-ignore
          showToast(`Error: ${error.message}`, 'error');
        }
      }
    );
  }

  // --- Case 4: Delete Source Note ---
  else if (target.matches('.delete-source-note-button')) {
    showConfirmationModal(
      'Delete Note?',
      'Are you sure you want to permanently delete this note?',
      async () => {
        try {
          // --- MODIFIED: Added modalSourceId and modalHolderId ---
          await deleteSourceNote(modalSourceId, itemId, modalHolderId);
          // --- END MODIFICATION ---
          showToast('Note deleted.', 'success');
          await refreshDetailsCallback();
        } catch (error) {
          // @ts-ignore
          showToast(`Error: ${error.message}`, 'error');
        }
      }
    );
  }
}
