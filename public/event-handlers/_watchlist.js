// /public/event-handlers/_watchlist.js
/**
 * @file Manages the "Watchlist" page, including sub-tab switching and content loading.
 * @module event-handlers/_watchlist
 */

import { state, updateState } from '../state.js';
import {
  showToast,
  showConfirmationModal,
  sortTableByColumn,
} from '../ui/helpers.js';
import { setActiveTab } from './_settings_modal.js';
import { renderWatchlistRealPositions } from '../ui/renderers/_watchlist_real.js';
// --- ADDED: Journal-related imports ---
import { fetchJournalEntries } from '../api/journal-api.js';
import { renderJournalPage } from '../ui/renderers/_journal.js';
import { initializeJournalFilterHandlers } from './_journal_filters.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
// --- ADDED: Watched Ticker imports ---
import { renderWatchedTickers } from '../ui/renderers/_watchlist_watched.js';
import {
  addSimpleWatchedTicker,
  deleteSimpleWatchedTicker,
} from '../api/watchlist-api.js';
// --- END ADDED ---

/**
 * --- NEW: Fetches and renders the Paper Trades sub-tab ---
 * This logic is moved from the old loadJournalPage.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
async function renderWatchlistPaperTrades(panelElement) {
  const openTableBody = panelElement.querySelector('#journal-open-body');
  const closedTableBody = panelElement.querySelector('#journal-closed-body');

  if (!openTableBody || !closedTableBody) {
    panelElement.innerHTML =
      '<h3>Paper Trades</h3><p style="color: var(--negative-color);">Error: Table body elements not found.</p>';
    return;
  }

  openTableBody.innerHTML =
    '<tr><td colspan="11">Loading open entries...</td></tr>';
  closedTableBody.innerHTML =
    '<tr><td colspan="10">Loading closed entries...</td></tr>';

  let openEntries = [];
  let closedEntriesCombined = [];

  try {
    const holderId =
      state.selectedAccountHolderId === 'all' || !state.selectedAccountHolderId
        ? null
        : String(state.selectedAccountHolderId);

    if (holderId) {
      openEntries = await fetchJournalEntries(holderId, 'OPEN');
      const results = await Promise.allSettled([
        fetchJournalEntries(holderId, 'CLOSED'),
        fetchJournalEntries(holderId, 'EXECUTED'),
        fetchJournalEntries(holderId, 'CANCELLED'),
      ]);
      results.forEach((result) => {
        if (result.status === 'fulfilled')
          closedEntriesCombined.push(...result.value);
      });
      closedEntriesCombined.sort((a, b) =>
        (b.exit_date || b.entry_date).localeCompare(a.exit_date || a.entry_date)
      );
    } else {
      if (openTableBody)
        openTableBody.innerHTML =
          '<tr><td colspan="11">Please select an account holder to view journal entries.</td></tr>';
      if (closedTableBody)
        closedTableBody.innerHTML =
          '<tr><td colspan="10">Please select an account holder.</td></tr>';
    }

    updateState({
      journalEntries: {
        openEntries: openEntries,
        closedEntries: closedEntriesCombined,
      },
    });
    renderJournalPage(
      { openEntries, closedEntries: closedEntriesCombined },
      true
    ); // true = readOnly
  } catch (error) {
    console.error('Error loading paper trades for watchlist:', error);
    // @ts-ignore
    showToast(`Error loading paper trades: ${error.message}`, 'error');
    if (openTableBody)
      openTableBody.innerHTML =
        '<tr><td colspan="11">Error loading open entries.</td></tr>';
    if (closedTableBody)
      closedTableBody.innerHTML =
        '<tr><td colspan="10">Error loading closed entries.</td></tr>';
  }
}

/**
 * Loads data and renders content based on the active sub-tab for the Watchlist page.
 * @async
 * @returns {Promise<void>}
 */
export async function loadWatchlistPage() {
  const watchlistContainer = document.getElementById(
    'watchlist-page-container'
  );
  if (!watchlistContainer) {
    console.error('[Watchlist Loader] Watchlist page container not found.');
    return;
  }

  const activeSubTabButton = watchlistContainer.querySelector(
    '.watchlist-sub-tabs .sub-tab.active'
  );
  const activeSubTabId =
    activeSubTabButton instanceof HTMLElement
      ? activeSubTabButton.dataset.subTab
      : 'watchlist-real-panel';

  console.log(
    `[Watchlist Loader] Preparing to load content for sub-tab: ${activeSubTabId}`
  );

  const realPanel = /** @type {HTMLDivElement | null} */ (
    document.getElementById('watchlist-real-panel')
  );
  const paperPanel = /** @type {HTMLDivElement | null} */ (
    document.getElementById('watchlist-paper-panel')
  );
  const watchedPanel = /** @type {HTMLDivElement | null} */ (
    document.getElementById('watchlist-watched-panel')
  );

  try {
    switch (activeSubTabId) {
      case 'watchlist-real-panel':
        if (realPanel) {
          await renderWatchlistRealPositions(realPanel);
        }
        break;
      case 'watchlist-paper-panel':
        if (paperPanel) {
          await renderWatchlistPaperTrades(paperPanel);
        }
        break;
      // --- MODIFIED: Call the new render function ---
      case 'watchlist-watched-panel':
        if (watchedPanel) {
          await renderWatchedTickers(watchedPanel);
        }
        break;
      // --- END MODIFICATION ---
    }
  } catch (error) {
    console.error(
      `[Watchlist Loader] Error loading content for ${activeSubTabId}:`,
      error
    );
    // @ts-ignore
    showToast(`Failed to load content: ${error.message}`, 'error');
    const errorPanel = document.getElementById(activeSubTabId);
    if (errorPanel) {
      errorPanel.innerHTML =
        '<p style="color: var(--negative-color);">Error loading content.</p>';
    }
  }
}

/**
 * Handles clicks on "Add Paper Trade" and "Edit" buttons.
 * @param {Event} e - The click event.
 */
async function handlePaperTradeActions(e) {
  const target = /** @type {HTMLElement} */ (e.target);

  // --- Handle "Add Paper Trade" Button ---
  if (target.matches('#watchlist-add-paper-trade-btn')) {
    const modal = document.getElementById('add-paper-trade-modal');
    const form = /** @type {HTMLFormElement} */ (
      document.getElementById('add-journal-entry-form')
    );
    if (modal && form) {
      form.reset();
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-entry-date')
      ).value = getCurrentESTDateString();
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-form-entry-id')
      ).value = '';
      /** @type {HTMLElement} */ (
        document.getElementById('add-paper-trade-modal-title')
      ).textContent = 'Add New Journal Entry / Idea';
      /** @type {HTMLButtonElement} */ (
        document.getElementById('add-journal-entry-btn')
      ).textContent = 'Add Journal Entry';
      await populateAllAdviceSourceDropdowns();
      modal.classList.add('visible');
    }
  }

  // --- Handle "Edit" Button (from table) ---
  if (target.matches('.journal-edit-btn')) {
    const journalId = target.dataset.id;
    if (!journalId) return;

    // @ts-ignore
    const openEntry = state.journalEntries?.openEntries.find(
      (e) => String(e.id) === journalId
    );
    // @ts-ignore
    const closedEntry = state.journalEntries?.closedEntries.find(
      (e) => String(e.id) === journalId
    );
    const entry = openEntry || closedEntry;

    if (!entry) {
      return showToast('Error: Could not find entry data to edit.', 'error');
    }

    const modal = document.getElementById('add-paper-trade-modal');
    const form = /** @type {HTMLFormElement} */ (
      document.getElementById('add-journal-entry-form')
    );
    if (modal && form) {
      form.reset();
      /** @type {HTMLElement} */ (
        document.getElementById('add-paper-trade-modal-title')
      ).textContent = `Edit Entry: ${entry.ticker}`;
      /** @type {HTMLButtonElement} */ (
        document.getElementById('add-journal-entry-btn')
      ).textContent = 'Save Changes';
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-form-entry-id')
      ).value = entry.id;
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-entry-date')
      ).value = entry.entry_date;
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-ticker')
      ).value = entry.ticker;
      /** @type {HTMLSelectElement} */ (
        document.getElementById('journal-exchange')
      ).value = entry.exchange;
      /** @type {HTMLSelectElement} */ (
        document.getElementById('journal-direction')
      ).value = entry.direction;
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-quantity')
      ).value = String(entry.quantity);
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-entry-price')
      ).value = String(entry.entry_price);
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-target-price')
      ).value = entry.target_price || '';
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-target-price-2')
      ).value = entry.target_price_2 || '';
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-stop-loss-price')
      ).value = entry.stop_loss_price || '';
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-advice-details')
      ).value = entry.advice_source_details || '';
      /** @type {HTMLInputElement} */ (
        document.getElementById('journal-entry-reason')
      ).value = entry.entry_reason || '';
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById('journal-notes')
      ).value = entry.notes || '';
      await populateAllAdviceSourceDropdowns();
      /** @type {HTMLSelectElement} */ (
        document.getElementById('journal-advice-source')
      ).value = entry.advice_source_id || '';
      modal.classList.add('visible');
    }
  }
}

// --- ADDED: Handler for 'Watched Tickers' actions ---
/**
 * Handles form submission and delete clicks for the "Watched Tickers" sub-tab.
 * @param {Event} e - The event (click or submit).
 */
async function handleWatchedTickerActions(e) {
  const target = /** @type {HTMLElement} */ (e.target);

  // --- Handle "Add Ticker" Form Submit ---
  if (
    target.matches('#add-watched-ticker-form') ||
    target.closest('#add-watched-ticker-form')
  ) {
    e.preventDefault(); // Prevent form submission
    const input = /** @type {HTMLInputElement} */ (
      document.getElementById('add-watched-ticker-input')
    );
    const ticker = input.value.trim().toUpperCase();
    if (!ticker) {
      return showToast('Please enter a ticker symbol.', 'error');
    }

    try {
      const result = await addSimpleWatchedTicker(
        ticker,
        state.selectedAccountHolderId
      );
      showToast(result.message, 'success');
      input.value = ''; // Clear input
      // Refresh this sub-tab
      await renderWatchedTickers(
        /** @type {HTMLDivElement} */ (
          document.getElementById('watchlist-watched-panel')
        )
      );
    } catch (error) {
      // @ts-ignore
      showToast(`Error: ${error.message}`, 'error');
    }
  }

  // --- Handle "Delete" Button ---
  if (target.matches('.delete-watched-ticker-btn')) {
    const itemId = target.dataset.id;
    const ticker = target.closest('tr')?.dataset.ticker || 'this ticker';
    if (!itemId) return;

    showConfirmationModal(
      `Stop watching ${ticker}?`,
      'Are you sure you want to remove this ticker from your watched list?',
      async () => {
        try {
          await deleteSimpleWatchedTicker(itemId);
          showToast(`${ticker} removed from watched list.`, 'success');
          // Refresh this sub-tab
          await renderWatchedTickers(
            /** @type {HTMLDivElement} */ (
              document.getElementById('watchlist-watched-panel')
            )
          );
        } catch (error) {
          // @ts-ignore
          showToast(`Error: ${error.message}`, 'error');
        }
      }
    );
  }
}
// --- END ADDED ---

/**
 * Initializes event handlers for the Watchlist page.
 * @returns {void}
 */
export function initializeWatchlistHandlers() {
  const watchlistContainer = document.getElementById(
    'watchlist-page-container'
  );
  const watchlistSubTabsContainer = watchlistContainer?.querySelector(
    '.watchlist-sub-tabs'
  );

  if (watchlistSubTabsContainer && watchlistContainer) {
    // --- Sub-Tab Switching ---
    watchlistSubTabsContainer.addEventListener('click', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (
        target.classList.contains('sub-tab') &&
        !target.classList.contains('active')
      ) {
        setActiveTab(
          watchlistSubTabsContainer,
          target,
          watchlistContainer,
          '.sub-tab-panel',
          'data-sub-tab',
          '#'
        );
        await loadWatchlistPage(); // Reload content for the new tab
      }
    });

    // --- Initialize Handlers for Sub-Tab Content ---
    initializeJournalFilterHandlers(); // For the paper trade filters

    // --- Event Delegation for All Actions ---
    // --- MODIFIED: Added 'submit' listener for the new form ---
    watchlistContainer.addEventListener('click', async (e) => {
      await handlePaperTradeActions(e);
      await handleWatchedTickerActions(e);

      // Handle table sorting
      const target = /** @type {HTMLElement} */ (e.target);
      const th = /** @type {HTMLTableCellElement} */ (
        target.closest('th[data-sort]')
      );
      if (th) {
        const table = /** @type {HTMLTableElement} */ (th.closest('table'));
        const tbody = table?.querySelector('tbody');
        if (tbody) {
          sortTableByColumn(th, tbody);
        }
      }
    });
    watchlistContainer.addEventListener('submit', (e) => {
      handleWatchedTickerActions(e); // Handle form submission
    });
    // --- END MODIFICATION ---

    // --- Listen for journal updates from modals ---
    document.addEventListener('journalUpdated', async () => {
      console.log(
        "[Watchlist] 'journalUpdated' event detected. Refreshing paper trades..."
      );

      // --- THIS IS THE FIX ---
      const activeSubTabButton = /** @type {HTMLElement | null} */ (
        watchlistContainer.querySelector('.watchlist-sub-tabs .sub-tab.active')
      );
      // --- END FIX ---

      // Only refresh if the paper panel is currently active
      if (activeSubTabButton?.dataset.subTab === 'watchlist-paper-panel') {
        // <-- This line will now work
        await renderWatchlistPaperTrades(
          /** @type {HTMLDivElement} */ (
            document.getElementById('watchlist-paper-panel')
          )
        );
      }
    });
  }
}
