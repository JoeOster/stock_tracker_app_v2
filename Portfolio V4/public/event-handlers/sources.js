import { state, updateState } from '../state.js';
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import {
  fetchSourceDetails,
  addSourceNote,
  updateSourceNote,
  deleteSourceNote,
} from '../api/sources-api.js';
import { addDocument, deleteDocument } from '../../api/documents-api.js';

import {
  populateAllAdviceSourceDropdowns,
  getSourceNameFromId,
} from '../ui/dropdowns.js';
import {
  getCurrentESTDateString,
  getCurrentESTDateTimeLocalString,
} from '../ui/datetime.js';

import { deleteJournalEntry } from '../api/journal-api.js';
import { populateSellFromPositionModal } from './_modal_sell_from_position.js';
import { initializeAddTradeIdeaModalHandler } from './_modal_add_trade_idea.js';
import { switchView } from './_navigation.js';
import { initializeAddTechniqueModalHandler } from './_modal_add_technique.js';
import { handleOpenAddTechniqueModal } from '../../public/event-handlers/_research_sources_actions_journal.js';
import { closeWatchlistIdea } from '../../api/watchlist-api.js';

/**
 * Escapes HTML special characters in a string.
 * @param {string | null | undefined} str The string to escape.
 * @returns {string} The escaped string.
 */
const escapeHTML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * --- ADDED: Helper to render a single group of cards ---
 * Generates the HTML for a heading and a card grid for a specific group of sources.
 * @param {string} title - The heading for the group (e.g., "People").
 * @param {any[]} sources - The array of source objects in this group.
 * @returns {string} The HTML string for this group.
 */
function _renderCardGroup(title, sources) {
  if (!sources || sources.length === 0) {
    return ''; // Don't render empty groups
  }

  let groupHtml = `<h3 class="source-group-heading">${title}</h3>`;
  groupHtml += `<div class="cards-grid">`;

  sources.forEach((source) => {
    // Prepare Image Thumbnail
    const imagePath = source.image_path
      ? escapeHTML(source.image_path)
      : '/images/contacts/default.png'; // Use default.png
    const imageThumbnailHTML = `<img src="${imagePath}" alt="" class="source-list-thumbnail">`;
    const fallbackIconHTML =
      '<span style="font-size: 1.5em; margin-right: 5px;">ℹ️</span>'; // Simple info icon as fallback
    const escapedName = escapeHTML(source.name);

    // --- MODIFIED: Added title attribute for tooltip ---
    const cardHTML = `
            <div class="source-card clickable-source" data-source-id="${source.id}" title="${escapedName}" style="cursor: pointer;">
                <div class="card-header">
                    ${source.image_path ? imageThumbnailHTML : fallbackIconHTML}
                    <h3 class="source-name" style="margin: 0;">${escapedName}</h3>
                    <small style="margin-left: auto;" class="source-type">(${escapeHTML(source.type)})</small>
                </div>
                <div class="card-body" style="font-size: 0.9em; min-height: 60px;">
                    <p style="margin: 0; color: var(--text-muted-color); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2;">
                        ${escapeHTML(source.description) || (source.contact_person ? `Contact: ${escapeHTML(source.contact_person)}` : 'Click to view details...')}
                    </p>
                </div>
            </div>
        `;
    // --- END MODIFICATION ---
    groupHtml += cardHTML;
  });

  groupHtml += `</div>`; // Close cards-grid
  return groupHtml;
}

/**
 * Renders the list of advice sources into a card grid.
 * @param {HTMLDivElement} panelElement - The panel element (#research-sources-panel).
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
function renderSourcesList(panelElement, sources) {
  // --- MODIFIED: This function now renders grouped grids directly into the panel ---

  if (!panelElement) {
    console.error('renderSourcesList: Could not find panelElement.');
    return;
  }

  panelElement.innerHTML = ''; // Clear previous content (e.g., "Loading...")

  const sortedSources = Array.isArray(sources)
    ? [...sources].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  if (sortedSources.length === 0) {
    panelElement.innerHTML =
      '<p>No advice sources defined yet for this account holder. Add sources via Settings -> Data Management -> Advice Sources.</p>';
    return;
  }

  // 1. Categorize sources
  const people = sortedSources.filter((s) => s.type === 'Person');
  const groups = sortedSources.filter((s) => s.type === 'Group');
  const books = sortedSources.filter((s) => s.type === 'Book');
  const websites = sortedSources.filter((s) => s.type === 'Website');
  // Group all remaining types into "Other"
  const otherTypes = ['Person', 'Group', 'Book', 'Website'];
  const others = sortedSources.filter((s) => !otherTypes.includes(s.type));

  // 2. Render each group
  let finalHtml = '';
  finalHtml += _renderCardGroup('People', people);
  finalHtml += _renderCardGroup('Groups', groups);
  finalHtml += _renderCardGroup('Books', books);
  finalHtml += _renderCardGroup('Websites', websites);
  finalHtml += _renderCardGroup('Other', others);

  // 3. Populate the panel
  panelElement.innerHTML = finalHtml;
  // --- END MODIFICATION ---
}

/**
 * --- (Private Helper) ---
 * Parses the combined notes field to separate Chart Type from notes.
 * @param {string | null} notes - The combined notes string.
 * @returns {{chartType: string, notes: string}}
 */
function parseTechniqueNotes(notes) {
  if (!notes) {
    return { chartType: '', notes: '' };
  }
  // Regex to find "Chart Type: [Type]\n\n[Notes]"
  const match = notes.match(/^Chart Type: (.*?)\n\n(.*)$/s);
  if (match) {
    return { chartType: match[1], notes: match[2] };
  }
  // Fallback if it only has Chart Type or only notes
  if (notes.startsWith('Chart Type: ')) {
    return { chartType: notes.replace('Chart Type: ', ''), notes: '' };
  }
  return { chartType: '', notes: notes };
}

/**
 * --- (Private Helper) ---
 * Prefills and shows the "Add Trade Idea" modal.
 * @param {string} sourceId
 * @param {string} sourceName
 * @param {string} [ticker='']
 * @param {string} [journalId]
 * @param {object} [defaults]
 */
function openAddTradeIdeaModal(
  sourceId,
  sourceName,
  ticker = '',
  journalId = '',
  defaults = {}
) {
  const addIdeaModal = document.getElementById('add-trade-idea-modal');
  const addIdeaForm = /** @type {HTMLFormElement} */ (
    document.getElementById('add-trade-idea-form')
  );

  if (!addIdeaModal || !addIdeaForm) {
    return showToast(
      'UI Error: Could not find the "Add Trade Idea" modal.',
      'error'
    );
  }

  addIdeaForm.reset();

  const safeSetInputValue = (id, value) => {
    const el = /** @type {HTMLInputElement} */ (
      addIdeaModal.querySelector(`#${id}`)
    );
    if (el) {
      el.value = value;
    } else {
      console.error(
        `openAddTradeIdeaModal: Element with ID "${id}" not found INSIDE modal.`
      );
    }
    return el;
  };

  safeSetInputValue('idea-form-source-id', sourceId);
  safeSetInputValue('idea-form-journal-id', journalId);

  const tickerInput = safeSetInputValue(
    'idea-form-ticker',
    ticker === 'N/A' ? '' : ticker
  );
  const isTickerReadOnly = !!ticker && ticker !== 'N/A';
  if (tickerInput) {
    tickerInput.readOnly = isTickerReadOnly;
  }

  const linkDisplaySpan = addIdeaModal.querySelector(
    '#idea-form-link-display span'
  );
  if (linkDisplaySpan) {
    linkDisplaySpan.textContent = `Source: "${sourceName}"${
      isTickerReadOnly ? ` | Ticker: ${ticker}` : ''
    }`;
  }

  safeSetInputValue('idea-form-date', getCurrentESTDateTimeLocalString());

  if (defaults) {
    // @ts-ignore
    safeSetInputValue('idea-form-rec-entry-low', defaults.entry || '');
    // @ts-ignore
    safeSetInputValue('idea-form-rec-tp1', defaults.tp1 || '');
    // @ts-ignore
    safeSetInputValue('idea-form-rec-tp2', defaults.tp2 || '');
    // @ts-ignore
    safeSetInputValue('idea-form-rec-stop-loss', defaults.sl || '');
  }

  addIdeaModal.classList.add('visible');

  if (!isTickerReadOnly) {
    if (tickerInput) tickerInput.focus();
  } else {
    const entryLowInput = addIdeaModal.querySelector(
      '#idea-form-rec-entry-low'
    );
    if (entryLowInput) {
      /** @type {HTMLInputElement} */ (entryLowInput).focus();
    }
  }
}

/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;
/** @type {EventListener | null} */
let currentModalActionHandler = null;
/** @type {boolean} */
let isAddTradeIdeaModalHandlerInitialized = false;
/** @type {boolean} */
let isAddTechniqueModalHandlerInitialized = false;

/**
 * Attaches event listeners specifically for actions *within* the source details modal content area.
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
  console.log('[Modal Actions] Initializing listeners for modal content area.');

  if (currentModalActionHandler) {
    modalContentArea.removeEventListener('click', currentModalActionHandler);
    console.log('[Modal Actions] Removed previous modal action handler.');
  }

  if (!isAddTradeIdeaModalHandlerInitialized) {
    initializeAddTradeIdeaModalHandler(refreshDetailsCallback);
    isAddTradeIdeaModalHandlerInitialized = true;
  }
  if (!isAddTechniqueModalHandlerInitialized) {
    initializeAddTechniqueModalHandler(refreshDetailsCallback);
    isAddTechniqueModalHandlerInitialized = true;
  }

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

    // --- This is the "Router" logic ---

    if (target.matches('#add-idea-from-source-btn')) {
      if (details.source.type === 'Person' || details.source.type === 'Group') {
        await handleCreateTradeIdeaFromSource(target);
      } else {
        await handleCreateTradeIdeaFromBook(target, details.journalEntries);
      }
    } else if (target.matches('.develop-trade-idea-btn')) {
      await handleCreateTradeIdeaFromTechnique(target, details.journalEntries);
    } else if (target.matches('#add-technique-btn')) {
      await handleOpenAddTechniqueModal(target);
    } else if (target.closest('.edit-journal-technique-btn')) {
      await handleOpenEditTechniqueModal(target, details.journalEntries);
    } else if (target.matches('.add-document-button')) {
      await handleAddDocumentSubmit(e, refreshDetailsCallback);
    } else if (target.matches('.add-source-note-button')) {
      await handleAddNoteSubmit(e, refreshDetailsCallback);
    } else if (target.closest('.delete-watchlist-item-button')) {
      console.log('[Modal Actions] Delegating to handleCloseWatchlistIdea');
      const itemId = target.dataset.itemId; // This button uses data-item-id
      const ticker =
        target.closest('tr')?.querySelector('td:first-child')?.textContent ||
        'this idea';
      if (itemId) {
        await handleCloseWatchlistIdea(itemId, ticker, refreshDetailsCallback);
      }
    } else if (
      target.closest(
        '.delete-document-button, .delete-source-note-button, .delete-journal-btn'
      )
    ) {
      console.log(
        '[Modal Actions] Delegating to handleDeleteClick (Notes/Docs/Journal)'
      );
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
      await handleCreateBuyOrderFromIdea(target, refreshDetailsCallback);
    } else if (target.closest('.create-paper-trade-btn')) {
      console.log(
        '[Modal Actions] Delegating to handleCreatePaperTradeFromIdea'
      );
      await handleCreatePaperTradeFromIdea(target);
    } else if (target.closest('.sell-from-lot-btn-source')) {
      await handleSellFromLotSource(target, details);
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
function initializeSourcesListClickListener(sourcesListContainer) {
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
        const refreshedDetails = await fetchSourceDetails(
          modalSourceId,
          modalHolderId
        );
        console.log(
          '[refreshDetails - inner] fetchSourceDetails returned:',
          refreshedDetails
        );

        modalContentArea.innerHTML =
          generateSourceDetailsHTML(refreshedDetails);
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

      const refreshOnSellHandler = () => {
        console.log(
          '[Grid Listener] Detected sourceDetailsShouldRefresh event, refreshing details...'
        );
        refreshDetails();
      };
      const refreshOnJournalHandler = () => {
        console.log(
          '[Grid Listener] Detected journalUpdated event, refreshing details...'
        );
        refreshDetails();
      };

      document.addEventListener(
        'sourceDetailsShouldRefresh',
        refreshOnSellHandler
      );
      document.addEventListener('journalUpdated', refreshOnJournalHandler);

      const cleanup = () => {
        document.removeEventListener(
          'sourceDetailsShouldRefresh',
          refreshOnSellHandler
        );
        document.removeEventListener('journalUpdated', refreshOnJournalHandler);

        const closeBtn = detailsModal?.querySelector('.close-button');
        const cancelBtn = detailsModal?.querySelector(
          '.cancel-btn.close-modal-btn'
        );
        if (closeBtn) closeBtn.removeEventListener('click', cleanup);
        if (cancelBtn) cancelBtn.removeEventListener('click', cleanup);
        if (detailsModal)
          detailsModal.removeEventListener('click', cleanupOnBgClick);
      };

      const cleanupOnBgClick = (e) => {
        if (e.target === detailsModal) cleanup();
      };

      const closeBtn = detailsModal.querySelector('.close-button');
      const cancelBtn = detailsModal.querySelector(
        '.cancel-btn.close-modal-btn'
      );

      if (closeBtn) closeBtn.addEventListener('click', cleanup, { once: true });
      if (cancelBtn)
        cancelBtn.addEventListener('click', cleanup, { once: true });
      detailsModal.addEventListener('click', cleanupOnBgClick);

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

        initializeModalActionHandlers(
          modalContentArea,
          details,
          refreshDetails
        );
      } catch (err) {
        const error = /** @type {Error} */ (err);
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

/**
 * Handles submission of the "Add Document Link" form.
 * @param {Event} e - The form submission event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
async function handleAddDocumentSubmit(e, refreshDetailsCallback) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (
    /** @type {HTMLElement} */ (e.target).closest('form')
  );
  if (!form) return;
  const addButton = /** @type {HTMLButtonElement | null} */ (
    form.querySelector('.add-document-button')
  );
  if (!addButton) return;

  const holderId = state.selectedAccountHolderId;
  const formSourceId = form.dataset.sourceId;
  const titleInput = /** @type {HTMLInputElement | null} */ (
    form.querySelector('.add-doc-title-input')
  );
  const typeInput = /** @type {HTMLInputElement | null} */ (
    form.querySelector('.add-doc-type-input')
  );
  const linkInput = /** @type {HTMLInputElement | null} */ (
    form.querySelector('.add-doc-link-input')
  );
  const descInput = /** @type {HTMLTextAreaElement | null} */ (
    form.querySelector('.add-doc-desc-input')
  );

  const link = linkInput?.value.trim();
  if (!link) {
    return showToast('External link is required.', 'error');
  }
  if (!formSourceId || holderId === 'all') {
    return showToast('Context missing or "All Accounts" selected.', 'error');
  }
  // Basic URL validation
  if (!link.startsWith('http://') && !link.startsWith('https://')) {
    console.warn(
      "Adding document link that doesn't start with http/https:",
      link
    );
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
    journal_entry_id: null, // Explicitly null
  };

  addButton.disabled = true;
  try {
    await addDocument(documentData);
    showToast('Document link added.', 'success');
    if (descInput) descInput.value = ''; // Clear textarea
    await refreshDetailsCallback();
  } catch (error) {
    // Assert error as Error type for message access
    const err = /** @type {Error} */ (error);
    showToast(`Error adding document: ${err.message}`, 'error');
  } finally {
    addButton.disabled = false;
  }
}

/**
 * Handles click on "Edit Technique" button from a Technique row.
 * Pre-fills and shows the "Add Technique" modal for editing.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques.
 * @returns {Promise<void>}
 */
async function handleOpenEditTechniqueModal(target, journalEntries) {
  const { journalId } = target.dataset;

  const entry = journalEntries.find((j) => String(j.id) === journalId);
  if (!entry) {
    return showToast('Error: Could not find technique data to edit.', 'error');
  }

  const modal = document.getElementById('add-technique-modal');
  const form = /** @type {HTMLFormElement} */ (
    document.getElementById('add-technique-form')
  );
  if (!modal || !form) {
    return showToast('Error: Could not find the edit modal.', 'error');
  }

  form.reset();

  // --- Parse notes back into separate fields ---
  const { chartType, notes } = parseTechniqueNotes(entry.notes);

  // --- Populate Modal ---
  /** @type {HTMLElement} */ (
    document.getElementById('add-technique-modal-title')
  ).textContent = `Edit Technique: ${entry.entry_reason.substring(0, 25)}...`;
  /** @type {HTMLButtonElement} */ (
    document.getElementById('add-technique-submit-btn')
  ).textContent = 'Save Changes';

  // --- Set hidden IDs ---
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-source-id')
  ).value = String(entry.advice_source_id);
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-entry-id')
  ).value = entry.id; // <-- The "Edit Mode" flag

  // --- Set All Form Fields ---
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-entry-reason')
  ).value = entry.entry_reason || '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-chart-type')
  ).value = chartType;
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-image-path')
  ).value = entry.image_path || '';
  /** @type {HTMLTextAreaElement} */ (
    document.getElementById('technique-form-notes')
  ).value = notes;
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-page-number')
  ).value = entry.page_number || '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-chapter')
  ).value = entry.chapter || '';

  // Set link display
  const linkDisplaySpan = document.querySelector(
    '#technique-form-link-display span'
  );
  if (linkDisplaySpan) {
    const sourceName = getSourceNameFromId(entry.advice_source_id);
    linkDisplaySpan.textContent = `Source: "${sourceName || 'Unknown'}"`;
  }

  modal.classList.add('visible');

  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-entry-reason')
  ).focus();
}

/**
 * Handles click on "Add Idea" from a specific Technique row.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques.
 * @returns {Promise<void>}
 */
async function handleCreateTradeIdeaFromTechnique(target, journalEntries) {
  // --- *** THIS IS THE FIX (Item #4) *** ---
  // We only get the journalId and ticker. We ignore the technique's
  // entry, tp, and sl values.
  const { journalId, ticker } = target.dataset;
  // --- *** END FIX *** ---

  const technique = journalEntries.find((j) => String(j.id) === journalId);
  if (!technique || !technique.advice_source_id) {
    return showToast(
      'Error: Could not find linked source for this technique.',
      'error'
    );
  }

  const sourceName = getSourceNameFromId(technique.advice_source_id);
  if (!sourceName) {
    return showToast('Error: Could not find source data.', 'error');
  }

  // --- *** THIS IS THE FIX (Item #4) ---
  // Pass an empty object so the form is blank, as requested.
  const defaults = {};
  // --- *** END FIX ---

  openAddTradeIdeaModal(
    String(technique.advice_source_id),
    sourceName,
    ticker,
    journalId,
    defaults
  );
}

/**
 * Handles the submission of the "Add New Note" form.
 * @param {Event} e - The submit event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
async function handleAddNoteSubmit(e, refreshDetailsCallback) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (
    /** @type {HTMLElement} */ (e.target).closest('form')
  );
  if (!form) return;
  const addButton = /** @type {HTMLButtonElement | null} */ (
    form.querySelector('.add-source-note-button')
  );
  if (!addButton) return;

  const holderId = state.selectedAccountHolderId;
  const formSourceId = form.dataset.sourceId;
  const textarea = /** @type {HTMLTextAreaElement | null} */ (
    form.querySelector('.add-note-content-textarea')
  );
  const content = textarea?.value.trim();

  if (!formSourceId || !content) {
    return showToast('Note content cannot be empty.', 'error');
  }

  if (holderId === 'all') {
    return showToast('Context missing or "All Accounts" selected.', 'error');
  }

  addButton.disabled = true;

  try {
    await addSourceNote(formSourceId, holderId, content);
    showToast('Note added!', 'success');
    if (textarea) textarea.value = ''; // Clear textarea
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
async function handleNoteEditActions(
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

  if (target.matches('.edit-source-note-button')) {
    displayDiv.style.display = 'none';
    editDiv.style.display = 'block';
    editTextArea.focus();
    editTextArea.value = displayDiv.textContent || '';
  } else if (target.matches('.cancel-edit-note-button')) {
    displayDiv.style.display = 'block';
    editDiv.style.display = 'none';
  } else if (target.matches('.save-edit-note-button')) {
    const newContent = editTextArea.value.trim();
    if (!newContent) {
      return showToast('Note content cannot be empty.', 'error');
    }

    /** @type {HTMLButtonElement} */ (target).disabled = true;
    try {
      await updateSourceNote(modalSourceId, noteId, modalHolderId, newContent);
      showToast('Note updated!', 'success');
      displayDiv.innerHTML = newContent.replace(/\n/g, '<br>');
      displayDiv.style.display = 'block';
      editDiv.style.display = 'none';
      await refreshDetailsCallback();
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
async function handleDeleteClick(
  target,
  modalSourceId,
  modalHolderId,
  refreshDetailsCallback
) {
  const itemId =
    /** @type {HTMLElement} */ (target).dataset.id ||
    /** @type {HTMLElement} */ (target).dataset.docId ||
    /** @type {HTMLElement} */ (target).dataset.noteId ||
    /** @type {HTMLElement} */ (target).dataset.itemId ||
    /** @type {HTMLElement} */ (target).dataset.journalId;

  if (!itemId) return;

  // --- Case 1: Delete "Technique" (Journal Entry) ---
  if (target.matches('.delete-journal-btn')) {
    const ticker =
      target.closest('tr')?.querySelector('td:nth-child(3)')?.textContent ||
      'this technique';
    showConfirmationModal(
      `Archive ${ticker} Technique?`,
      'Are you sure you want to archive this technique? This will close it.',
      async () => {
        try {
          await deleteJournalEntry(itemId);
          showToast(`Technique archived.`, 'success');
          await refreshDetailsCallback();
        } catch (error) {
          // @ts-ignore
          showToast(`Error: ${error.message}`, 'error');
        }
      }
    );
  }

  // --- Case 2: Delete Linked Document ---
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

  // --- Case 3: Delete Source Note ---
  else if (target.matches('.delete-source-note-button')) {
    showConfirmationModal(
      'Delete Note?',
      'Are you sure you want to permanently delete this note?',
      async () => {
        try {
          await deleteSourceNote(modalSourceId, itemId, modalHolderId);
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

/**
 * Handles a click on the "Sell" button from a real trade row in the source modal.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {object} details - The full details object from the modal.
 * @returns {Promise<void>}
 */
async function handleSellFromLotSource(target, details) {
  console.log(
    '[Modal Actions] Delegating to handleSellFromLotSource (Real Trades)'
  );
  const sellBtn = target.closest('.sell-from-lot-btn-source');
  if (!sellBtn) return;

  const buyId = sellBtn.dataset.buyId;
  if (!buyId) {
    return showToast('Error: Missing Lot ID on sell button.', 'error');
  }

  const lotData = details.linkedTransactions.find(
    (lot) => String(lot.id) === buyId
  );

  if (lotData) {
    // This function lives in _modal_sell_from_position.js and opens the modal
    populateSellFromPositionModal(lotData);
  } else {
    console.error(`[Modal Actions] Could not find lot data for ID ${buyId}`);
    showToast('Error: Could not find lot data to sell.', 'error');
  }
}

/**
 * Handles click on "Add Trade Idea" from a Person/Group source.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
async function handleCreateTradeIdeaFromSource(target) {
  const { sourceId, sourceName } = target.dataset;

  if (!sourceId || !sourceName) {
    return showToast('Error: Missing data from source button.', 'error');
  }

  openAddTradeIdeaModal(sourceId, sourceName);
}

/**
 * Handles click on "Add Trade Idea" from a Book/Website/etc. source.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques to choose from.
 * @returns {Promise<void>}
 */
async function handleCreateTradeIdeaFromBook(target, journalEntries) {
  const { sourceId, sourceName } = target.dataset;
  if (!sourceId || !sourceName) {
    return showToast('Error: Missing data from source button.', 'error');
  }

  const openTechniques = journalEntries.filter(
    (j) => j.status === 'OPEN' && j.quantity === 0
  );
  if (openTechniques.length === 0) {
    return showToast(
      'Please add a "Technique" first, then you can develop an idea from it.',
      'info',
      5000
    );
  }

  if (openTechniques.length === 1) {
    const technique = openTechniques[0];
    const defaults = {
      // entry: technique.entry_price, // Per user request, do not pre-fill
      // tp1: technique.target_price,
      // tp2: technique.target_price_2,
      // sl: technique.stop_loss_price,
    };
    openAddTradeIdeaModal(
      sourceId,
      sourceName,
      technique.ticker,
      String(technique.id),
      defaults
    );
  } else {
    showToast(
      'Opening blank idea. Or, click "Add Idea" on a specific technique row below.',
      'info',
      5000
    );
    openAddTradeIdeaModal(sourceId, sourceName);
  }
}

/**
 * Renders the "Linked Real Trades" (Open) table.
 * @param {any[]} openRealTrades - Array of open transaction objects.
 * @returns {string} HTML string.
 */
function _renderModalRealTrades_Open(openRealTrades) {
  let html = `<h4 style="margin-top: 1rem;">Linked Real Trades (Open) (${openRealTrades.length})</h4>`;
  if (openRealTrades.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> <th>Ticker</th> <th class="numeric">Entry $</th> <th class="numeric">Rem. Qty</th> <th class="numeric">Current $</th> <th class="numeric">Unrealized P/L</th>
                    <th>Source</th>
                    <th class="center-align actions-cell">Actions</th>
                </tr>
            </thead><tbody>`;
    openRealTrades.forEach((entry) => {
      const pnl = entry.unrealized_pnl;
      const pnlClass =
        pnl !== null && pnl !== undefined
          ? pnl >= 0
            ? 'positive'
            : 'negative'
          : '';
      const pnlDisplay =
        pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
      const currentPriceDisplay = entry.current_price
        ? formatAccounting(entry.current_price)
        : '--';

      // --- Use advice_source_name from the backend ---
      const sourceDisplay = entry.advice_source_name
        ? escapeHTML(entry.advice_source_name)
        : escapeHTML(entry.source) || '';
      // --- END ---

      html += `
                <tr>
                    <td>${escapeHTML(entry.transaction_date) || 'N/A'}</td>
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td>
                    <td class="numeric">${formatAccounting(entry.price)}</td>
                    <td class="numeric">${formatQuantity(
                      entry.quantity_remaining
                    )}</td>
                    <td class="numeric">${currentPriceDisplay}</td>
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td>
                    <td>${sourceDisplay}</td>
                    <td class="center-align actions-cell">
                        <button class="sell-from-lot-btn-source"
                            data-buy-id="${entry.id}"
                            data-ticker="${escapeHTML(entry.ticker)}"
                            data-exchange="${escapeHTML(entry.exchange)}"
                            data-quantity="${entry.quantity_remaining}"
                            title="Sell from this lot">Sell</button>
                    </td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No open real-money trades linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Linked Real Trades" (History) table.
 * @param {any[]} closedRealTrades - Array of SELL transaction objects.
 * @returns {string} HTML string.
 */
function _renderModalRealTrades_Closed(closedRealTrades) {
  let html = `<h4 style="margin-top: 1rem;">Linked Real Trades (History) (${closedRealTrades.length})</h4>`;
  if (closedRealTrades.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> <th>Ticker</th> <th>Type</th> <th class="numeric">Price</th> <th class="numeric">Qty</th> <th class="numeric">Realized P/L</th> <th>Source</th> <th>Status</th>
                </tr>
            </thead><tbody>`;

    closedRealTrades.forEach((entry) => {
      let pnl = entry.realized_pnl; // This comes from the backend calculation
      let statusDisplay = 'SELL';

      const pnlClass =
        pnl !== null && pnl !== undefined
          ? pnl >= 0
            ? 'positive'
            : 'negative'
          : '';
      const pnlDisplay =
        pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';

      // --- Use advice_source_name from the backend ---
      const sourceDisplay = entry.advice_source_name
        ? escapeHTML(entry.advice_source_name)
        : escapeHTML(entry.source) || '';
      // --- END ---

      html += `
                <tr class="text-muted">
                    <td>${escapeHTML(entry.transaction_date) || 'N/A'}</td>
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td>
                    <td>${statusDisplay}</td>
                    <td class="numeric">${formatAccounting(entry.price)}</td>
                    <td class="numeric">${formatQuantity(entry.quantity)}</td>
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td>
                    <td>${sourceDisplay}</td>
                    <td>Sold</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No closed or sold real-money trades linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the Profile (top-left) section of the modal.
 * @param {object} source - The advice source data.
 * @returns {string} HTML string.
 */
function _renderModalProfile(source) {
  let html = '<div class="source-profile-section">';
  html += `<h4>Profile</h4>`;

  const imagePath = source.image_path
    ? escapeHTML(source.image_path)
    : '/images/contacts/default.png';

  html += `<img src="${imagePath}" alt="${escapeHTML(
    source.name
  )}" class="profile-image" style="max-width: 150px; margin-bottom: 1rem;">`;

  html += `<p><strong>Name:</strong> ${escapeHTML(source.name)}</p>`;
  html += `<p><strong>Type:</strong> ${escapeHTML(source.type)}</p>`;
  html += `<p><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;

  if (source.url)
    html += `<p><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;

  if (source.type === 'Person') {
    html += `<h5 style="margin-top: 1rem;">Contact Info</h5>`;
    if (source.details?.contact_email)
      html += `<p><strong>Email:</strong> ${escapeHTML(source.details.contact_email)}</p>`;
    if (source.details?.contact_phone)
      html += `<p><strong>Phone:</strong> ${escapeHTML(source.details.contact_phone)}</p>`;
  } else if (source.type === 'Group') {
    html += `<h5 style="margin-top: 1rem;">Contact Info</h5>`;
    if (source.details?.contact_person)
      html += `<p><strong>Primary Contact:</strong> ${escapeHTML(source.details.contact_person)}</p>`;
    if (source.details?.contact_email)
      html += `<p><strong>Email:</strong> ${escapeHTML(source.details.contact_email)}</p>`;
    if (source.details?.contact_phone)
      html += `<p><strong>Phone:</strong> ${escapeHTML(source.details.contact_phone)}</p>`;
  }

  if (source.type === 'Person' || source.type === 'Group') {
    let appIconHTML = '';
    const appType = source.details?.contact_app_type?.toLowerCase();
    const appHandle = escapeHTML(source.details?.contact_app_handle);
    if (appType === 'signal') {
      appIconHTML = `<img src="/images/logos/signal.png" alt="Signal" class="contact-app-icon"> `;
    } else if (appType === 'whatsapp') {
      appIconHTML = `<img src="/images/logos/whatsapp.jpeg" alt="WhatsApp" class="contact-app-icon"> `;
    }
    if (source.details?.contact_app_type) {
      html += `<p><strong>App:</strong> ${appIconHTML}${escapeHTML(source.details.contact_app_type)}: ${appHandle || 'N/A'}</p>`;
    }
  }

  if (source.type === 'Book') {
    if (source.details?.websites && source.details.websites.length > 0) {
      html += `<h5 style="margin-top: 1rem;">Websites</h5>`;
      html += source.details.websites
        .map(
          (link) =>
            `<p><a href="${escapeHTML(link)}" target="_blank">${escapeHTML(link)}</a></p>`
        )
        .join('');
    }
    if (source.details?.pdfs && source.details.pdfs.length > 0) {
      html += `<h5 style="margin-top: 1rem;">Documents</h5>`;
      html += source.details.pdfs
        .map(
          (link) =>
            `<p><a href="${escapeHTML(link)}" target="_blank">${escapeHTML(link)}</a></p>`
        )
        .join('');
    }
  }

  html += '</div>';
  return html;
}

/**
 * Renders the top-right "Actions" panel, with conditional buttons based on source type.
 * @param {object} source - The advice source data.
 * @returns {string} HTML string.
 */
function _renderModalActionsPanel(source) {
  let html = `<div class="add-ticker-section">`;

  const sourceId = source.id;
  const sourceName = escapeHTML(source.name);

  if (source.type === 'Person' || source.type === 'Group') {
    // For Person/Group, show "Add Trade Idea"
    html += `
            <button id="add-idea-from-source-btn" data-source-id="${sourceId}" data-source-name="${sourceName}" style="width: 100%;">
                Add Trade Idea
            </button>
        `;
  } else {
    // For Book/Website/Other, show "Add Technique"
    html += `
            <button id="add-technique-btn" data-source-id="${sourceId}" data-source-name="${sourceName}" style="width: 100%;">
                Add Technique
            </button>
        `;
  }

  html += '</div>';
  return html;
}

/**
 * Renders the Summary Stats panel.
 * @param {object} stats - The summary stats object.
 * @returns {string} HTML string.
 */
function _renderModalSummaryStats(stats) {
  let html = `<div class="source-profile-section">`;
  html += `<h4 style="margin-top: 0; margin-bottom: 1rem;">Summary</h4>`;

  html += `<p style="margin: 0.4rem 0;"><strong>Total Ideas:</strong> ${stats.totalTrades}</p>`;
  html += `<p style="margin: 0.4rem 0;"><strong>Investment (Open):</strong> ${formatAccounting(stats.totalInvestment)}</p>`;
  html += `<p style="margin: 0.4rem 0;"><strong>Unrealized P/L (Open):</strong> <span class="${stats.totalUnrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalUnrealizedPL)}</span></p>`;
  html += `<p style="margin: 0.4rem 0;"><strong>Realized P/L (Closed):</strong> <span class="${stats.totalRealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalRealizedPL)}</span></p>`;
  html += `</div>`;
  return html;
}

/**
 * Renders the "Trade Ideas" (Watchlist) table.
 * @param {any[]} watchlistItems - Array of watchlist items.
 * @param {Set<string>} linkedTxTickers - Set of tickers linked to real trades.
 * @param {Set<string>} paperTradeTickers - Set of tickers linked to paper trades.
 * @param {object} source - The parent advice source.
 * @param {any[]} journalEntries - All journal entries (needed to link techniques).
 * @returns {string} HTML string.
 */
function _renderModalTradeIdeas(
  watchlistItems,
  linkedTxTickers,
  paperTradeTickers,
  source,
  journalEntries
) {
  let html = `<h4 style="margin-top: 1rem;">Trade Ideas (${watchlistItems.length})</h4>`;
  if (watchlistItems.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="recommended-trades-table mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr> 
                    <th>Ticker</th> 
                    <th>From Technique</th>
                    <th class="numeric">Entry Range</th> 
                    <th class="numeric">Current $</th> 
                    <th class="numeric" title="Distance to Entry: Percentage difference between the current price and the recommended entry range.">Dist. to Entry</th> 
                    <th class="numeric">Guidelines (SL/TP1/TP2)</th> 
                    <th class="center-align">Actions</th> 
                </tr>
            </thead><tbody>`;
    watchlistItems.forEach((item) => {
      const currentPriceData = state.priceCache.get(item.ticker);
      const currentPrice =
        currentPriceData && typeof currentPriceData.price === 'number'
          ? currentPriceData.price
          : null;
      let entryRange = '--';
      if (item.rec_entry_low !== null && item.rec_entry_high !== null) {
        entryRange = `${formatAccounting(item.rec_entry_low, false)} - ${formatAccounting(item.rec_entry_high, false)}`;
      } else if (item.rec_entry_low !== null) {
        entryRange = `${formatAccounting(item.rec_entry_low, false)}+`;
      } else if (item.rec_entry_high !== null) {
        entryRange = `Up to ${formatAccounting(item.rec_entry_high, false)}`;
      }
      let distance = '--';
      let distClass = '';
      if (currentPrice !== null && item.rec_entry_low !== null) {
        const distPercent =
          ((currentPrice - item.rec_entry_low) / item.rec_entry_low) * 100;
        distClass = distPercent >= 0 ? 'positive' : 'negative';
        if (
          item.rec_entry_high !== null &&
          currentPrice <= item.rec_entry_high
        ) {
          distClass = 'positive';
          distance = `In Range (${distPercent.toFixed(1)}%)`;
        } else {
          distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`;
        }
      } else if (currentPrice !== null && item.rec_entry_high !== null) {
        const distPercent =
          ((currentPrice - item.rec_entry_high) / item.rec_entry_high) * 100;
        distClass = distPercent > 0 ? 'negative' : 'positive';
        distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`;
      }

      const recLimits =
        [
          item.rec_stop_loss
            ? `SL: ${formatAccounting(item.rec_stop_loss)}`
            : null,
          item.rec_tp1 ? `TP1: ${formatAccounting(item.rec_tp1)}` : null,
          item.rec_tp2 ? `TP2: ${formatAccounting(item.rec_tp2)}` : null,
        ]
          .filter(Boolean)
          .join(' / ') || '--';

      const isLinkedToRealTrade = !!item.linked_trade_id;
      const isLinkedToPaperTrade = paperTradeTickers.has(item.ticker);

      const technique = item.journal_entry_id
        ? journalEntries.find((j) => j.id === item.journal_entry_id)
        : null;
      const techniqueName = technique
        ? escapeHTML(technique.entry_reason)
        : '--';

      let buyOrLiveHTML = '';
      let paperOrPaperMarkerHTML = '';

      if (isLinkedToRealTrade) {
        buyOrLiveHTML =
          '<span class="marker-live" title="This idea is linked to a live trade.">✔ Live</span>';
      } else {
        buyOrLiveHTML = `
                    <button class="create-buy-order-btn" 
                        data-ticker="${escapeHTML(item.ticker)}" 
                        data-price=""
                        data-tp1="${item.rec_tp1 || ''}"
                        data-tp2="${item.rec_tp2 || ''}"
                        data-sl="${item.rec_stop_loss || ''}"
                        data-source-id="${source.id}" 
                        data-source-name="${escapeHTML(source.name)}"
                        data-journal-id="${item.journal_entry_id || ''}"
                        data-item-id="${item.id}"
                        title="Create Buy Order from this Idea">Buy</button>
                `;
      }

      if (isLinkedToPaperTrade) {
        paperOrPaperMarkerHTML =
          ' <span class="marker-paper" title="This idea is linked to a paper trade.">✔ Paper</span>';
      } else {
        paperOrPaperMarkerHTML = `
                    <button class="create-paper-trade-btn" 
                        data-ticker="${escapeHTML(item.ticker)}" 
                        data-entry-low="${item.rec_entry_low || ''}"
                        data-entry-high="${item.rec_entry_high || ''}"
                        data-tp1="${item.rec_tp1 || ''}"
                        data-tp2="${item.rec_tp2 || ''}"
                        data-sl="${item.rec_stop_loss || ''}"
                        data-source-id="${source.id}" 
                        data-source-name="${escapeHTML(source.name)}" 
                        title="Add to Paper Trades">Paper</button>
                `;
      }

      const deleteButtonHTML = `<button class="delete-watchlist-item-button delete-btn" data-item-id="${item.id}" title="Close/Archive Idea">X</button>`;
      const actionButtonsHTML =
        buyOrLiveHTML + paperOrPaperMarkerHTML + deleteButtonHTML;

      html += `
                <tr> 
                    <td>${escapeHTML(item.ticker)}</td> 
                    <td style="white-space: normal; min-width: 150px;">${techniqueName}</td>
                    <td class="numeric">${entryRange}</td> 
                    <td class_numeric">${currentPrice ? formatAccounting(currentPrice) : '--'}</td> 
                    <td class="numeric ${distClass}">${distance}</td> 
                    <td class="numeric">${recLimits}</td>
                    <td class="center-align actions-cell">
                        ${actionButtonsHTML}
                    </td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No trade ideas linked.</p>`;
  }
  return html;
}

/**
 * Renders the "Techniques / Methods" (Open) table.
 * @param {any[]} journalEntries - Array of *pre-filtered* journal entries (qty 0, status OPEN).
 * @returns {string} HTML string.
 */
function _renderModalTechniques_Open(journalEntries) {
  let html = '';
  const paperTradeTitle = 'Techniques / Methods'; // Hardcoded title

  html += `<h4 style="margin-top: 1rem;">${paperTradeTitle} (${journalEntries.length})</h4>`;
  if (journalEntries.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="center-align">Chart</th>
                    <th>Chart Type / Notes</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;
    journalEntries.forEach((entry) => {
      let chartThumbnail = '--';
      if (entry.image_path) {
        chartThumbnail = `<img src="${escapeHTML(entry.image_path)}" alt="Technique Chart" class="technique-image-thumbnail">`;
      }

      let notesDisplay = escapeHTML(entry.notes) || '--';
      if (notesDisplay.startsWith('Chart Type:')) {
        const match = notesDisplay.match(/^Chart Type: (.*?)\n\n(.*)$/s);
        if (match) {
          notesDisplay = `<strong>${match[1]}</strong><br>${match[2].replace(/\n/g, '<br>')}`;
        } else {
          notesDisplay = notesDisplay.replace(/\n/g, '<br>');
        }
      } else {
        notesDisplay = notesDisplay.replace(/\n/g, '<br>');
      }

      const actionButtons = `
                <button class="develop-trade-idea-btn" data-journal-id="${entry.id}" data-ticker="${escapeHTML(entry.ticker)}" data-entry="${entry.entry_price}" data-tp1="${entry.target_price || ''}" data-tp2="${entry.target_price_2 || ''}" data-sl="${entry.stop_loss_price || ''}" title="Develop Trade Idea from this Technique">Add Idea</button>
                <button class="edit-journal-technique-btn" data-journal-id="${entry.id}" title="Edit Technique">Edit</button>
                <button class="delete-journal-btn delete-btn" data-journal-id="${entry.id}" title="Archive Technique">X</button>
            `;

      html += `
                <tr>
                    <td style="white-space: normal; min-width: 150px;">${escapeHTML(entry.entry_reason) || '--'}</td>
                    <td class="center-align">${chartThumbnail}</td> 
                    <td style="white-space: normal; min-width: 200px;">${notesDisplay}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No ${paperTradeTitle.toLowerCase()} are being tracked for this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Completed Techniques" (Closed) table.
 * @param {any[]} journalEntries - Array of *pre-filtered* journal entries (qty 0, status != OPEN).
 * @returns {string} HTML string.
 */
function _renderModalTechniques_Closed(journalEntries) {
  let html = `<h4 style="margin-top: 1rem;">Completed Techniques (${journalEntries.length})</h4>`;
  if (journalEntries.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Exit Date</th> 
                    <th class="center-align">Chart</th>
                    <th>Chart Type / Notes</th>
                    <th>Status</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;
    journalEntries.forEach((entry) => {
      const statusDisplay =
        entry.status === 'EXECUTED' && entry.linked_trade_id
          ? `Executed (Tx #${entry.linked_trade_id})`
          : escapeHTML(entry.status);

      let chartThumbnail = '--';
      if (entry.image_path) {
        chartThumbnail = `<img src="${escapeHTML(entry.image_path)}" alt="Technique Chart" class="technique-image-thumbnail">`;
      }

      let notesDisplay = escapeHTML(entry.notes) || '--';
      if (notesDisplay.startsWith('Chart Type:')) {
        const match = notesDisplay.match(/^Chart Type: (.*?)\n\n(.*)$/s);
        if (match) {
          notesDisplay = `<strong>${match[1]}</strong><br>${match[2].replace(/\n/g, '<br>')}`;
        } else {
          notesDisplay = notesDisplay.replace(/\n/g, '<br>');
        }
      } else {
        notesDisplay = notesDisplay.replace(/\n/g, '<br>');
      }

      const actionButtons = `
                <button class="edit-journal-technique-btn" data-journal-id="${entry.id}" title="Edit Technique">Edit</button>
                <button class="delete-journal-btn delete-btn" data-journal-id="${entry.id}" title="Archive Technique">X</button>
            `;

      html += `
                <tr class="text-muted">
                    <td style="white-space: normal; min-width: 150px;">${escapeHTML(entry.entry_reason) || '--'}</td>
                    <td>${escapeHTML(entry.exit_date) || '--'}</td> 
                    <td class="center-align">${chartThumbnail}</td> 
                    <td style="white-space: normal; min-width: 200px;">${notesDisplay}</td>
                    <td>${statusDisplay}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No completed techniques linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Linked Documents" section and its "Add" form.
 * @param {any[]} documents - Array of document objects.
 * @param {object} source - The parent advice source.
 * @returns {string} HTML string.
 */
function _renderModalDocuments(documents, source) {
  let html = `<h4 style="margin-top: 1rem;">Linked Documents (${documents.length})</h4>`;
  if (documents.length > 0) {
    html += `<ul class="linked-items-list">`;
    documents.forEach((doc) => {
      const titleDisplay = escapeHTML(doc.title) || 'Untitled Document';
      const typeDisplay = doc.document_type
        ? `(${escapeHTML(doc.document_type)})`
        : '';
      const descDisplay = doc.description
        ? `- ${escapeHTML(doc.description)}`
        : '';
      html += `<li style="display: flex; justify-content: space-between; align-items: center;"> <span><a href="${escapeHTML(doc.external_link)}" target="_blank">${titleDisplay}</a> ${typeDisplay} ${descDisplay}</span> <button class="delete-document-button delete-btn" data-doc-id="${doc.id}" title="Delete Document Link" style="padding: 2px 5px; font-size: 0.8em;">X</button> </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>No documents linked.</p>`;
  }
  html += `<form class="add-document-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Document Link</h5> <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"> <input type="text" class="add-doc-title-input" placeholder="Title (Optional)" style="grid-column: span 2;"> <input type="text" class="add-doc-type-input" placeholder="Type (e.g., Chart)"> <input type="url" class="add-doc-link-input" placeholder="External Link (http://...)" required> <textarea class="add-doc-desc-input" placeholder="Description (Optional)" rows="2" style="grid-column: span 2;"></textarea> <button type="submit" class="add-document-button" style="grid-column: 2 / 3; justify-self: end;">Add Link</button> </div> </form>`;
  return html;
}

/**
 * Renders the "Source Notes" section and its "Add" form.
 * @param {any[]} sourceNotes - Array of note objects.
 * @param {object} source - The parent advice source.
 * @returns {string} HTML string.
 */
function _renderModalNotes(sourceNotes, source) {
  let html = `<h4 style="margin-top: 1rem;">Notes (${sourceNotes.length})</h4>`;
  if (sourceNotes.length > 0) {
    html += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
    const sortedNotes = [...sourceNotes].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    sortedNotes.forEach((note) => {
      const escapedNoteContent = escapeHTML(note.note_content);
      const createdDateStr = new Date(note.created_at).toLocaleString();
      const updatedDateStr = new Date(note.updated_at).toLocaleString();
      const editedMarker =
        note.updated_at > note.created_at ? ` (edited ${updatedDateStr})` : '';
      html += `<li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--container-border);" data-note-id="${note.id}"> <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;"> <small><i>${createdDateStr}${editedMarker}</i></small> <div class="note-actions"> <button class="edit-source-note-button" title="Edit Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">Edit</button> <button class="delete-source-note-button delete-btn" data-note-id="${note.id}" title="Delete Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">X</button> </div> </div> <div class="note-content-display">${escapedNoteContent.replace(/\n/g, '<br>')}</div> <div class="note-content-edit" style="display: none;"> <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box;">${escapedNoteContent}</textarea> <div style="text-align: right; margin-top: 5px;"> <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button> <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button> </div> </div> </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>No notes added.</p>`;
  }
  html += `<form class="add-source-note-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Note</h5> <textarea class="add-note-content-textarea" placeholder="Enter your note..." required rows="3" style="width: 100%; box-sizing: border-box; margin-bottom: 5px;"></textarea> <div style="text-align: right;"> <button type="submit" class="add-source-note-button">Add Note</button> </div> </form>`;
  return html;
}

/**
 * Generates the complete HTML content for the Source Details modal.
 * @param {object} details - The aggregated data from the API.
 * @returns {string} The full HTML string for the modal's content.
 */
export export function generateSourceDetailsHTML(details) {
  // Destructure all the data we need
  const {
    source,
    summaryStats,
    watchlistItems,
    linkedTransactions,
    journalEntries,
    documents,
    sourceNotes,
  } = details;

  // --- Create sets for efficient lookups ---
  // Tickers from open 'BUY' transactions
  const linkedTxTickers = new Set(
    linkedTransactions
      .filter(
        (tx) => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001
      )
      .map((tx) => tx.ticker)
  );

  const techniques = journalEntries.filter(
    (j) => !j.quantity || j.quantity === 0
  );

  const paperTradeTickers = new Set();

  // --- Render all partials ---
  const profileHtml = _renderModalProfile(source);
  const actionsHtml = _renderModalActionsPanel(source);
  const summaryHtml = _renderModalSummaryStats(summaryStats);

  // 1. Techniques (Book/Website only)
  let techniquesHtml = '';
  if (source.type === 'Book' || source.type === 'Website') {
    const openTechniques = techniques.filter((t) => t.status === 'OPEN');
    const closedTechniques = techniques.filter(
      (t) => t.status !== 'OPEN' // e.g., 'CLOSED', 'CANCELLED'
    );
    techniquesHtml =
      _renderModalTechniques_Open(openTechniques) +
      _renderModalTechniques_Closed(closedTechniques);
  }

  // 2. Trade Ideas (All source types)
  const tradeIdeasHtml = _renderModalTradeIdeas(
    watchlistItems,
    linkedTxTickers,
    paperTradeTickers,
    source,
    journalEntries // Pass *all* journal entries so ideas can find their technique
  );

  // 4. Real Trades (All source types)
  const openRealTrades = linkedTransactions.filter(
    (tx) => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001
  );
  const closedRealTrades = linkedTransactions.filter(
    (tx) => tx.transaction_type === 'SELL'
  );

  const realOpenHtml = _renderModalRealTrades_Open(openRealTrades);
  const realClosedHtml = _renderModalRealTrades_Closed(closedRealTrades);

  // 5. Documents and Notes (All source types)
  const documentsHtml = _renderModalDocuments(documents, source);
  const notesHtml = _renderModalNotes(sourceNotes, source);

  return `
        <div class="modal-grid">
            <div class="modal-grid-left">
                ${profileHtml}
            </div>
            <div class="modal-grid-right">
                ${actionsHtml}
                ${summaryHtml}
            </div>
        </div>

        <div class="modal-section">
            ${techniquesHtml}
        </div>
        
        <div class="modal-section">
            ${tradeIdeasHtml}
        </div>
        
        <div class="modal-section">
            ${realOpenHtml}
        </div>
        
        <hr style="margin: 2rem 0 1rem 0;">

        <div class="modal-section">
            ${realClosedHtml}
        </div>
        
        <div class="modal-grid-bottom">
            <div class="modal-grid-left">
                ${documentsHtml}
            </div>
            <div class="modal-grid-right">
                ${notesHtml}
            </div>
        </div>
    `;
}

/**
 * Handles click on "Buy" button from a Trade Idea row.
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function handleCreateBuyOrderFromIdea(target, refreshDetailsCallback) {
  // --- *** THIS IS THE FIX (Part 2) ---
  // Destructure the new journalId
  const {
    ticker,
    entryLow,
    entryHigh,
    tp1,
    tp2,
    sl,
    sourceId,
    sourceName,
    journalId,
    itemId, // <-- Add itemId to get the watchlist item ID
  } = target.dataset;

  const prefillData = {
    sourceId: sourceId,
    sourceName: sourceName,
    ticker: ticker,
    price: entryHigh || entryLow || '',
    tp1: tp1 || null,
    tp2: tp2 || null,
    sl: sl || null,
    journalId: journalId || null, // <-- Add the journalId here
    watchlistItemId: itemId, // <-- Pass the watchlist item ID
  };
  // --- *** END FIX ---

  updateState({ prefillOrderFromSource: prefillData });
  // await switchView('orders'); // Removed as per refactor plan

  const detailsModal = document.getElementById('source-details-modal');
  if (detailsModal) {
    detailsModal.classList.remove('visible');
  }

  showToast(`Prefilling "Log Trade" form for ${ticker}...`, 'info');
  await refreshDetailsCallback(); // Refresh the source details modal
}

/**
 * Handles click on "Paper" button from a Trade Idea row.
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function handleCreatePaperTradeFromIdea(target) {
  const { ticker, entryLow, entryHigh, tp1, tp2, sl, sourceId } =
    target.dataset;
  if (!ticker) {
    return showToast('Error: Ticker not found.', 'error');
  }

  const addJournalModal = document.getElementById('add-paper-trade-modal');
  const addJournalForm = /** @type {HTMLFormElement} */ (
    document.getElementById('add-journal-entry-form')
  );
  if (!addJournalModal || !addJournalForm) {
    return showToast('Error: Could not find paper trade modal.', 'error');
  }

  addJournalForm.reset();

  /** @type {HTMLElement} */ (
    document.getElementById('add-paper-trade-modal-title')
  ).textContent = `Convert Idea to Paper Trade: ${ticker}`;
  /** @type {HTMLButtonElement} */ (
    document.getElementById('add-journal-entry-btn')
  ).textContent = 'Add Paper Trade';
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-form-entry-id')
  ).value = '';

  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-entry-date')
  ).value = getCurrentESTDateString();
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-ticker')
  ).value = ticker;

  const quantityInput = /** @type {HTMLInputElement} */ (
    document.getElementById('journal-quantity')
  );
  quantityInput.value = '';
  quantityInput.placeholder = '0';

  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-entry-price')
  ).value = entryLow || entryHigh || '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-target-price')
  ).value = tp1 || '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-target-price-2')
  ).value = tp2 || '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-stop-loss-price')
  ).value = sl || '';
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-entry-reason')
  ).value = 'Converted from Watchlist Trade Idea';

  await populateAllAdviceSourceDropdowns();
  /** @type {HTMLSelectElement} */ (
    document.getElementById('journal-advice-source')
  ).value = sourceId || '';

  addJournalModal.classList.add('visible');
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-quantity')
  ).focus();
}

/**
 * Handles click on "Archive" (X) button from a Trade Idea row.
 * @param {string} itemId
 * @param {string} ticker
 * @param {function(): Promise<void>} refreshDetailsCallback
 * @returns {Promise<void>}
 */
async function handleCloseWatchlistIdea(
  itemId,
  ticker,
  refreshDetailsCallback
) {
  if (!itemId) return;

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

/**
 * Initializes all event listeners for the Sources page.
 * @returns {void}
 */
async function loadResearchPage() {
  // --- MODIFIED: This function now *only* loads the sources panel ---
  const sourcesPanel = /** @type {HTMLDivElement | null} */ (
    document.getElementById('research-sources-panel')
  );
  if (!sourcesPanel) {
    console.error('[Sources Loader] Sources panel container not found.');
    return;
  }

  console.log(`[Sources Loader] Preparing to load content for sources panel.`);

  // The renderSourcesList function will create the grid inside the panel.
  sourcesPanel.innerHTML = '<p>Loading sources...</p>';

  try {
    await fetchAndStoreAdviceSources();

    // Pass the panel itself; renderSourcesList will handle creating the grid.
    renderSourcesList(sourcesPanel, state.allAdviceSources);
    // Attach the click listener to the panel for delegation.
    initializeSourcesListClickListener(sourcesPanel);
  } catch (error) {
    console.error(`[Sources Loader] Error loading content:`, error);
    // @ts-ignore
    showToast(
      `Failed to load content: ${error instanceof Error ? error.message : String(error)}`,
      'error'
    );
    if (sourcesPanel) {
      sourcesPanel.innerHTML =
        '<p style="color: var(--negative-color);">Error loading sources.</p>';
    }
  }
}

/**
 * Initializes event handlers for the Sources page.
 * @returns {void}
 */
export function initializeResearchHandlers() {
  console.log('[Sources Init] Initializing Sources page handlers...');

  // Initialize modal handlers once
  initializeAddTradeIdeaModalHandler(() => loadResearchPage());
  initializeAddTechniqueModalHandler(() => loadResearchPage());

  console.log('[Sources Init] Sources page handlers initialized.');
}

// Export the main loader function
export { loadResearchPage };
