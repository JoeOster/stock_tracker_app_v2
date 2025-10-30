// public/event-handlers/_research_sources_listeners.js
/**
 * @file Initializes listeners for Research Sources cards and modal actions.
 * @module event-handlers/_research_sources_listeners
 */

import { state } from '../state.js';
import { fetchSourceDetails } from '../api.js';
import { showToast } from '../ui/helpers.js';
import { generateSourceDetailsHTML } from './_research_sources_render.js';
import {
    handleAddWatchlistSubmit,
    handleCreateBuyOrderFromIdea
} from './_research_sources_actions_watchlist.js';
import {
    handleAddDocumentSubmit
} from './_research_sources_actions_docs.js';
import {
    handleAddNoteSubmit,
    handleDeleteClick,
    handleNoteEditActions
} from './_research_sources_actions_notes.js';

/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;
/** @type {EventListener | null} */
let currentModalActionHandler = null;

/**
 * Attaches event listeners specifically for actions *within* the source details modal content area.
 * Ensures only one listener is active at a time.
 * @param {HTMLElement} modalContentArea - The content area element (`#source-details-modal-content`).
 * @param {() => Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {void}
 */
function initializeModalActionHandlers(modalContentArea, refreshDetailsCallback) {
    console.log("[Modal Actions] Initializing listeners for modal content area.");

    if (currentModalActionHandler) {
        modalContentArea.removeEventListener('click', currentModalActionHandler);
        console.log("[Modal Actions] Removed previous modal action handler.");
    }

    /** @param {Event} e */
    const newModalHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        // --- FIX: Cast detailsModal ---
        const detailsModal = /** @type {HTMLElement | null} */(target.closest('#source-details-modal'));
        // --- END FIX ---
        const modalSourceId = detailsModal?.dataset.sourceId; // Now valid
        const modalHolderId = detailsModal?.dataset.holderId; // Now valid

        if (!modalSourceId || !modalHolderId || modalHolderId === 'all') {
             console.warn("[Modal Actions] Click handler: Missing sourceId or holderId on modal dataset.");
             return;
        }

        console.log(`[Modal Actions] Click detected inside modal content. Target:`, target);

        if (target.closest('.add-watchlist-item-form') && target.matches('.add-watchlist-ticker-button')) {
            console.log("[Modal Actions] Delegating to handleAddWatchlistSubmit");
            await handleAddWatchlistSubmit(e, refreshDetailsCallback);
        } else if (target.closest('.add-document-form') && target.matches('.add-document-button')) {
            console.log("[Modal Actions] Delegating to handleAddDocumentSubmit");
            await handleAddDocumentSubmit(e, refreshDetailsCallback);
        } else if (target.closest('.add-source-note-form') && target.matches('.add-source-note-button')) {
            console.log("[Modal Actions] Delegating to handleAddNoteSubmit");
            await handleAddNoteSubmit(e, refreshDetailsCallback);
        } else if (target.closest('.delete-btn')) {
            console.log("[Modal Actions] Delegating to handleDeleteClick");
            await handleDeleteClick(target, modalSourceId, modalHolderId, refreshDetailsCallback);
        } else if (target.closest('.note-actions button, .note-content-edit button')) {
            console.log("[Modal Actions] Delegating to handleNoteEditActions");
            await handleNoteEditActions(target, modalSourceId, modalHolderId, refreshDetailsCallback);
        } else if (target.closest('.create-buy-order-btn')) {
            console.log("[Modal Actions] Delegating to handleCreateBuyOrderFromIdea");
            await handleCreateBuyOrderFromIdea(target);
        }
    };

    modalContentArea.addEventListener('click', newModalHandler);
    currentModalActionHandler = newModalHandler;
     console.log("[Modal Actions] Attached new modal action handler.");
}


/**
 * Initializes or re-initializes the event listener for the sources card grid container.
 * @param {HTMLElement} sourcesListContainer - The container element holding the source cards (`#sources-cards-grid`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
    if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
         console.log("[Grid Listener] Removed previous grid click handler.");
    }

    /** @param {Event} e */
    const newGridClickHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const holderId = (typeof state.selectedAccountHolderId === 'string' && state.selectedAccountHolderId.toLowerCase() === 'all')
            ? 'all'
            : state.selectedAccountHolderId;
        const sourceCardElement = /** @type {HTMLElement | null} */ (target.closest('.source-card[data-source-id]'));
        const sourceId = sourceCardElement?.dataset.sourceId; // Now valid

        const detailsModal = /** @type {HTMLElement | null} */(document.getElementById('source-details-modal')); // --- FIX: Cast detailsModal ---
        const modalTitle = document.getElementById('source-details-modal-title');
        const modalContentArea = /** @type {HTMLElement | null} */ (document.getElementById('source-details-modal-content'));

        /** @async @returns {Promise<void>} */
        const refreshDetails = async () => {
             console.log("[refreshDetails - inner] Attempting refresh...");
            if (!detailsModal || !detailsModal.classList.contains('visible') || !modalContentArea) { return; }
            const modalSourceId = detailsModal.dataset.sourceId; // Now valid
            const modalHolderId = detailsModal.dataset.holderId; // Now valid
            if (!modalSourceId || !modalHolderId || modalHolderId === 'all') { return; }

            console.log(`[refreshDetails - inner] Source ID: ${modalSourceId}, Holder ID: ${modalHolderId}`);
            modalContentArea.innerHTML = '<p><i>Refreshing details...</i></p>';
            try {
                console.log("[refreshDetails - inner] Calling fetchSourceDetails...");
                // --- FIX: Ensure fetchSourceDetails returns the summaryStats ---
                const refreshedDetails = await fetchSourceDetails(modalSourceId, modalHolderId);
                // --- END FIX ---
                console.log("[refreshDetails - inner] fetchSourceDetails returned:", refreshedDetails);
                console.log("[refreshDetails - inner] Watchlist items:", refreshedDetails?.watchlistItems);

                // --- FIX: Pass refreshedDetails which now includes summaryStats ---
                modalContentArea.innerHTML = generateSourceDetailsHTML(refreshedDetails);
                // --- END FIX ---
                initializeModalActionHandlers(modalContentArea, refreshDetails);
                console.log("[refreshDetails - inner] Refreshed details rendered and listeners re-attached.");
            } catch (err) {
                 const error = /** @type {Error} */ (err);
                 showToast(`Error refreshing details: ${error.message}`, 'error');
                 if (modalContentArea) {
                     modalContentArea.innerHTML = '<p style="color: var(--negative-color);">Error refreshing details.</p>';
                 }
            }
        };

        const isClickableArea = sourceCardElement && sourceCardElement.contains(target);
        const isClickInsideModal = target.closest('#source-details-modal');

        if (isClickableArea && sourceCardElement && !isClickInsideModal) {
            console.log("[Grid Listener] Processing click on source card to open modal.");

            if (!sourceId || holderId === 'all' || !detailsModal || !modalTitle || !modalContentArea) {
                if(holderId === 'all') showToast("Please select a specific account holder.", "info");
                console.warn("Could not open details: Missing sourceId, specific holderId, or modal elements.");
                return;
            }

            modalTitle.textContent = `Source Details: Loading...`;
            modalContentArea.innerHTML = '<p><i>Loading details...</i></p>';
            detailsModal.dataset.sourceId = sourceId; // Now valid
            detailsModal.dataset.holderId = String(holderId); // Now valid
            detailsModal.classList.add('visible');

            try {
                const holderIdParam = typeof holderId === 'number' ? String(holderId) : holderId;
                console.log(`[Grid Listener] Calling fetchSourceDetails. ID: ${sourceId}, Holder: ${holderIdParam}`);
                // --- FIX: Ensure fetchSourceDetails returns the summaryStats ---
                const details = await fetchSourceDetails(sourceId, holderIdParam);
                // --- END FIX ---
                console.log("[Grid Listener] Fetched details for modal:", details);

                const sourceName = details?.source?.name || 'Unknown';
                modalTitle.textContent = `Source Details: ${sourceName}`;
                // --- FIX: Pass details which now includes summaryStats ---
                modalContentArea.innerHTML = generateSourceDetailsHTML(details);
                // --- END FIX ---
                console.log("[Grid Listener] Details rendered in modal.");

                initializeModalActionHandlers(modalContentArea, refreshDetails);

            } catch (error) {
                 const err = /** @type {Error} */ (error);
                 console.error("[Grid Listener] Error fetching source details:", err);
                 showToast(`Error loading details: ${err.message}`, 'error');
                 modalTitle.textContent = `Source Details: Error`;
                 modalContentArea.innerHTML = '<p style="color: var(--negative-color);">Error loading details.</p>';
            }
        }
    };

    sourcesListContainer.addEventListener('click', newGridClickHandler);
    currentSourcesListClickHandler = newGridClickHandler;
    console.log("[Grid Listener] Attached new sources list grid click handler (modal opener).");
}