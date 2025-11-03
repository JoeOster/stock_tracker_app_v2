// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_watchlist.js
/**
 * @file Main event handler for the Watchlist view.
 * @module event-handlers/_watchlist
 */

// --- *** THIS IS THE FIX: Removed unused 'updateState' *** ---
import { state } from '../state.js';
// --- *** END FIX *** ---
import { renderWatchedTickers } from '../ui/renderers/_watchlist_watched.js';
import { renderRealTickers } from '../ui/renderers/_watchlist_real.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
// --- *** THIS IS THE FIX: Corrected spelling of 'Watched' *** ---
import {
  addSimpleWatchedTicker,
  deleteSimpleWatchedTicker,
  closeWatchlistIdea,
} from '../api/watchlist-api.js';
// --- *** END FIX *** ---
import { renderWatchlistIdeas } from '../ui/renderers/_watchlist_ideas.js';

/**
 * Stores the currently active sub-tab ('watched', 'ideas', 'real').
 * @type {string}
 */
let activeSubTab = 'watched';

/**
 * Refreshes the content of the currently active sub-tab.
 * @returns {Promise<void>}
 */
async function refreshActiveSubTab() {
  const panelElement = /** @type {HTMLDivElement} */ (
    document.getElementById('watchlist-content-panel')
  );
  if (!panelElement) return;

  try {
    if (activeSubTab === 'watched') {
      await renderWatchedTickers(panelElement);
    } else if (activeSubTab === 'ideas') {
      await renderWatchlistIdeas(panelElement);
    } else if (activeSubTab === 'real') {
      await renderRealTickers(panelElement);
    }
  } catch (error) {
    console.error(
      `Error refreshing watchlist sub-tab '${activeSubTab}':`,
      error
    );
    // @ts-ignore
    showToast(`Error loading ${activeSubTab} list: ${error.message}`, 'error');
  }
}

/**
 * Handles clicks on the sub-tabs ('Watched', 'Trade Ideas', 'From Real Trades').
 * @param {Event} e - The click event.
 * @returns {Promise<void>}
 */
async function handleSubTabClick(e) {
  const target = /** @type {HTMLElement} */ (e.target);
  if (!target.classList.contains('sub-tab')) return;

  const newSubTab = target.dataset.tab;
  if (!newSubTab || newSubTab === activeSubTab) return;

  activeSubTab = newSubTab;

  // Update active class
  document.querySelectorAll('.sub-tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  target.classList.add('active');

  await refreshActiveSubTab();
}

/**
 * Handles all click events within the watchlist panel, delegating to sub-handlers.
 * @param {Event} e - The click event.
 * @returns {Promise<void>}
 */
async function handleWatchlistClicks(e) {
  const target = /** @type {HTMLElement} */ (e.target);

  // --- Delegate to "Watched" tickers handler ---
  if (target.matches('#add-watched-ticker-form button[type="submit"]')) {
    e.preventDefault();
    await handleAddWatchedTicker();
  } else if (target.classList.contains('delete-watched-ticker-btn')) {
    await handleDeleteWatchedTicker(target);
  }

  // --- Delegate to "Trade Ideas" handler ---
  if (target.classList.contains('delete-watchlist-idea-btn')) {
    await handleDeleteWatchlistIdea(target);
  }
}

/**
 * Handles submission of the "Add Ticker" form.
 * @returns {Promise<void>}
 */
async function handleAddWatchedTicker() {
  const input = /** @type {HTMLInputElement} */ (
    document.getElementById('add-watched-ticker-input')
  );
  const ticker = input.value.trim().toUpperCase();
  // @ts-ignore
  const holderId = state.selectedAccountHolderId;

  if (!ticker) {
    showToast('Ticker cannot be empty.', 'error');
    return;
  }
  if (!holderId || holderId === 'all') {
    showToast('Please select a specific account holder.', 'error');
    return;
  }

  try {
    // --- *** THIS IS THE FIX: Corrected spelling *** ---
    await addSimpleWatchedTicker(holderId, ticker);
    // --- *** END FIX *** ---
    showToast(`Ticker ${ticker} added to watchlist.`, 'success');
    input.value = '';
    await refreshActiveSubTab(); // Refresh to show the new ticker
  } catch (error) {
    console.error('Failed to add watched ticker:', error);
    // @ts-ignore
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Handles click on the "Delete" (X) button for a watched ticker.
 * @param {HTMLElement} target - The delete button element.
 * @returns {Promise<void>}
 */
async function handleDeleteWatchedTicker(target) {
  const id = target.dataset.id;
  const row = target.closest('tr');
  const ticker = row?.dataset.ticker;
  // @ts-ignore
  const holderId = state.selectedAccountHolderId;

  if (!id || !ticker || !holderId || holderId === 'all') {
    showToast('Error: Missing data for deletion.', 'error');
    return;
  }

  showConfirmationModal(
    `Remove ${ticker}?`,
    `Are you sure you want to remove ${ticker} from your watchlist?`,
    async () => {
      try {
        // --- *** THIS IS THE FIX: Corrected spelling *** ---
        await deleteSimpleWatchedTicker(holderId, id);
        // --- *** END FIX *** ---
        showToast(`${ticker} removed from watchlist.`, 'success');
        await refreshActiveSubTab(); // Refresh to remove the ticker
      } catch (error) {
        console.error('Failed to delete watched ticker:', error);
        // @ts-ignore
        showToast(`Error: ${error.message}`, 'error');
      }
    }
  );
}

/**
 * Handles click on the "Delete" (X) button for a trade idea.
 * @param {HTMLElement} target - The delete button element.
 * @returns {Promise<void>}
 */
async function handleDeleteWatchlistIdea(target) {
  const id = target.dataset.id;
  const row = target.closest('tr');
  const ticker = row?.dataset.ticker;

  if (!id || !ticker) {
    showToast('Error: Missing data for deletion.', 'error');
    return;
  }

  showConfirmationModal(
    `Archive ${ticker} Idea?`,
    `Are you sure you want to archive this trade idea?`,
    async () => {
      try {
        await closeWatchlistIdea(id);
        showToast(`${ticker} idea archived.`, 'success');
        await refreshActiveSubTab(); // Refresh to remove the idea
      } catch (error) {
        console.error('Failed to archive trade idea:', error);
        // @ts-ignore
        showToast(`Error: ${error.message}`, 'error');
      }
    }
  );
}

/**
 * Initializes all event listeners for the Watchlist view.
 * @returns {void}
 */
export function initializeWatchlist() {
  const subTabs = /** @type {HTMLElement} */ (
    document.getElementById('watchlist-sub-tabs')
  );
  const panel = /** @type {HTMLElement} */ (
    document.getElementById('watchlist-content-panel')
  );

  if (subTabs) {
    subTabs.addEventListener('click', handleSubTabClick);
  }
  if (panel) {
    panel.addEventListener('click', handleWatchlistClicks);
  }

  // This listener refreshes the "Paper Trades" (ideas) tab
  // when a new one is created from the "Source Details" modal.
  document.addEventListener('journalUpdated', refreshActiveSubTab);

  // Load the default tab
  refreshActiveSubTab();
}
