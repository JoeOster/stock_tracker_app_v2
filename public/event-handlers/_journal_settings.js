// /public/event-handlers/_journal_settings.js
/**
 * @file Initializes event handlers for the "Advice Sources" panel in Settings.
 * @module event-handlers/_journal_settings
 */

import { state, updateState } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';
import {
    fetchAdviceSources,
    addAdviceSource,
    updateAdviceSource,
    deleteAdviceSource,
    toggleAdviceSourceActive 
} from '../api/sources-api.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js'; 

/**
 * Fetches *active* advice sources from the API and stores them in the global state
 * for use in dropdowns and the Research tab.
 * @async
 * @returns {Promise<void>}
 */
export async function fetchAndStoreAdviceSources() {
    if (!state.selectedAccountHolderId || state.selectedAccountHolderId === 'all') {
        updateState({ allAdviceSources: [] });
        return;
    }
    try {
        // This now only fetches active sources by default
        const sources = await fetchAdviceSources(state.selectedAccountHolderId, false); 
        updateState({ allAdviceSources: sources });
    } catch (error) {
        console.error("Failed to fetch advice sources:", error);
        // @ts-ignore
        showToast(`Error fetching advice sources: ${error.message}`, 'error');
        updateState({ allAdviceSources: [] });
    }
}

/**
 * --- NEW FUNCTION ---
 * Fetches *all* advice sources (including inactive) for use *only* in the settings modal.
 * @async
 * @param {string|number} holderId The account holder ID.
 * @returns {Promise<any[]>} A promise that resolves to an array of all source objects.
 */
export async function fetchAllAdviceSourcesForSettings(holderId) {
    if (!holderId || holderId === 'all') {
        return [];
    }
    try {
        // Pass `true` to include inactive sources
        const sources = await fetchAdviceSources(holderId, true);
        return sources;
    } catch (error) {
        console.error("Failed to fetch all advice sources for settings:", error);
        // @ts-ignore
        showToast(`Error fetching all sources: ${error.message}`, 'error');
        return [];
    }
}

/**
 * Shows or hides dynamic panels in a source form based on the selected type.
 * @param {string} type - The selected source type (e.g., 'Person', 'Book').
 * @param {string} formPrefix - The prefix for the form elements (e.g., 'new-source' or 'edit-source').
 */
function toggleSourceDetailPanels(type, formPrefix) {
    const personPanel = document.getElementById(`${formPrefix}-panel-person`);
    const groupPanel = document.getElementById(`${formPrefix}-panel-group`);
    const bookPanel = document.getElementById(`${formPrefix}-panel-book`);
    const websitePanel = document.getElementById(`${formPrefix}-panel-website`);

    // Hide all panels first
    if (personPanel) personPanel.style.display = 'none';
    if (groupPanel) groupPanel.style.display = 'none';
    if (bookPanel) bookPanel.style.display = 'none';
    if (websitePanel) websitePanel.style.display = 'none';

    // Show the correct panel
    switch (type) {
        case 'Person':
            if (personPanel) personPanel.style.display = 'grid';
            break;
        case 'Group':
            if (groupPanel) groupPanel.style.display = 'grid';
            break;
        case 'Book':
            if (bookPanel) bookPanel.style.display = 'grid';
            break;
        case 'Website':
            // --- MODIFIED: This panel now has content, but this logic is still correct ---
            if (websitePanel) websitePanel.style.display = 'grid';
            break;
        // Default: all remain hidden
    }
}

/**
 * Gathers the dynamic 'details' object from the form based on the selected type.
 * @param {string} type - The selected source type (e.g., 'Person', 'Book').
 * @param {string} formPrefix - The prefix for the form elements (e.g., 'new-source' or 'edit-source').
 * @returns {object} The details object.
 */
function getSourceDetailsFromForm(type, formPrefix) {
    const details = {};
    let websites, pdfs; // --- Declare vars ---

    switch (type) {
        case 'Person':
            details.contact_email = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-email`))).value;
            details.contact_phone = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-phone`))).value;
            details.contact_app_type = (/** @type {HTMLSelectElement} */(document.getElementById(`${formPrefix}-contact-app-type`))).value;
            details.contact_app_handle = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-app-handle`))).value;
            break;
        case 'Group':
            details.contact_person = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-group-person`))).value;
            details.contact_email = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-group-email`))).value;
            details.contact_phone = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-group-phone`))).value;
            details.contact_app_type = (/** @type {HTMLSelectElement} */(document.getElementById(`${formPrefix}-group-app-type`))).value;
            details.contact_app_handle = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-group-app-handle`))).value;
            break;
        case 'Book':
            details.author = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-book-author`))).value;
            details.isbn = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-book-isbn`))).value;
            
            websites = (/** @type {HTMLTextAreaElement} */(document.getElementById(`${formPrefix}-book-websites`))).value;
            pdfs = (/** @type {HTMLTextAreaElement} */(document.getElementById(`${formPrefix}-book-pdfs`))).value;
            details.websites = websites ? websites.split('\n').map(s => s.trim()).filter(Boolean) : [];
            details.pdfs = pdfs ? pdfs.split('\n').map(s => s.trim()).filter(Boolean) : [];
            break;
        
        // --- MODIFIED: Add case for 'Website' ---
        case 'Website':
            websites = (/** @type {HTMLTextAreaElement} */(document.getElementById(`${formPrefix}-website-websites`))).value;
            pdfs = (/** @type {HTMLTextAreaElement} */(document.getElementById(`${formPrefix}-website-pdfs`))).value;
            details.websites = websites ? websites.split('\n').map(s => s.trim()).filter(Boolean) : [];
            details.pdfs = pdfs ? pdfs.split('\n').map(s => s.trim()).filter(Boolean) : [];
            break;
        // --- END MODIFICATION ---
    }
    return details;
}

/**
 * Populates the dynamic fields in the 'Edit Source' form from a source's 'details' object.
 * @param {object | null | undefined} details - The details object.
 * @param {string} type - The source type.
 */
function populateEditFormDetails(details, type) {
    const d = details || {};
    switch (type) {
        case 'Person':
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-email'))).value = d.contact_email || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-phone'))).value = d.contact_phone || '';
            (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-contact-app-type'))).value = d.contact_app_type || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-app-handle'))).value = d.contact_app_handle || '';
            break;
        case 'Group':
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-group-person'))).value = d.contact_person || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-group-email'))).value = d.contact_email || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-group-phone'))).value = d.contact_phone || '';
            (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-group-app-type'))).value = d.contact_app_type || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-group-app-handle'))).value = d.contact_app_handle || '';
            break;
        case 'Book':
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-book-author'))).value = d.author || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-book-isbn'))).value = d.isbn || '';
            
            (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-book-websites'))).value = (d.websites && Array.isArray(d.websites)) ? d.websites.join('\n') : '';
            (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-book-pdfs'))).value = (d.pdfs && Array.isArray(d.pdfs)) ? d.pdfs.join('\n') : '';
            break;

        // --- MODIFIED: Add case for 'Website' ---
        case 'Website':
            (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-website-websites'))).value = (d.websites && Array.isArray(d.websites)) ? d.websites.join('\n') : '';
            (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-website-pdfs'))).value = (d.pdfs && Array.isArray(d.pdfs)) ? d.pdfs.join('\n') : '';
            break;
        // --- END MODIFICATION ---
    }
}

/**
 * Initializes all event handlers for the Advice Sources management panel.
 * @returns {void}
 */
export function initializeJournalSettingsHandlers() {
    const addSourceForm = /** @type {HTMLFormElement} */ (document.getElementById('add-new-source-form'));
    const sourceListContainer = document.getElementById('advice-source-list-container'); // This is the <div> wrapper
    const sourceList = document.getElementById('advice-source-list'); // The <ul>
    const editSourceModal = document.getElementById('edit-source-modal');
    const editSourceForm = /** @type {HTMLFormElement} */ (document.getElementById('edit-source-form'));
    const newSourceTypeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('new-source-type'));
    const editSourceTypeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('edit-source-type'));

    // --- Dynamic Panel Toggling ---
    if (newSourceTypeSelect) {
        newSourceTypeSelect.addEventListener('change', () => {
            toggleSourceDetailPanels(newSourceTypeSelect.value, 'new-source');
        });
        // Set initial state
        toggleSourceDetailPanels(newSourceTypeSelect.value, 'new-source');
    }
    if (editSourceTypeSelect) {
        editSourceTypeSelect.addEventListener('change', () => {
            toggleSourceDetailPanels(editSourceTypeSelect.value, 'edit-source');
        });
        // Set initial state (will be reset when modal opens)
        toggleSourceDetailPanels(editSourceTypeSelect.value, 'edit-source');
    }

    // --- Add New Source ---
    if (addSourceForm) {
        addSourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (state.selectedAccountHolderId === 'all') {
                showToast('Please select a specific account holder first.', 'error');
                return;
            }

            const nameInput = /** @type {HTMLInputElement} */(document.getElementById('new-source-name'));
            const typeInput = /** @type {HTMLSelectElement} */(document.getElementById('new-source-type'));
            const urlInput = /** @type {HTMLInputElement} */(document.getElementById('new-source-url'));
            const descriptionInput = /** @type {HTMLTextAreaElement} */(document.getElementById('new-source-description'));
            const imagePathInput = /** @type {HTMLInputElement} */(document.getElementById('new-source-image-path'));
            
            const type = typeInput.value;
            // --- MODIFIED: This function now correctly gets details for 'Website' type ---
            const details = getSourceDetailsFromForm(type, 'new-source');

            const newSourceData = {
                account_holder_id: state.selectedAccountHolderId,
                name: nameInput.value,
                type: type,
                url: urlInput.value,
                description: descriptionInput.value,
                image_path: imagePathInput.value.trim() || null,
                details: details, // Add the dynamic details object
                is_active: true // New sources are active by default
            };

            try {
                const newSource = await addAdviceSource(newSourceData);
                // Re-fetch the full list for the modal
                const allSources = await fetchAllAdviceSourcesForSettings(state.selectedAccountHolderId);
                renderAdviceSourceManagementList(allSources);
                
                // Re-fetch active sources for the rest of the app
                await fetchAndStoreAdviceSources();
                populateAllAdviceSourceDropdowns();

                addSourceForm.reset();
                toggleSourceDetailPanels('', 'new-source'); // Reset dynamic form
                showToast('Advice Source added successfully!', 'success');
            } catch (error) {
                console.error("Failed to add advice source:", error);
                // @ts-ignore
                showToast(`Error adding source: ${error.message}`, 'error');
            }
        });
    }

    // --- Edit/Delete Source (via event delegation on <ul>) ---
    if (sourceList) {
        sourceList.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const editButton = target.closest('.edit-source-btn');
            const deleteButton = target.closest('.delete-source-btn');

            if (editButton) {
                const sourceId = (/** @type {HTMLElement} */(editButton)).dataset.id;                // Fetch the *full* list of sources from the API
                const allSources = await fetchAllAdviceSourcesForSettings(state.selectedAccountHolderId);
                const source = allSources.find(s => String(s.id) === sourceId);

                if (source && editSourceModal) {
                    // Populate common fields
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-id'))).value = String(source.id);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-name'))).value = source.name;
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-type'))).value = source.type;
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-url'))).value = source.url || '';
                    (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-description'))).value = source.description || '';
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-image-path'))).value = source.image_path || '';

                    // --- MODIFIED: This function now correctly populates 'Website' fields ---
                    populateEditFormDetails(source.details, source.type);
                    
                    // Show the correct dynamic panel
                    toggleSourceDetailPanels(source.type, 'edit-source');
                    
                    editSourceModal.classList.add('visible');
                }
            }

            if (deleteButton) {
                const sourceId = (/** @type {HTMLElement} */(deleteButton)).dataset.id;                showConfirmationModal('Delete Source?', 'This cannot be undone. Are you sure?', async () => {
                    try {
                        await deleteAdviceSource(sourceId);
                        
                        // Re-fetch the full list for the modal
                        const allSources = await fetchAllAdviceSourcesForSettings(state.selectedAccountHolderId);
                        renderAdviceSourceManagementList(allSources);
                        
                        // Re-fetch active sources for the rest of the app
                        await fetchAndStoreAdviceSources();
                        populateAllAdviceSourceDropdowns();

                        showToast('Advice Source deleted.', 'success');
                    } catch (error) {
                        console.error("Failed to delete advice source:", error);
                        // @ts-ignore
                        showToast(`Error deleting source: ${error.message}`, 'error');
                    }
                });
            }
        });

        // --- NEW: Handle the 'Active' checkbox toggle ---
        sourceList.addEventListener('change', async (e) => {
            const target = /** @type {HTMLInputElement} */ (e.target);
            if (target.matches('.edit-source-is-active')) {
                const id = target.dataset.id;
                const isChecked = target.checked;
                const li = target.closest('li');

                if (!id) return;

                try {
                    // Call the new, simple API endpoint
                    await toggleAdviceSourceActive(id, isChecked);
                    showToast(`Source ${isChecked ? 'activated' : 'deactivated'}.`, 'success');
                    
                    // Visually update the item in the settings list
                    if (li) {
                        li.style.opacity = isChecked ? '1' : '0.6';
                        // Find/remove the "HIDDEN" span
                        const hiddenSpan = li.querySelector('.source-hidden-marker');
                        if (!isChecked && !hiddenSpan) {
                            const editBtn = li.querySelector('.edit-source-btn');
                            if (editBtn) {
                                editBtn.insertAdjacentHTML('beforebegin', '<span class="source-hidden-marker" style="color: var(--negative-color); font-weight: bold; margin-right: 10px;">HIDDEN</span>');
                            }
                        } else if (isChecked && hiddenSpan) {
                            hiddenSpan.remove();
                        }
                    }

                    // Refresh the main app's active-only source list
                    await fetchAndStoreAdviceSources();
                    // Re-populate all dropdowns with the new active-only list
                    populateAllAdviceSourceDropdowns();

                } catch (error) {
                    // @ts-ignore
                    showToast(`Error updating status: ${error.message}`, 'error');
                    target.checked = !isChecked; // Revert checkbox on fail
                }
            }
        });
    }

    // --- Save Edited Source ---
    if (editSourceForm && editSourceModal) {
        editSourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-source-id'))).value;
            const type = (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-type'))).value;
            
            // Find the current 'is_active' status from the checkbox in the list (not in the modal)
            const activeCheckbox = /** @type {HTMLInputElement} */(document.getElementById(`active-toggle-${id}`));
            const isActive = activeCheckbox ? activeCheckbox.checked : true; // Default to true if not found

            // --- MODIFIED: This function now correctly gets details for 'Website' type ---
            const details = getSourceDetailsFromForm(type, 'edit-source');

            const updatedSourceData = {
                name: (/** @type {HTMLInputElement} */(document.getElementById('edit-source-name'))).value,
                type: type,
                url: (/** @type {HTMLInputElement} */(document.getElementById('edit-source-url'))).value,
                description: (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-description'))).value,
                image_path: (/** @type {HTMLInputElement} */(document.getElementById('edit-source-image-path'))).value.trim() || null,
                details: details, // Add the dynamic details object
                is_active: isActive // Pass the current active status
            };

            try {
                await updateAdviceSource(id, updatedSourceData);
                
                // Re-fetch the full list for the modal
                const allSources = await fetchAllAdviceSourcesForSettings(state.selectedAccountHolderId);
                renderAdviceSourceManagementList(allSources);
                        
                // Re-fetch active sources for the rest of the app
                await fetchAndStoreAdviceSources();
                populateAllAdviceSourceDropdowns();

                editSourceModal.classList.remove('visible');
                showToast('Advice Source updated successfully!', 'success');
            } catch (error) {
                console.error("Failed to update advice source:", error);
                // @ts-ignore
                showToast(`Error updating source: ${error.message}`, 'error');
            }
        });
    }
}