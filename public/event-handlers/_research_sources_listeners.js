// public/event-handlers/_research_sources_listeners.js
/**
 * @file Initializes the main listener for the Research Sources card grid.
 * @module event-handlers/_research_sources_listeners
 */

import { state } from '../state.js';
import { fetchSourceDetails } from '../api.js';
import { showToast } from '../ui/helpers.js';
import { generateSourceDetailsHTML } from './_research_sources_render.js'; // Import HTML generator
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
 * Handles toggling details and delegates actions to specific handlers.
 * Ensures only one listener is active at a time.
 * @param {HTMLElement} sourcesListContainer - The container element holding the source cards (`#sources-cards-grid`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
    const storedHandler = /** @type {any} */ (sourcesListContainer)._clickHandler;
    if (storedHandler) {
        sourcesListContainer.removeEventListener('click', storedHandler);
    }

    /**
     * Handles clicks within the sources card grid.
     * @param {Event} e - The click event.
     * @returns {Promise<void>}
     */
    const newClickHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const holderId = state.selectedAccountHolderId;
        const sourceCardElement = /** @type {HTMLElement | null} */ (target.closest('.clickable-source[data-source-id]'));
        const sourceId = sourceCardElement?.dataset.sourceId;

        // --- Helper to refresh details ---
        const refreshDetails = async () => {
            if (sourceCardElement && sourceId && holderId !== 'all') {
                const detailsContainer = /** @type {HTMLElement | null} */ (sourceCardElement.querySelector('.source-details-content'));
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<p><i>Refreshing details...</i></p>';
                    detailsContainer.style.display = 'block';
                    detailsContainer.dataset.isLoading = 'true';
                    try {
                        const refreshedDetails = await fetchSourceDetails(sourceId, holderId);
                        // Use the generate function and set innerHTML
                        detailsContainer.innerHTML = generateSourceDetailsHTML(refreshedDetails);
                        delete detailsContainer.dataset.isLoading;
                    } catch (err) {
                        showToast(`Error refreshing details: ${err instanceof Error ? err.message : String(err)}`, 'error');
                        detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error refreshing details.</p>';
                        delete detailsContainer.dataset.isLoading;
                    }
                }
            }
        };

        // --- Toggle Details View ---
        const isInteractiveDetailElement = target.closest('.source-details-content a, .source-details-content button, .source-details-content input, .source-details-content select, .source-details-content textarea');
        const isClickableArea = target.closest('.source-card') && !isInteractiveDetailElement;

        if (isClickableArea && sourceCardElement) {
            const detailsContainer = /** @type {HTMLElement | null} */ (sourceCardElement.querySelector('.source-details-content'));
            if (!sourceId || !detailsContainer || holderId === 'all') {
                showToast('Please select an account holder.', 'info'); return;
            }
            if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) {
                detailsContainer.style.display = detailsContainer.style.display === 'none' ? 'block' : 'none'; return;
            }
            try {
                detailsContainer.innerHTML = '<p><i>Loading details...</i></p>';
                detailsContainer.style.display = 'block';
                detailsContainer.dataset.isLoading = 'true';
                const details = await fetchSourceDetails(sourceId, holderId);
                // Use the generate function and set innerHTML
                detailsContainer.innerHTML = generateSourceDetailsHTML(details);
                delete detailsContainer.dataset.isLoading;
            } catch (error) {
                console.error(`Error fetching details for source ${sourceId}:`, error);
                showToast(`Failed to load details: ${error instanceof Error ? error.message : String(error)}`, 'error');
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error loading details.</p>';
                    delete detailsContainer.dataset.isLoading;
                }
            }
        }

        // --- Delegate Actions to Handlers ---
        if (target.closest('.add-watchlist-item-form') && target.matches('.add-watchlist-ticker-button')) {
            await handleAddWatchlistSubmit(e, refreshDetails);
        } else if (target.closest('.add-document-form') && target.matches('.add-document-button')) {
            await handleAddDocumentSubmit(e, refreshDetails);
        } else if (target.closest('.add-source-note-form') && target.matches('.add-source-note-button')) {
            await handleAddNoteSubmit(e, refreshDetails);
        } else if (target.closest('.delete-btn') && sourceId && holderId !== 'all') { // Check sourceId/holderId before calling
             // Stop propagation here AFTER checking it's a delete button within the details area
            if (target.closest('.source-details-content')) {
                 e.stopPropagation();
                 await handleDeleteClick(target, sourceId, holderId, refreshDetails);
            }
        } else if (target.closest('.note-actions button, .note-content-edit button') && sourceId && holderId !== 'all') {
            e.stopPropagation();
            await handleNoteEditActions(target, sourceId, holderId, refreshDetails);
        }

        // --- Handle Checkbox for Order Fields ---
        const createOrderCheckbox = /** @type {HTMLInputElement | null} */ (target.closest('.add-watchlist-item-form')?.querySelector('.add-watchlist-create-order-checkbox'));
        if (createOrderCheckbox && target === createOrderCheckbox) {
             const form = target.closest('.add-watchlist-item-form');
             const orderFields = form?.querySelectorAll('.add-wl-order-fields');
             const exchangeSelect = form?.querySelector('.add-watchlist-exchange-select');

             if (orderFields && exchangeSelect) {
                if (createOrderCheckbox.checked) {
                    if (/** @type {HTMLSelectElement} */(exchangeSelect).options.length <= 1) {
                         /** @type {HTMLSelectElement} */(exchangeSelect).innerHTML = '<option value="" disabled selected>Select Exchange*</option>';
                        state.allExchanges
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
        }
    }; // End of newClickHandler

    sourcesListContainer.addEventListener('click', newClickHandler);
    /** @type {any} */ (sourcesListContainer)._clickHandler = newClickHandler; // Store reference
}