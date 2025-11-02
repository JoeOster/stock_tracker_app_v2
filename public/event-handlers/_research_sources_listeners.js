// public/event-handlers/_research_sources_listeners.js
/**
 * @file Initializes listeners for Research Sources cards and modal actions.
 * @module event-handlers/_research_sources_listeners
 */

import { fetchSourceDetails } from '../api/sources-api.js';
import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { generateSourceDetailsHTML } from './_research_sources_modal.js';
import {
  handleCreateBuyOrderFromIdea,
  handleCreatePaperTradeFromIdea,
  handleCreateTradeIdeaFromTechnique,
  initializeAddTradeIdeaModalHandler,
  handleCreateTradeIdeaFromSource,
  handleCreateTradeIdeaFromBook, // --- ADDED ---
} from './_research_sources_actions_watchlist.js';
import { handleAddDocumentSubmit } from './_research_sources_actions_docs.js';
import {
  handleAddNoteSubmit,
  handleDeleteClick,
  handleNoteEditActions,
} from './_research_sources_actions_notes.js';
// --- MODIFIED: Added handleOpenAddTechniqueModal to the import list ---
import {
  initializeAddTechniqueModalHandler,
  handleOpenAddTechniqueModal,
} from './_research_sources_actions_journal.js';
// --- END MODIFICATION ---

/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;
/** @type {EventListener | null} */
let currentModalActionHandler = null;
/** @type {boolean} */
let isAddTradeIdeaModalHandlerInitialized = false;
/** @type {boolean} */
let isAddTechniqueModalHandlerInitialized = false; // --- ADDED ---

/**
 * Attaches event listeners specifically for actions *within* the source details modal content area.
 * Ensures only one listener is active at a time.
 * @param {HTMLElement} modalContentArea - The content area element (`#source-details-modal-content`).
 * @param {object} details - The full details object (needed to pass journalEntries to handlers).
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {void}
 */
function initializeModalActionHandlers(
  modalContentArea,
  details,
  refreshDetailsCallback
) {
  // --- ADDED 'details' param ---
  console.log('[Modal Actions] Initializing listeners for modal content area.');

  if (currentModalActionHandler) {
    modalContentArea.removeEventListener('click', currentModalActionHandler);
    console.log('[Modal Actions] Removed previous modal action handler.');
  }

  // --- Initialize modal submit handlers (if not already done) ---
  if (!isAddTradeIdeaModalHandlerInitialized) {
    initializeAddTradeIdeaModalHandler(refreshDetailsCallback);
    isAddTradeIdeaModalHandlerInitialized = true;
  }
  if (!isAddTechniqueModalHandlerInitialized) {
    // --- ADDED ---
    initializeAddTechniqueModalHandler(refreshDetailsCallback);
    isAddTechniqueModalHandlerInitialized = true;
  }
  // --- END ---

  /**
   * Handles clicks inside the modal.
   * @param {Event} e - The click event.
   * @returns {Promise<void>}
   */
  const newModalHandler = async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const detailsModal = /** @type {HTMLElement | null} */ (
      target.closest('#source-details-modal')
    );
    const modalSourceId = detailsModal?.dataset.sourceId;
    const modalHolderId = detailsModal?.dataset.holderId;

    if (!modalSourceId || !modalHolderId || modalHolderId === 'all') {
      console.warn(
        '[Modal Actions] Click handler: Missing sourceId or holderId on modal dataset.'
      );
      return;
    }

    // --- MODIFIED: Handle all 3 "Add Idea" paths ---
    if (target.matches('#add-idea-from-source-btn')) {
      if (details.source.type === 'Person' || details.source.type === 'Group') {
        console.log(
          '[Modal Actions] Delegating to handleCreateTradeIdeaFromSource (Person/Group)'
        );
        await handleCreateTradeIdeaFromSource(target);
      } else {
        console.log(
          '[Modal Actions] Delegating to handleCreateTradeIdeaFromBook (Book/Etc)'
        );
        await handleCreateTradeIdeaFromBook(target, details.journalEntries);
      }
    } else if (target.matches('.develop-trade-idea-btn')) {
      console.log(
        '[Modal Actions] Delegating to handleCreateTradeIdeaFromTechnique (Technique Row)'
      );
      await handleCreateTradeIdeaFromTechnique(target, details.journalEntries);

      // --- ADDED: Handle "Add Technique" button ---
    } else if (target.matches('#add-technique-btn')) {
      console.log(
        '[Modal Actions] Delegating to handleOpenAddTechniqueModal (Book/Etc)'
      );
      // --- MODIFIED: This function will now be correctly imported ---
      await handleOpenAddTechniqueModal(target);

      // --- All other handlers ---
    } else if (target.matches('.add-document-button')) {
      console.log('[Modal Actions] Delegating to handleAddDocumentSubmit');
      await handleAddDocumentSubmit(e, refreshDetailsCallback);
    } else if (target.matches('.add-source-note-button')) {
      console.log('[Modal Actions] Delegating to handleAddNoteSubmit');
      await handleAddNoteSubmit(e, refreshDetailsCallback);
    } else if (
      target.closest(
        '.delete-watchlist-item-button, .delete-document-button, .delete-source-note-button, .delete-journal-btn'
      )
    ) {
      console.log('[Modal Actions] Delegating to handleDeleteClick');
      await handleDeleteClick(
        target,
        modalSourceId,
        modalHolderId,
        refreshDetailsCallback
      );
    } else if (
      target.closest('.note-actions button, .note-content-edit button')
    ) {
      console.log('[Modal Actions] Delegating to handleNoteEditActions');
      await handleNoteEditActions(
        target,
        modalSourceId,
        modalHolderId,
        refreshDetailsCallback
      );
    } else if (target.closest('.create-buy-order-btn')) {
      console.log('[Modal Actions] Delegating to handleCreateBuyOrderFromIdea');
      await handleCreateBuyOrderFromIdea(target);
    } else if (target.closest('.create-paper-trade-btn')) {
      console.log(
        '[Modal Actions] Delegating to handleCreatePaperTradeFromIdea'
      );
      await handleCreatePaperTradeFromIdea(target);
    } else if (target.closest('.technique-image-thumbnail')) {
      console.log('[Modal Actions] Opening Image Zoom Modal');
      const imgElement = target.closest('.technique-image-thumbnail');
      const imgSrc = imgElement.getAttribute('src');
      const zoomModal = document.getElementById('image-zoom-modal');
      const zoomImage = document.getElementById('zoomed-image-content');
      if (zoomModal && zoomImage && imgSrc) {
        /** @type {HTMLImageElement} */ (zoomImage).src = imgSrc;
        zoomModal.classList.add('visible');
      }
    }
  };

  modalContentArea.addEventListener('click', newModalHandler);
  currentModalActionHandler = newModalHandler;
  console.log('[Modal Actions] Attached new modal action handler.');
}

/**
 * Initializes or re-initializes the event listener for the sources card grid container.
 * @param {HTMLElement} sourcesListContainer - The container element holding the source cards (`#sources-cards-grid`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
  if (currentSourcesListClickHandler) {
    sourcesListContainer.removeEventListener(
      'click',
      currentSourcesListClickHandler
    );
    console.log('[Grid Listener] Removed previous grid click handler.');
  }

  /**
   * Handles clicks on the sources grid.
   * @param {Event} e - The click event.
   * @returns {Promise<void>}
   */
  const newGridClickHandler = async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const holderId =
      typeof state.selectedAccountHolderId === 'string' &&
      state.selectedAccountHolderId.toLowerCase() === 'all'
        ? 'all'
        : state.selectedAccountHolderId;
    const sourceCardElement = /** @type {HTMLElement | null} */ (
      target.closest('.source-card[data-source-id]')
    );
    const sourceId = sourceCardElement?.dataset.sourceId;

    const detailsModal = /** @type {HTMLElement | null} */ (
      document.getElementById('source-details-modal')
    );
    const modalTitle = document.getElementById('source-details-modal-title');
    const modalContentArea = /** @type {HTMLElement | null} */ (
      document.getElementById('source-details-modal-content')
    );

    /**
     * Refreshes the details content within the modal.
     * @async
     * @returns {Promise<void>}
     */
    const refreshDetails = async () => {
      console.log('[refreshDetails - inner] Attempting refresh...');
      if (
        !detailsModal ||
        !detailsModal.classList.contains('visible') ||
        !modalContentArea
      ) {
        return;
      }
      const modalSourceId = detailsModal.dataset.sourceId;
      const modalHolderId = detailsModal.dataset.holderId;
      if (!modalSourceId || !modalHolderId || modalHolderId === 'all') {
        return;
      }

      console.log(
        `[refreshDetails - inner] Source ID: ${modalSourceId}, Holder ID: ${modalHolderId}`
      );
      modalContentArea.innerHTML = '<p><i>Refreshing details...</i></p>';
      try {
        console.log('[refreshDetails - inner] Calling fetchSourceDetails...');
        // fetchSourceDetails returns the full details object, including summaryStats
        const refreshedDetails = await fetchSourceDetails(
          modalSourceId,
          modalHolderId
        );
        console.log(
          '[refreshDetails - inner] fetchSourceDetails returned:',
          refreshedDetails
        );

        // Pass the full details object to the renderer
        modalContentArea.innerHTML =
          generateSourceDetailsHTML(refreshedDetails);
        // --- MODIFIED: Pass 'refreshedDetails' to the listener setup ---
        initializeModalActionHandlers(
          modalContentArea,
          refreshedDetails,
          refreshDetails
        );
        console.log(
          '[refreshDetails - inner] Refreshed details rendered and listeners re-attached.'
        );
      } catch (err) {
        const error = /** @type {Error} */ (err);
        showToast(`Error refreshing details: ${error.message}`, 'error');
        if (modalContentArea) {
          modalContentArea.innerHTML =
            '<p style="color: var(--negative-color);">Error refreshing details.</p>';
        }
      }
    };

    const isClickableArea =
      sourceCardElement && sourceCardElement.contains(target);
    const isClickInsideModal = target.closest('#source-details-modal');

    if (isClickableArea && sourceCardElement && !isClickInsideModal) {
      console.log(
        '[Grid Listener] Processing click on source card to open modal.'
      );

      if (
        !sourceId ||
        holderId === 'all' ||
        !detailsModal ||
        !modalTitle ||
        !modalContentArea
      ) {
        if (holderId === 'all')
          showToast('Please select a specific account holder.', 'info');
        console.warn(
          'Could not open details: Missing sourceId, specific holderId, or modal elements.'
        );
        return;
      }

      modalTitle.textContent = `Source Details: Loading...`;
      modalContentArea.innerHTML = '<p><i>Loading details...</i></p>';
      detailsModal.dataset.sourceId = sourceId;
      detailsModal.dataset.holderId = String(holderId);
      detailsModal.classList.add('visible');

      try {
        const holderIdParam =
          typeof holderId === 'number' ? String(holderId) : holderId;
        console.log(
          `[Grid Listener] Calling fetchSourceDetails. ID: ${sourceId}, Holder: ${holderIdParam}`
        );
        const details = await fetchSourceDetails(sourceId, holderIdParam);
        console.log('[Grid Listener] Fetched details for modal:', details);

        const sourceName = details?.source?.name || 'Unknown';
        modalTitle.textContent = `Source Details: ${sourceName}`;
        modalContentArea.innerHTML = generateSourceDetailsHTML(details);
        console.log('[Grid Listener] Details rendered in modal.');

        // --- MODIFIED: Pass 'details' to the listener setup ---
        initializeModalActionHandlers(
          modalContentArea,
          details,
          refreshDetails
        );
      } catch (err) {
        // Catch as 'err'
        const error = /** @type {Error} */ (err); // Cast 'err' to 'error'
        console.error('[Grid Listener] Error fetching source details:', error);
        showToast(`Error loading details: ${error.message}`, 'error');
        if (modalTitle) modalTitle.textContent = `Source Details: Error`;
        if (modalContentArea)
          modalContentArea.innerHTML =
            '<p style="color: var(--negative-color);">Error loading details.</p>';
      }
    }
  };

  sourcesListContainer.addEventListener('click', newGridClickHandler);
  currentSourcesListClickHandler = newGridClickHandler;
  console.log(
    '[Grid Listener] Attached new sources list grid click handler (modal opener).'
  );
}
