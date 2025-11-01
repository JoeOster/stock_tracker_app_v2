import { addDocument } from '../api/documents-api.js';
// public/event-handlers/_research_sources_actions_docs.js
/**
 * @file Handles Document actions triggered from within the Research Source details view.
 * @module event-handlers/_research_sources_actions_docs
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';

/**
 * Handles submission of the "Add Document Link" form.
 * @param {Event} e - The form submission event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddDocumentSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ ((/** @type {HTMLElement} */(e.target)).closest('form'));    if (!form) return;
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

    /** @type {import('../api/documents-api.js').DocumentData} */
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