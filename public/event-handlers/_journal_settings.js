import { fetchAdviceSources, addAdviceSource, updateAdviceSource, deleteAdviceSource } from '../api/sources-api.js';
import { handleResponse } from '../api/api-helpers.js';
// public/event-handlers/_journal_settings.js
/**
 * @file Initializes event handlers for journal-related settings within the Settings modal.
 * @module event-handlers/_journal_settings
 */

import { state, updateState } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';

/**
 * Fetches advice sources based on the currently selected account holder and stores them in state.
 * @async
 * @returns {Promise<void>} A promise that resolves when sources are fetched and stored.
 */
export async function fetchAndStoreAdviceSources() {
    try {
        const holderIdToFetch = state.selectedAccountHolderId === 'all' ? null : String(state.selectedAccountHolderId);

        if (!holderIdToFetch) {
             console.warn("Cannot fetch advice sources without a specific account holder selected.");
             updateState({ allAdviceSources: [] });
             return;
        }

        const sources = await fetchAdviceSources(holderIdToFetch);
        updateState({ allAdviceSources: sources }); // Update state
    } catch (error) {
        // @ts-ignore
        showToast(`Could not load advice sources: ${error.message}`, 'error'); // Use message
        updateState({ allAdviceSources: [] });
    }
}

/**
 * Initializes event listeners for the Advice Sources management section in the Settings modal.
 * Handles adding, editing, saving, canceling, and deleting advice sources.
 * @returns {void}
 */
export function initializeJournalSettingsHandlers() {
    const addAdviceSourceForm = /** @type {HTMLFormElement | null} */ (document.getElementById('add-advice-source-form'));
    const adviceSourceList = document.getElementById('advice-source-list');

    // --- Handle "Add Source" Form Submission ---
    if (addAdviceSourceForm) {
        addAdviceSourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const addButton = /** @type {HTMLButtonElement | null} */ (addAdviceSourceForm.querySelector('#add-advice-source-btn'));
            if (!addButton) return;

            // --- Get Form Values ---
            const accountHolderId = state.selectedAccountHolderId === 'all' ? null : state.selectedAccountHolderId;
            const name = (/** @type {HTMLInputElement} */(document.getElementById('new-source-name'))).value.trim();
            const type = (/** @type {HTMLSelectElement} */(document.getElementById('new-source-type'))).value;
            const url = (/** @type {HTMLInputElement} */(document.getElementById('new-source-url'))).value.trim();
            const email = (/** @type {HTMLInputElement} */(document.getElementById('new-source-contact-email'))).value.trim();
            const appType = (/** @type {HTMLSelectElement} */(document.getElementById('new-source-contact-app-type'))).value;
            const appHandle = (/** @type {HTMLInputElement} */(document.getElementById('new-source-contact-app-handle'))).value.trim();
            const imagePath = (/** @type {HTMLInputElement} */(document.getElementById('new-source-image-path'))).value.trim();

            // --- Client-Side Validation ---
            if (!accountHolderId) {
                return showToast('Please select a specific account holder before adding a source.', 'error');
            }
            if (!name || !type) {
                return showToast('Source Name and Type are required.', 'error');
            }
            // Optional: Basic URL validation
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                 // return showToast('Please enter a valid URL starting with http:// or https://', 'error');
            }
             // Optional: Basic Email validation
             if (email && !email.includes('@')) {
                 // return showToast('Please enter a valid email address.', 'error');
             }
             // Check for duplicate name/type combination for this user
             if (state.allAdviceSources.some(s => s.name.toLowerCase() === name.toLowerCase() && s.type.toLowerCase() === type.toLowerCase())) {
                 return showToast(`An advice source named "${name}" with type "${type}" already exists for this account holder.`, 'error');
             }
            // --- End Validation ---

            /** @type {import('../api.js').AdviceSourcePostBody} */
            const sourceData = {
                account_holder_id: accountHolderId,
                name: name,
                type: type,
                description: (/** @type {HTMLInputElement} */(document.getElementById('new-source-description'))).value.trim() || null,
                url: url || null,
                contact_person: (/** @type {HTMLInputElement} */(document.getElementById('new-source-contact-person'))).value.trim() || null,
                contact_email: email || null,
                contact_phone: (/** @type {HTMLInputElement} */(document.getElementById('new-source-contact-phone'))).value.trim() || null,
                contact_app_type: appType || null, // <-- New field
                contact_app_handle: appHandle || null, // <-- New field
                image_path: imagePath || null, // <-- New field
            };

            addButton.disabled = true;
            try {
                // Use API function which uses handleResponse
                await addAdviceSource(sourceData);
                showToast('Advice Source added!', 'success');
                addAdviceSourceForm.reset(); // Clear form
                await fetchAndStoreAdviceSources(); // Refresh state
                populateAllAdviceSourceDropdowns(); // Update all dropdowns
                renderAdviceSourceManagementList(); // Re-render list
            } catch (error) {
                // @ts-ignore
                showToast(`Error adding source: ${error.message}`, 'error'); // Use message
            } finally {
                addButton.disabled = false;
            }
        });
    }

    // --- Handle List Button Clicks (Advice Sources) ---
    if (adviceSourceList) {
        adviceSourceList.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) return;
            const sourceId = li.dataset.id;
            if (!sourceId) return;

            const displayDiv = /** @type {HTMLElement | null} */ (li.querySelector('.source-display'));
            const editDiv = /** @type {HTMLElement | null} */ (li.querySelector('.source-edit'));
            const editBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.edit-source-btn'));
            const saveBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.save-source-btn'));
            const cancelBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.cancel-source-btn'));
            const deleteBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.delete-source-btn'));

            if (!displayDiv || !editDiv || !editBtn || !saveBtn || !cancelBtn || !deleteBtn) {
                console.error("Could not find necessary elements in list item for source ID:", sourceId);
                return;
            }

            if (target === editBtn) {
                // Toggle to edit mode
                displayDiv.style.display = 'none';
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                editDiv.style.display = 'flex'; // Use flex as defined in renderer
                saveBtn.style.display = '';
                cancelBtn.style.display = '';
                // Optional: focus the name input
                const nameInput = /** @type {HTMLInputElement | null} */(editDiv.querySelector('.edit-source-name'));
                if (nameInput) nameInput.focus();
            }
            else if (target === cancelBtn) {
                 // Toggle back to display mode
                 editDiv.style.display = 'none';
                 saveBtn.style.display = 'none';
                 cancelBtn.style.display = 'none';
                 displayDiv.style.display = 'flex'; // Use flex as defined in renderer
                 editBtn.style.display = '';
                 deleteBtn.style.display = '';
                 // Note: Edit fields are *not* reset here, but they will be correct
                 // on the next render if the modal is re-opened.
            }
            else if (target === saveBtn) {
                // --- Get Updated Values ---
                const nameInput = /** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-name'));
                const typeSelect = /** @type {HTMLSelectElement} */(editDiv.querySelector('.edit-source-type'));
                const urlInput = /** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-url'));
                const emailInput = /** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-contact-email'));
                const appTypeSelect = /** @type {HTMLSelectElement} */(editDiv.querySelector('.edit-source-contact-app-type'));
                const appHandleInput = /** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-contact-app-handle'));
                const imagePathInput = /** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-image-path'));

                const name = nameInput.value.trim();
                const type = typeSelect.value;
                const url = urlInput.value.trim();
                const email = emailInput.value.trim();
                const appType = appTypeSelect.value;
                const appHandle = appHandleInput.value.trim();
                const imagePath = imagePathInput.value.trim();

                // --- Validation ---
                if (!name || !type) {
                    return showToast('Source Name and Type are required.', 'error');
                }
                if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                    // return showToast('Please enter a valid URL starting with http:// or https://', 'error');
                }
                 if (email && !email.includes('@')) {
                    // return showToast('Please enter a valid email address.', 'error');
                 }
                 // Check for duplicate name/type combination *excluding self*
                 if (state.allAdviceSources.some(s => String(s.id) !== sourceId && s.name.toLowerCase() === name.toLowerCase() && s.type.toLowerCase() === type.toLowerCase())) {
                     return showToast(`Another advice source named "${name}" with type "${type}" already exists.`, 'error');
                 }
                // --- End Validation ---

                /** @type {import('../api.js').AdviceSourcePutBody} */
                const updatedData = {
                    name: name,
                    type: type,
                    description: (/** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-description'))).value.trim() || null,
                    url: url || null,
                    contact_person: (/** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-contact-person'))).value.trim() || null,
                    contact_email: email || null,
                    contact_phone: (/** @type {HTMLInputElement} */(editDiv.querySelector('.edit-source-contact-phone'))).value.trim() || null,
                    contact_app_type: appType || null, // <-- New field
                    contact_app_handle: appHandle || null, // <-- New field
                    image_path: imagePath || null, // <-- New field
                };

                saveBtn.disabled = true;
                try {
                    // Use API function which uses handleResponse
                    await updateAdviceSource(sourceId, updatedData);
                    showToast('Advice Source updated!', 'success');
                    await fetchAndStoreAdviceSources(); // Refresh state
                    populateAllAdviceSourceDropdowns(); // Update all dropdowns
                    renderAdviceSourceManagementList(); // Re-render list (which implicitly exits edit mode)
                } catch (error) {
                    // @ts-ignore
                    showToast(`Error updating source: ${error.message}`, 'error'); // Use message
                    saveBtn.disabled = false; // Re-enable only on error
                }
            }
            else if (target === deleteBtn) {
                 const sourceNameElement = li.querySelector('.source-name');
                 const sourceName = sourceNameElement ? sourceNameElement.textContent : 'this source';
                 showConfirmationModal(`Delete Advice Source "${sourceName}"?`, 'This cannot be undone. Associated journal entries, watchlist items, documents, and notes will be unlinked or deleted (ON DELETE SET NULL / ON DELETE CASCADE).', async () => {
                    try {
                        // Use API function which uses handleResponse
                        await deleteAdviceSource(sourceId);
                        showToast('Advice Source deleted.', 'success');
                        await fetchAndStoreAdviceSources(); // Refresh state
                        populateAllAdviceSourceDropdowns(); // Update all dropdowns
                        renderAdviceSourceManagementList(); // Re-render list
                    } catch (error) {
                        // @ts-ignore
                        showToast(`Error deleting source: ${error.message}`, 'error'); // Use message
                    }
                });
            }
        });
    }
}
