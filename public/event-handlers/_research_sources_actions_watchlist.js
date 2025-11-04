// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_research_sources_actions_watchlist.js
/**
 * @file Contains action handlers for the Watchlist (Trade Ideas) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_watchlist
 */

import { state, updateState } from '../state.js';
import { switchView } from './_navigation.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import {
  getCurrentESTDateString,
  getCurrentESTDateTimeLocalString,
} from '../ui/datetime.js';
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
        addIdeaModal.querySelector('#add-idea-submit-btn')
      );
      const holderId = state.selectedAccountHolderId;

      // Get context from hidden fields
      const formSourceId = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-source-id')
      ).value;
      const formJournalId = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-journal-id')
      ).value;
      const formTicker = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-ticker')
      ).value
        .trim()
        .toUpperCase();

      const rec_entry_low = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-rec-entry-low')
      ).value;
      const rec_entry_high = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-rec-entry-high')
      ).value;
      const rec_tp1 = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-rec-tp1')
      ).value;
      const rec_tp2 = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-rec-tp2')
      ).value;
      const rec_stop_loss = /** @type {HTMLInputElement} */ (
        addIdeaModal.querySelector('#idea-form-rec-stop-loss')
      ).value;

      // --- Validation ---
      if (holderId === 'all' || !formSourceId) {
        return showToast('Error: Account or Source ID is missing.', 'error');
      }
      if (!formTicker || formTicker === 'N/A') {
        return showToast('Ticker is required and cannot be "N/A".', 'error');
      }
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

      if (addButton) addButton.disabled = true;
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
        if (addButton) addButton.disabled = false;
      }
    });
  }
}

/**
 * (Private Helper) Prefills and shows the "Add Trade Idea" modal.
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

/**
 * Handles click on "Add Trade Idea" from a Person/Group source.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleCreateTradeIdeaFromSource(target) {
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
export async function handleCreateTradeIdeaFromBook(target, journalEntries) {
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
 * Handles click on "Buy" button from a Trade Idea row.
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function handleCreateBuyOrderFromIdea(target) {
  // --- *** THIS IS THE FIX (Part 2) *** ---
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
  };
  // --- *** END FIX *** ---

  updateState({ prefillOrderFromSource: prefillData });
  await switchView('orders');

  const detailsModal = document.getElementById('source-details-modal');
  if (detailsModal) {
    detailsModal.classList.remove('visible');
  }

  showToast(`Prefilling "Log Trade" form for ${ticker}...`, 'info');
}

/**
 * Handles click on "Paper" button from a Trade Idea row.
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function handleCreatePaperTradeFromIdea(target) {
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
