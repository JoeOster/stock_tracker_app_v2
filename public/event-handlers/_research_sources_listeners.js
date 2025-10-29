// public/event-handlers/_research_sources_listeners.js
/**
 * @file Initializes listeners for Research Sources cards and modal actions.
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
 * Stores the reference to the currently active click handler for the sources list grid.
 * @type {EventListener | null}
 */
let currentSourcesListClickHandler = null;
/**
 * Stores the reference to the currently active click handler for the modal actions.
 * @type {EventListener | null}
 */
let currentModalActionHandler = null; // Listener for modal content

/**
 * Attaches event listeners specifically for actions *within* the source details modal content area.
 * Ensures only one listener is active at a time.
 * @param {HTMLElement} modalContentArea - The content area element (`#source-details-modal-content`).
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the modal content.
 * @returns {void}
 */
function initializeModalActionHandlers(modalContentArea, refreshDetailsCallback) {
    console.log("[Modal Actions] Initializing listeners for modal content area."); // Log init

    // Remove previous listener if exists
    if (currentModalActionHandler) {
        modalContentArea.removeEventListener('click', currentModalActionHandler);
        console.log("[Modal Actions] Removed previous modal action handler.");
    }

    /**
     * Handles clicks *within* the modal content area.
     * @param {Event} e - The click event.
     */
    const newModalHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const detailsModal = target.closest('#source-details-modal'); // Get modal ref
        const modalSourceId = detailsModal?.dataset.sourceId;
        const modalHolderId = detailsModal?.dataset.holderId; // Stored as string

        // Basic check
        if (!modalSourceId || !modalHolderId || modalHolderId === 'all') {
             console.warn("[Modal Actions] Click handler: Missing sourceId or holderId on modal dataset.");
             return;
        }

        console.log(`[Modal Actions] Click detected inside modal content. Target:`, target); // Log click target

        // --- Delegate Actions triggered *within the modal* ---
        if (target.closest('.add-watchlist-item-form') && target.matches('.add-watchlist-ticker-button')) {
            console.log("[Modal Actions] Delegating to handleAddWatchlistSubmit");
            // Pass the modal's refreshDetails function as the callback
            await handleAddWatchlistSubmit(e, refreshDetailsCallback);
        } else if (target.closest('.add-document-form') && target.matches('.add-document-button')) {
            console.log("[Modal Actions] Delegating to handleAddDocumentSubmit");
            await handleAddDocumentSubmit(e, refreshDetailsCallback);
        } else if (target.closest('.add-source-note-form') && target.matches('.add-source-note-button')) {
            console.log("[Modal Actions] Delegating to handleAddNoteSubmit");
            await handleAddNoteSubmit(e, refreshDetailsCallback);
        } else if (target.closest('.delete-btn')) {
            console.log("[Modal Actions] Delegating to handleDeleteClick");
            // Pass modal's source/holder ID
            await handleDeleteClick(target, modalSourceId, modalHolderId, refreshDetailsCallback);
        } else if (target.closest('.note-actions button, .note-content-edit button')) {
            console.log("[Modal Actions] Delegating to handleNoteEditActions");
            // Pass modal's source/holder ID
            await handleNoteEditActions(target, modalSourceId, modalHolderId, refreshDetailsCallback);
        }
        // --- Handle Checkbox for Order Fields (Keep as is, but it's now correctly scoped) ---
        const createBuyCheckbox = /** @type {HTMLInputElement | null} */ (target.closest('.add-watchlist-item-form')?.querySelector('.add-watchlist-create-buy-checkbox'));
        if (createBuyCheckbox && target === createBuyCheckbox) {
             console.log(`[Modal Actions] Create Buy Order checkbox toggled: ${createBuyCheckbox.checked}`);
             // No fields to show/hide anymore
        } // End Checkbox handler
    };

    modalContentArea.addEventListener('click', newModalHandler);
    currentModalActionHandler = newModalHandler; // Store reference
     console.log("[Modal Actions] Attached new modal action handler.");
}


/**
 * Initializes or re-initializes the event listener for the sources card grid container.
 * Handles opening the details modal. Action delegation is now handled by initializeModalActionHandlers.
 * Ensures only one listener is active at a time.
 * @param {HTMLElement} sourcesListContainer - The container element holding the source cards (`#sources-cards-grid`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
    // Remove the previous grid listener if it exists
    if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
         console.log("[Grid Listener] Removed previous grid click handler.");
    }

    /**
     * Handles clicks within the sources card grid (primarily for opening the modal).
     * @param {Event} e - The click event.
     * @returns {Promise<void>}
     */
    const newGridClickHandler = async (e) => {
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
        const modalContentArea = /** @type {HTMLElement | null} */ (document.getElementById('source-details-modal-content')); // Ensure type

        /**
         * Refreshes the details view within the modal. (Defined inside click handler scope)
         * @async
         * @returns {Promise<void>}
         */
        const refreshDetails = async () => {
             console.log("[refreshDetails - inner] Attempting refresh..."); // Differentiate log
            if (!detailsModal || !detailsModal.classList.contains('visible') || !modalContentArea) { /* ... */ return; }
            const modalSourceId = detailsModal.dataset.sourceId;
            const modalHolderId = detailsModal.dataset.holderId;
            if (!modalSourceId || !modalHolderId || modalHolderId === 'all') { /* ... */ return; }

            console.log(`[refreshDetails - inner] Source ID: ${modalSourceId}, Holder ID: ${modalHolderId}`);
            modalContentArea.innerHTML = '<p><i>Refreshing details...</i></p>';
            try {
                console.log("[refreshDetails - inner] Calling fetchSourceDetails...");
                const refreshedDetails = await fetchSourceDetails(modalSourceId, modalHolderId);
                console.log("[refreshDetails - inner] fetchSourceDetails returned:", refreshedDetails);
                console.log("[refreshDetails - inner] Watchlist items:", refreshedDetails?.watchlistItems);

                // Re-render HTML and re-attach action listeners
                modalContentArea.innerHTML = generateSourceDetailsHTML(refreshedDetails);
                initializeModalActionHandlers(modalContentArea, refreshDetails); // Re-attach listeners after render
                console.log("[refreshDetails - inner] Refreshed details rendered and listeners re-attached.");
            } catch (err) { /* ... error handling ... */ }
        };

        // --- Check if the click is on the card itself (not inside modal) ---
        const isClickableArea = sourceCardElement && sourceCardElement.contains(target);
        const isClickInsideModal = target.closest('#source-details-modal'); // Still useful check

        // --- Open Details Modal on Card Click ---
        if (isClickableArea && sourceCardElement && !isClickInsideModal) {
            console.log("[Grid Listener] Processing click on source card to open modal.");

            // Basic checks
            if (!sourceId || holderId === 'all' || !detailsModal || !modalTitle || !modalContentArea) { /* ... error handling ... */ return; }

            // Set loading state and store IDs on the modal for refresh
            modalTitle.textContent = `Source Details: Loading...`;
            modalContentArea.innerHTML = '<p><i>Loading details...</i></p>';
            detailsModal.dataset.sourceId = sourceId; // Store for refresh
            detailsModal.dataset.holderId = String(holderId); // Store for refresh
            detailsModal.classList.add('visible'); // Show modal immediately

            try {
                // Fetch and render
                const holderIdParam = typeof holderId === 'number' ? String(holderId) : holderId;
                console.log(`[Grid Listener] Calling fetchSourceDetails. ID: ${sourceId}, Holder: ${holderIdParam}`);
                const details = await fetchSourceDetails(sourceId, holderIdParam);
                console.log("[Grid Listener] Fetched details for modal:", details);

                modalTitle.textContent = `Source Details: ${details.source.name || 'Unknown'}`;
                modalContentArea.innerHTML = generateSourceDetailsHTML(details);
                console.log("[Grid Listener] Details rendered in modal.");

                // *** Initialize modal action listeners AFTER content is rendered ***
                initializeModalActionHandlers(modalContentArea, refreshDetails);

            } catch (error) { /* ... error handling ... */ }
        } // End if (isClickableArea)

        // --- Action delegation logic is REMOVED from here ---

    }; // End of newGridClickHandler

    sourcesListContainer.addEventListener('click', newGridClickHandler);
    currentSourcesListClickHandler = newGridClickHandler; // Store reference to the NEW handler
    console.log("[Grid Listener] Attached new sources list grid click handler (modal opener).");
}