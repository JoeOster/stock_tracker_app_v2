// public/event-handlers/_research_sources_listeners.js
/**
 * @file Initializes the main listener for the Research Sources card grid.
 * @module event-handlers/_research_sources_listeners
 */

import { state } from '../state.js';
import { fetchSourceDetails } from '../api.js';
import { showToast } from '../ui/helpers.js';
import { generateSourceDetailsHTML } from './_research_sources_render.js';
// Import action handlers
import {
    handleAddWatchlistSubmit, handleAddDocumentSubmit, handleAddNoteSubmit,
    handleDeleteClick, handleNoteEditActions
} from './_research_sources_actions.js';

/**
 * Stores the reference to the currently active click handler for the sources list.
 * @type {EventListener | null}
 */
let currentSourcesListClickHandler = null;

/**
 * Initializes or re-initializes the event listener for the sources card grid container.
 * Handles opening the details modal and delegates actions to specific handlers.
 * Ensures only one listener is active at a time.
 * @param {HTMLElement} sourcesListContainer - The container element holding the source cards (`#sources-cards-grid`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
    // Remove the previous listener if it exists to prevent duplicates
    if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
    }

    /**
     * Handles clicks within the sources card grid.
     * @param {Event} e - The click event.
     * @returns {Promise<void>}
     */
    const newClickHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        // Ensure state.selectedAccountHolderId is treated consistently
        const holderId = (typeof state.selectedAccountHolderId === 'string' && state.selectedAccountHolderId.toLowerCase() === 'all')
            ? 'all'
            : state.selectedAccountHolderId;
        // Target the card itself
        const sourceCardElement = /** @type {HTMLElement | null} */ (target.closest('.source-card[data-source-id]'));
        const sourceId = sourceCardElement?.dataset.sourceId;

        // --- Get Modal Elements ---
        const detailsModal = document.getElementById('source-details-modal');
        const modalTitle = document.getElementById('source-details-modal-title');
        const modalContentArea = document.getElementById('source-details-modal-content');

        /**
         * Refreshes the details view within the modal.
         * @async
         * @returns {Promise<void>}
         */
        const refreshDetails = async () => {
            // Modal must be open and have sourceId/holderId stored to refresh
            if (!detailsModal || !detailsModal.classList.contains('visible') || !modalContentArea) {
                 console.warn("Refresh Details: Modal not visible or content area not found.");
                 return;
            }
            const modalSourceId = detailsModal.dataset.sourceId;
            const modalHolderId = detailsModal.dataset.holderId; // Stored as string

             // Ensure holderId is a number or valid string before proceeding
             if (!modalSourceId || !modalHolderId || modalHolderId === 'all') {
                 console.warn("Refresh Details: Missing sourceId or holderId on modal.");
                 modalContentArea.innerHTML = '<p style="color: var(--negative-color);">Could not refresh: Context missing.</p>';
                 return;
             }

            console.log(`Attempting refreshDetails for Source ID: ${modalSourceId} in modal.`);
            modalContentArea.innerHTML = '<p><i>Refreshing details...</i></p>';
            try {
                // Fetch using IDs stored on the modal
                const refreshedDetails = await fetchSourceDetails(modalSourceId, modalHolderId);
                // Use the generate function and set innerHTML of modal content
                modalContentArea.innerHTML = generateSourceDetailsHTML(refreshedDetails);
                console.log("Refreshed details rendered in modal.");
            } catch (err) {
                const error = /** @type {Error} */ (err);
                console.error("Error during refreshDetails fetch/render:", error);
                showToast(`Error refreshing details: ${error.message}`, 'error');
                modalContentArea.innerHTML = '<p style="color: var(--negative-color);">Error refreshing details.</p>';
            }
        };

        // --- Check if the click is on the card itself (not inside details forms/buttons) ---
        const isClickableArea = sourceCardElement && sourceCardElement.contains(target) && !target.closest('.source-details-content');
        // We *don't* want clicks inside the *modal* to re-trigger this.
        const isClickInsideModal = target.closest('#source-details-modal');

        // --- Open Details Modal on Card Click ---
        if (isClickableArea && sourceCardElement && !isClickInsideModal) {
            console.log("Processing click on source card to open modal.");

            // Basic checks
            if (!sourceId || holderId === 'all' || !detailsModal || !modalTitle || !modalContentArea) {
                if(holderId === 'all') showToast("Please select a specific account holder.", "info");
                else console.error("Could not open details modal: Missing sourceId, specific holderId, or modal elements.");
                return;
            }

            // Set loading state and store IDs on the modal for refresh
            modalTitle.textContent = `Source Details: Loading...`;
            modalContentArea.innerHTML = '<p><i>Loading details...</i></p>';
            detailsModal.dataset.sourceId = sourceId; // Store for refresh
            detailsModal.dataset.holderId = String(holderId); // Store for refresh
            detailsModal.classList.add('visible'); // Show modal immediately

            try {
                // Ensure holderId is passed as number or string expected by API
                const holderIdParam = typeof holderId === 'number' ? String(holderId) : holderId;
                console.log(`Calling fetchSourceDetails. ID: ${sourceId}, Holder: ${holderIdParam}`);
                const details = await fetchSourceDetails(sourceId, holderIdParam);
                console.log("Fetched details for modal:", details);

                // Update modal title and content *after* fetch
                modalTitle.textContent = `Source Details: ${details.source.name || 'Unknown'}`;
                modalContentArea.innerHTML = generateSourceDetailsHTML(details);
                console.log("Details rendered in modal.");

            } catch (error) {
                const err = /** @type {Error} */ (error);
                console.error(`Error fetching/rendering details for modal (Source ID ${sourceId}):`, err);
                showToast(`Failed to load details: ${err.message}`, 'error');
                modalTitle.textContent = `Source Details: Error`;
                modalContentArea.innerHTML = '<p style="color: var(--negative-color);">Error loading details.</p>';
                // Keep modal open to show error
            }
        } // End if (isClickableArea)

        // --- Delegate Actions triggered *within the modal* ---
        // Ensure the event target is within the modal's content area
        if (modalContentArea && modalContentArea.contains(target)) {
            if (target.closest('.add-watchlist-item-form') && target.matches('.add-watchlist-ticker-button')) {
                console.log("Delegating modal action to handleAddWatchlistSubmit");
                // Pass the modal's refreshDetails function as the callback
                await handleAddWatchlistSubmit(e, refreshDetails);
            } else if (target.closest('.add-document-form') && target.matches('.add-document-button')) {
                console.log("Delegating modal action to handleAddDocumentSubmit");
                await handleAddDocumentSubmit(e, refreshDetails);
            } else if (target.closest('.add-source-note-form') && target.matches('.add-source-note-button')) {
                console.log("Delegating modal action to handleAddNoteSubmit");
                await handleAddNoteSubmit(e, refreshDetails);
            } else if (target.closest('.delete-btn')) {
                const modalSourceId = detailsModal?.dataset.sourceId; // Get ID from modal
                const modalHolderId = detailsModal?.dataset.holderId; // Get ID from modal
                if (modalSourceId && modalHolderId && modalHolderId !== 'all') {
                    console.log("Delegating modal action to handleDeleteClick");
                    // Pass modal's source/holder ID
                    await handleDeleteClick(target, modalSourceId, modalHolderId, refreshDetails);
                } else {
                     console.warn("Could not handle delete click: Missing source/holder ID on modal.");
                }
            } else if (target.closest('.note-actions button, .note-content-edit button')) {
                 const modalSourceId = detailsModal?.dataset.sourceId; // Get ID from modal
                 const modalHolderId = detailsModal?.dataset.holderId; // Get ID from modal
                 if (modalSourceId && modalHolderId && modalHolderId !== 'all') {
                    console.log("Delegating modal action to handleNoteEditActions");
                    // Pass modal's source/holder ID
                    await handleNoteEditActions(target, modalSourceId, modalHolderId, refreshDetails);
                 } else {
                     console.warn("Could not handle note edit action: Missing source/holder ID on modal.");
                 }
            }
            // --- Handle Checkbox for Order Fields within Modal ---
            const createOrderCheckbox = /** @type {HTMLInputElement | null} */ (target.closest('.add-watchlist-item-form')?.querySelector('.add-watchlist-create-order-checkbox'));
            if (createOrderCheckbox && target === createOrderCheckbox) {
                 // Logic remains the same, just ensure selectors work within modalContentArea if needed
                 const form = target.closest('.add-watchlist-item-form');
                 const orderFields = form?.querySelectorAll('.add-wl-order-fields');
                 const exchangeSelect = form?.querySelector('.add-watchlist-exchange-select');

                 if (orderFields && exchangeSelect) {
                    if (createOrderCheckbox.checked) {
                        if (/** @type {HTMLSelectElement} */(exchangeSelect).options.length <= 1) {
                             /** @type {HTMLSelectElement} */(exchangeSelect).innerHTML = '<option value="" disabled selected>Select Exchange*</option>';
                            (state.allExchanges || [])
                                 .sort((a, b) => a.name.localeCompare(b.name))
                                 .forEach(ex => {
                                     const option = document.createElement('option');
                                     option.value = ex.name; option.textContent = ex.name;
                                     exchangeSelect.appendChild(option);
                                 });
                        }
                        orderFields.forEach(el => (/**@type{HTMLElement}*/(el)).style.display = 'block');
                    } else {
                        orderFields.forEach(el => (/**@type{HTMLElement}*/(el)).style.display = 'none');
                    }
                 }
            } // End Checkbox handler

        } // End if (modalContentArea contains target)

    }; // End of newClickHandler

    sourcesListContainer.addEventListener('click', newClickHandler);
    currentSourcesListClickHandler = newClickHandler; // Store reference to the NEW handler
    console.log("Attached new sources list click handler (modal version).");
}