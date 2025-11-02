// public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Contains action handlers for the Watchlist (Trade Ideas) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state, updateState } from '../state.js';
import { switchView } from './_navigation.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import {
  populateAllAdviceSourceDropdowns,
  getSourceNameFromId,
} from '../ui/dropdowns.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { addWatchlistIdea, closeWatchlistIdea } from '../api/watchlist-api.js';

/**
 * Initializes the submit handler for the "Add Trade Idea" modal.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {void}
 */
export function initializeAddTradeIdeaModalHandler(refreshDetailsCallback) {
  const addIdeaModal = document.getElementById('add-trade-idea-modal');
  const addIdeaForm = /** @type {HTMLFormElement} */ (
    document.getElementById('add-trade-idea-form')
  );

  if (addIdeaForm && addIdeaModal) {
    addIdeaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addButton = /** @type {HTMLButtonElement} */ (
        document.getElementById('add-idea-submit-btn')
      );
      const holderId = state.selectedAccountHolderId;

      // Get context from hidden fields
      const formSourceId = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-source-id')
      ).value;
      const formJournalId = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-journal-id')
      ).value;
      // --- MODIFICATION: Read ticker from the (now-editable) input ---
      const formTicker = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-ticker')
      ).value
        .trim()
        .toUpperCase();
      // --- END MODIFICATION ---

      // Get form values
      const rec_entry_low = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-rec-entry-low')
      ).value;
      const rec_entry_high = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-rec-entry-high')
      ).value;
      const rec_tp1 = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-rec-tp1')
      ).value;
      const rec_tp2 = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-rec-tp2')
      ).value;
      const rec_stop_loss = /** @type {HTMLInputElement} */ (
        document.getElementById('idea-form-rec-stop-loss')
      ).value;

      // --- Validation ---
      if (holderId === 'all' || !formSourceId) {
        return showToast('Error: Account or Source ID is missing.', 'error');
      }
      // --- ADDED: Ticker validation ---
      if (!formTicker) {
        return showToast('Ticker is required.', 'error');
      }
      // --- END ADDED ---
      if (!rec_entry_low && !rec_entry_high && !rec_tp1 && !rec_stop_loss) {
        return showToast(
          'Please enter at least one guideline (Entry, TP, or SL).',
          'error'
        );
      }

      const ideaData = {
        account_holder_id: holderId,
        ticker: formTicker,
        advice_source_id: formSourceId,
        journal_entry_id: formJournalId || null,
        rec_entry_low: rec_entry_low || null,
        rec_entry_high: rec_entry_high || null,
        rec_tp1: rec_tp1 || null,
        rec_tp2: rec_tp2 || null,
        rec_stop_loss: rec_stop_loss || null,
      };

      addButton.disabled = true;
      try {
        await addWatchlistIdea(ideaData);
        showToast('New trade idea added!', 'success');
        addIdeaForm.reset();
        addIdeaModal.classList.remove('visible');

        await refreshDetailsCallback();
      } catch (error) {
        console.error('Failed to add watchlist idea:', error);
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        addButton.disabled = false;
      }
    });
  }
}

/**
 * --- MODIFIED: Ticker is now optional ---
 * Prefills and shows the "Add Trade Idea" modal.
 * @param {string} sourceId - The ID of the source.
 * @param {string} sourceName - The name of the source.
 * @param {string} [ticker=''] - The ticker symbol (optional).
 * @param {string} [journalId] - Optional: The ID of the technique (journal entry) it's derived from.
 * @param {object} [defaults] - Optional: Default values from a technique (entry, tp1, tp2, sl).
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

  // Reset form
  addIdeaForm.reset();

  // Set new context (linking to the source and ticker)
  /** @type {HTMLInputElement} */ (
    document.getElementById('idea-form-source-id')
  ).value = sourceId;
  /** @type {HTMLInputElement} */ (
    document.getElementById('idea-form-journal-id')
  ).value = journalId;

  // --- MODIFICATION: Handle optional ticker ---
  const tickerInput = /** @type {HTMLInputElement} */ (
    document.getElementById('idea-form-ticker')
  );
  tickerInput.value = ticker;
  // If ticker is pre-filled (from a technique), make it read-only
  // If it's empty (from Person/Group), make it editable
  tickerInput.readOnly = !!ticker;
  // --- END MODIFICATION ---

  // Set the link display text
  const linkDisplaySpan = document.querySelector(
    '#idea-form-link-display span'
  );
  if (linkDisplaySpan) {
    // --- MODIFICATION: Update text to reflect optional ticker ---
    linkDisplaySpan.textContent = `Source: "${sourceName}"${ticker ? ` | Ticker: ${ticker}` : ''}`;
    // --- END MODIFICATION ---
  }

  // Set default values if provided (from a technique)
  if (defaults) {
    // @ts-ignore
    /** @type {HTMLInputElement} */ (
      document.getElementById('idea-form-rec-entry-low')
    ).value = defaults.entry || '';
    // @ts-ignore
    /** @type {HTMLInputElement} */ (
      document.getElementById('idea-form-rec-tp1')
    ).value = defaults.tp1 || '';
    // @ts-ignore
    /** @type {HTMLInputElement} */ (
      document.getElementById('idea-form-rec-tp2')
    ).value = defaults.tp2 || '';
    // @ts-ignore
    /** @type {HTMLInputElement} */ (
      document.getElementById('idea-form-rec-stop-loss')
    ).value = defaults.sl || '';
  }

  // Show the modal
  addIdeaModal.classList.add('visible');

  // --- MODIFICATION: Focus ticker input if it's empty, otherwise focus entry-low ---
  if (!ticker) {
    tickerInput.focus();
  } else {
    /** @type {HTMLInputElement} */ (
      document.getElementById('idea-form-rec-entry-low')
    ).focus();
  }
  // --- END MODIFICATION ---
}

/**
 * --- MODIFIED: This function no longer uses prompt() ---
 * Handles click on "Add Trade Idea" from a Person/Group source.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromSource(target) {
  const { sourceId, sourceName } = target.dataset;

  if (!sourceId || !sourceName) {
    return showToast('Error: Missing data from source button.', 'error');
  }

  // --- THIS IS THE FIX ---
  // Open the modal directly, allowing the user to fill in the ticker.
  openAddTradeIdeaModal(sourceId, sourceName);
  // --- END FIX ---
}

/**
 * Handles click on "Add Trade Idea" from a Book/Website/etc. source.
 * @param {HTMLElement} target - The button element that was clicked.
 * @param {any[]} journalEntries - The list of techniques to choose from.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromBook(target, journalEntries) {
  const { sourceId, sourceName } = target.dataset;
  if (!sourceId || !sourceName) {
    return showToast('Error: Missing data from source button.', 'error');
  }

  const openTechniques = journalEntries.filter((j) => j.status === 'OPEN');
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
      entry: technique.entry_price,
      tp1: technique.target_price,
      tp2: technique.target_price_2,
      sl: technique.stop_loss_price,
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
      'Please click "Add Idea" on a specific technique row below.',
      'info',
      5000
    );
    document.getElementById('source-details-modal-content')?.scrollTo({
      // @ts-ignore
      top: document.getElementById('paper-trades-open-table')?.offsetTop || 0,
      behavior: 'smooth',
    });
  }
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
  const { journalId, ticker, entry, tp1, tp2, sl } = target.dataset;

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

  const defaults = { entry, tp1, tp2, sl };
  openAddTradeIdeaModal(
    String(technique.advice_source_id),
    sourceName,
    ticker,
    journalId,
    defaults
  );
}

// ... (rest of file: handleCreateBuyOrderFromIdea, handleCreatePaperTradeFromIdea, handleCloseWatchlistIdea are unchanged) ...
export async function handleCreateBuyOrderFromIdea(target) {
  const { ticker, entryLow, entryHigh, tp1, tp2, sl, sourceId, sourceName } =
    target.dataset;

  const prefillData = {
    sourceId: sourceId,
    sourceName: sourceName,
    ticker: ticker,
    price: entryHigh || entryLow || '',
    tp1: tp1 || null,
    tp2: tp2 || null,
    sl: sl || null,
  };

  updateState({ prefillOrderFromSource: prefillData });
  await switchView('orders');

  showToast(`Prefilling "Log Trade" form for ${ticker}...`, 'info');
}
export async function handleCreatePaperTradeFromIdea(target) {
  const { ticker, entryLow, entryHigh, tp1, tp2, sl, sourceId } =
    target.dataset;
  if (!ticker) {
    return showToast('Error: Ticker not found.', 'error');
  }

  // Find the modal and form
  const addJournalModal = document.getElementById('add-paper-trade-modal');
  const addJournalForm = /** @type {HTMLFormElement} */ (
    document.getElementById('add-journal-entry-form')
  );
  if (!addJournalModal || !addJournalForm) {
    return showToast('Error: Could not find paper trade modal.', 'error');
  }

  // Reset form
  addJournalForm.reset();

  // Set title and context
  /** @type {HTMLElement} */ (
    document.getElementById('add-paper-trade-modal-title')
  ).textContent = `Convert Idea to Paper Trade: ${ticker}`;
  /** @type {HTMLButtonElement} */ (
    document.getElementById('add-journal-entry-btn')
  ).textContent = 'Add Journal Entry';
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-form-entry-id')
  ).value = ''; // Ensure it's a new entry

  // Pre-fill data
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-entry-date')
  ).value = getCurrentESTDateString();
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-ticker')
  ).value = ticker;
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-quantity')
  ).value = '0'; // User must enter quantity
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

  // Pre-fill and load advice source dropdown
  await populateAllAdviceSourceDropdowns();
  /** @type {HTMLSelectElement} */ (
    document.getElementById('journal-advice-source')
  ).value = sourceId || '';

  // Show the modal
  addJournalModal.classList.add('visible');
  /** @type {HTMLInputElement} */ (
    document.getElementById('journal-quantity')
  ).focus();
}
export async function handleCloseWatchlistIdea(
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
