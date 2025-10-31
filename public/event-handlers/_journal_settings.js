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
    deleteAdviceSource
} from '../api/sources-api.js';

/**
 * Fetches advice sources from the API and stores them in the state.
 * @async
 * @returns {Promise<void>}
 */
export async function fetchAndStoreAdviceSources() {
    if (!state.selectedAccountHolderId || state.selectedAccountHolderId === 'all') {
        updateState({ allAdviceSources: [] });
        return;
    }
    try {
        const sources = await fetchAdviceSources(state.selectedAccountHolderId);
        updateState({ allAdviceSources: sources });
    } catch (error) {
        console.error("Failed to fetch advice sources:", error);
        // @ts-ignore
        showToast(`Error fetching advice sources: ${error.message}`, 'error');
        updateState({ allAdviceSources: [] });
    }
}

/**
 * Shows or hides dynamic panels in a source form based on the selected type.
 * @param {string} type - The selected source type (e.g., 'Person', 'Book').
 * @param {string} formPrefix - The prefix for the form elements (e.g., 'new-source' or 'edit-source').
 */
function toggleSourceDetailPanels(type, formPrefix) {
    const personPanel = document.getElementById(`${formPrefix}-panel-person`);
    const bookPanel = document.getElementById(`${formPrefix}-panel-book`);
    const websitePanel = document.getElementById(`${formPrefix}-panel-website`);

    // Hide all panels first
    if (personPanel) personPanel.style.display = 'none';
    if (bookPanel) bookPanel.style.display = 'none';
    if (websitePanel) websitePanel.style.display = 'none';

    // Show the correct panel
    switch (type) {
        case 'Person':
        case 'Group':
            if (personPanel) personPanel.style.display = 'grid';
            break;
        case 'Book':
            if (bookPanel) bookPanel.style.display = 'grid';
            break;
        case 'Website':
            if (websitePanel) websitePanel.style.display = 'grid'; // Show (empty)
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
    switch (type) {
        case 'Person':
        case 'Group':
            details.contact_person = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-person`))).value;
            details.contact_email = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-email`))).value;
            details.contact_phone = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-phone`))).value;
            details.contact_app_type = (/** @type {HTMLSelectElement} */(document.getElementById(`${formPrefix}-contact-app-type`))).value;
            details.contact_app_handle = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-contact-app-handle`))).value;
            break;
        case 'Book':
            details.author = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-book-author`))).value;
            details.isbn = (/** @type {HTMLInputElement} */(document.getElementById(`${formPrefix}-book-isbn`))).value;
            break;
        case 'Website':
            // No specific fields, details object remains empty.
            break;
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
        case 'Group':
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-person'))).value = d.contact_person || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-email'))).value = d.contact_email || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-phone'))).value = d.contact_phone || '';
            (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-contact-app-type'))).value = d.contact_app_type || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-contact-app-handle'))).value = d.contact_app_handle || '';
            break;
        case 'Book':
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-book-author'))).value = d.author || '';
            (/** @type {HTMLInputElement} */(document.getElementById('edit-source-book-isbn'))).value = d.isbn || '';
            break;
        case 'Website':
            // No fields to populate
            break;
    }
}

/**
 * Initializes all event handlers for the Advice Sources management panel.
 * @returns {void}
 */
export function initializeJournalSettingsHandlers() {
    const addSourceForm = /** @type {HTMLFormElement} */ (document.getElementById('add-new-source-form'));
    const sourceListContainer = document.getElementById('advice-source-list-container');
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
            
            const type = typeInput.value;
            const details = getSourceDetailsFromForm(type, 'new-source');

            const newSourceData = {
                account_holder_id: state.selectedAccountHolderId,
                name: nameInput.value,
                type: type,
                url: urlInput.value,
                description: descriptionInput.value,
                image_path: null, // Image upload not implemented yet
                details: details // Add the dynamic details object
            };

            try {
                const newSource = await addAdviceSource(newSourceData);
                // @ts-ignore
                updateState({ allAdviceSources: [...state.allAdviceSources, newSource] });
                renderAdviceSourceManagementList(state.allAdviceSources);
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

    // --- Edit/Delete Source (via event delegation) ---
    if (sourceListContainer) {
        sourceListContainer.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const editButton = target.closest('.edit-source-btn');
            const deleteButton = target.closest('.delete-source-btn');

            if (editButton) {
                const sourceId = editButton.dataset.id;
                const source = state.allAdviceSources.find(s => String(s.id) === sourceId);
                if (source && editSourceModal) {
                    // Populate common fields
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-id'))).value = String(source.id);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-name'))).value = source.name;
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-type'))).value = source.type;
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-source-url'))).value = source.url || '';
                    (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-description'))).value = source.description || '';

                    // Populate dynamic fields
                    populateEditFormDetails(source.details, source.type);
                    
                    // Show the correct dynamic panel
                    toggleSourceDetailPanels(source.type, 'edit-source');
                    
                    editSourceModal.classList.add('visible');
                }
            }

            if (deleteButton) {
                const sourceId = deleteButton.dataset.id;
                showConfirmationModal('Delete Source?', 'This cannot be undone. Are you sure?', async () => {
                    try {
                        await deleteAdviceSource(sourceId);
                        // @ts-ignore
                        updateState({ allAdviceSources: state.allAdviceSources.filter(s => String(s.id) !== sourceId) });
                        renderAdviceSourceManagementList(state.allAdviceSources);
                        showToast('Advice Source deleted.', 'success');
                    } catch (error) {
                        console.error("Failed to delete advice source:", error);
                        // @ts-ignore
                        showToast(`Error deleting source: ${error.message}`, 'error');
                    }
                });
            }
        });
    }

    // --- Save Edited Source ---
    if (editSourceForm && editSourceModal) {
        editSourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-source-id'))).value;
            const type = (/** @type {HTMLSelectElement} */(document.getElementById('edit-source-type'))).value;
            
            const details = getSourceDetailsFromForm(type, 'edit-source');

            const updatedSourceData = {
                name: (/** @type {HTMLInputElement} */(document.getElementById('edit-source-name'))).value,
                type: type,
                url: (/** @type {HTMLInputElement} */(document.getElementById('edit-source-url'))).value,
                description: (/** @type {HTMLTextAreaElement} */(document.getElementById('edit-source-description'))).value,
                image_path: null, // Image upload not implemented yet
                details: details // Add the dynamic details object
            };

            try {
                await updateAdviceSource(id, updatedSourceData);
                // @ts-ignore
                const updatedSources = state.allAdviceSources.map(s =>
                    String(s.id) === id ? { ...s, ...updatedSourceData, id: parseInt(id) } : s
                );
                updateState({ allAdviceSources: updatedSources });
                renderAdviceSourceManagementList(state.allAdviceSources);
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
