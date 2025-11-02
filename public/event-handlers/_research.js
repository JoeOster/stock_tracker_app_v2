// /public/event-handlers/_research.js
/**
 * @file Manages the "Sources" page (formerly "Research").
 * @module event-handlers/_research
 */

import { state } from '../state.js';
// --- REMOVED: Journal/Tab handlers ---
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
import {
  renderSourcesList,
  initializeSourcesListClickListener,
} from './_research_sources.js';
import { showToast } from '../ui/helpers.js';

/**
 * Loads data and renders content for the Sources page.
 * @async
 * @returns {Promise<void>}
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
  // --- REMOVED: initializeResearchSubTabHandlers() ---
  // No sub-tabs to initialize anymore.
  console.log('[Sources Init] Sources page handlers initialized.');
}

// Export the main loader function
export { loadResearchPage };
