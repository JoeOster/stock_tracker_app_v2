// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_research_sources_actions_journal.js
/**
 * @file Contains action handlers for the Journal (Techniques) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_journal
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { addJournalEntry, updateJournalEntry } from '../api/journal-api.js';
// --- *** THIS IS THE FIX: Removed unused import *** ---
import { getSourceNameFromId } from '../ui/dropdowns.js';
// --- *** END FIX *** ---
import { getCurrentESTDateTimeLocalString } from '../ui/datetime.js';

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
 * Handles click on "Edit Technique" button from a Technique row.
 * Pre-fills and shows the "Add Technique" modal for editing.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques.
 * @returns {Promise<void>}
 */
export async function handleOpenEditTechniqueModal(target, journalEntries) {
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

  // Set link display
  const linkDisplaySpan = document.querySelector(
    '#technique-form-link-display span'
  );
  if (linkDisplaySpan) {
    const sourceName = getSourceNameFromId(entry.advice_source_id);
    linkDisplaySpan.textContent = `Source: "${sourceName || 'Unknown'}"`;
  }

  modal.classList.add('visible');
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
    if (el) el.value = value;
    return el;
  };

  safeSetInputValue('idea-form-source-id', sourceId);
  safeSetInputValue('idea-form-journal-id', journalId);

  const tickerInput = safeSetInputValue(
    'idea-form-ticker',
    ticker === 'N/A' ? '' : ticker
  );
  // A technique-derived idea should always have a blank, editable ticker
  const isTickerReadOnly = false;
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

  if (tickerInput) tickerInput.focus();
}

/**
 * Handles click on "Add Idea" from a specific Technique row.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromTechnique(
  target,
  journalEntries
) {
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

  // --- *** THIS IS THE FIX (Item #4) *** ---
  // Pass an empty object so the form is blank, as requested.
  const defaults = {};
  // --- *** END FIX *** ---

  openAddTradeIdeaModal(
    String(technique.advice_source_id),
    sourceName,
    ticker,
    journalId,
    defaults
  );
}

/**
 * Initializes the submit handler for the new "Add Technique" modal.
 * This now handles BOTH Create (Add) and Update (Edit).
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {void}
 */
export function initializeAddTechniqueModalHandler(refreshDetailsCallback) {
  const addTechniqueModal = document.getElementById('add-technique-modal');
  const addTechniqueForm = /** @type {HTMLFormElement} */ (
    document.getElementById('add-technique-form')
  );

  if (addTechniqueForm && addTechniqueModal) {
    addTechniqueForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = /** @type {HTMLFormElement} */ (e.target);
      const addButton = /** @type {HTMLButtonElement} */ (
        form.querySelector('#add-technique-submit-btn')
      );

      if (!addButton) {
        console.error('Could not find submit button inside form!');
        return;
      }

      const holderId = state.selectedAccountHolderId;

      const formSourceId = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-source-id')
      ).value;
      const formEntryId = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-entry-id')
      ).value;
      const isEditing = !!formEntryId;

      // Get form values
      const entryDate = new Date().toLocaleDateString('en-CA');
      const ticker = 'N/A';
      const entryReason = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-entry-reason')
      ).value.trim();
      const chartType = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-chart-type')
      ).value.trim();
      const imagePath = /** @type {HTMLInputElement} */ (
        document.getElementById('technique-form-image-path')
      ).value.trim();
      const notes = /** @type {HTMLTextAreaElement} */ (
        document.getElementById('technique-form-notes')
      ).value.trim();

      if (holderId === 'all' || !formSourceId) {
        return showToast('Error: Account or Source ID is missing.', 'error');
      }
      if (!entryReason) {
        return showToast('Description is required.', 'error');
      }

      const quantity = 0;
      const entryPrice = 0;

      const combinedNotes = chartType
        ? `Chart Type: ${chartType}\n\n${notes}`
        : notes || null;

      const entryData = {
        account_holder_id: holderId,
        advice_source_id: formSourceId,
        entry_date: isEditing ? undefined : entryDate,
        ticker: ticker,
        exchange: 'Paper',
        direction: 'BUY',
        quantity: quantity,
        entry_price: entryPrice,
        target_price: isEditing ? undefined : null,
        target_price_2: isEditing ? undefined : null,
        stop_loss_price: isEditing ? undefined : null,
        entry_reason: entryReason,
        notes: combinedNotes,
        image_path: imagePath || null,
        status: 'OPEN',
      };

      if (isEditing) {
        Object.keys(entryData).forEach(
          (key) => entryData[key] === undefined && delete entryData[key]
        );
      }

      addButton.disabled = true;
      try {
        if (isEditing) {
          await updateJournalEntry(formEntryId, entryData);
          showToast('Technique updated!', 'success');
        } else {
          // @ts-ignore
          entryData.linked_document_urls = [];
          await addJournalEntry(entryData);
          showToast('New technique added!', 'success');
        }

        addTechniqueForm.reset();
        addTechniqueModal.classList.remove('visible');

        await refreshDetailsCallback();
      } catch (error) {
        console.error('Failed to save journal entry (technique):', error);
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        addButton.disabled = false;
      }
    });
  }
}

/**
 * Handles click on "Add Technique" button from the main Source profile (Book/etc).
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleOpenAddTechniqueModal(target) {
  const { sourceId, sourceName } = target.dataset;

  if (!sourceId || !sourceName) {
    return showToast('Error: Missing data from source button.', 'error');
  }

  const addTechniqueModal = document.getElementById('add-technique-modal');
  const addTechniqueForm = /** @type {HTMLFormElement} */ (
    document.getElementById('add-technique-form')
  );

  if (!addTechniqueModal || !addTechniqueForm) {
    return showToast(
      'UI Error: Could not find the "Add Technique" modal.',
      'error'
    );
  }

  addTechniqueForm.reset();

  /** @type {HTMLElement} */ (
    document.getElementById('add-technique-modal-title')
  ).textContent = 'Add Technique / Method';
  /** @type {HTMLButtonElement} */ (
    document.getElementById('add-technique-submit-btn')
  ).textContent = 'Add Technique';

  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-source-id')
  ).value = sourceId;
  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-entry-id')
  ).value = '';

  const linkDisplaySpan = document.querySelector(
    '#technique-form-link-display span'
  );
  if (linkDisplaySpan) {
    linkDisplaySpan.textContent = `Source: "${sourceName}"`;
  }

  addTechniqueModal.classList.add('visible');

  /** @type {HTMLInputElement} */ (
    document.getElementById('technique-form-entry-reason')
  ).focus();
}

/**
 * @deprecated
 */
export async function handleAddTechniqueSubmit() {
  console.warn(
    'DEPRECATED: handleAddTechniqueSubmit was called. Logic has moved to initializeAddTechniqueModalHandler.'
  );
}
