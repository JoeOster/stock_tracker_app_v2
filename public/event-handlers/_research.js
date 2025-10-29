// /public/event-handlers/_research.js
/**
 * @file Handles initialization and interaction for the Research page (incorporating Journal/Paper Trading and Sources).
 * @module event-handlers/_research
 */

import { state } from '../state.js';
// Import handlers/loaders for nested tabs/content
import { initializeJournalHandlers, loadJournalPage } from './_journal.js'; // For Paper Trading tab
import { initializeJournalSubTabHandlers, initializeResearchSubTabHandlers } from './_journal_tabs.js'; // Tab switching
import { fetchAndStoreAdviceSources } from './_journal_settings.js'; // For fetching sources data
// Import the main source functions from the new orchestrator file
import { renderSourcesList, initializeSourcesListClickListener } from './_research_sources.js';
import { showToast } from '../ui/helpers.js';

/**
 * Loads data and renders content based on the active sub-tab for the Research page.
 * This acts as the main loader function triggered by tab switching or initial page load.
 * @returns {Promise<void>} A promise that resolves when the content is loaded and rendered.
 */
async function loadResearchPage() {
    const researchPageContainer = document.getElementById('research-page-container');
    if (!researchPageContainer) {
        console.error("[Research Loader] Research page container not found.");
        return; // Exit if main container is missing
    }

    const activeSubTabButton = researchPageContainer.querySelector('.research-sub-tabs .sub-tab.active');
    // Ensure button is HTMLElement before accessing dataset
    const activeSubTabId = activeSubTabButton instanceof HTMLElement ? activeSubTabButton.dataset.subTab : null;

    // Get panel elements
    const sourcesPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-sources-panel'));
    const paperTradingPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-paper-trading-panel'));
    const actionPlanPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-action-plan-panel'));

    // Clear panels or show loading message
    if (sourcesPanel) sourcesPanel.innerHTML = '<p>Loading sources...</p>';
    if (paperTradingPanel) {
        // Prepare paper trading panel structure if necessary (ideally it exists in the template)
        // Ensure necessary elements for loadJournalPage exist
        if (!paperTradingPanel.querySelector('#journal-open-body')) {
            // Simplified: show loading, loadJournalPage will render into it
             paperTradingPanel.innerHTML = '<p>Loading paper trading data...</p>';
        } else {
             const openBody = paperTradingPanel.querySelector('#journal-open-body');
             const closedBody = paperTradingPanel.querySelector('#journal-closed-body');
             if(openBody) openBody.innerHTML = '<tr><td colspan="10">Loading open entries...</td></tr>';
             if(closedBody) closedBody.innerHTML = '<tr><td colspan="10">Loading closed entries...</td></tr>';
        }
    }
    if (actionPlanPanel) actionPlanPanel.innerHTML = '<p><i>Action Plan content to be developed...</i></p>';

    console.log(`[Research Loader] Loading content for sub-tab: ${activeSubTabId}`);

    try {
        switch (activeSubTabId) {
            case 'research-sources-panel':
                if (sourcesPanel) {
                    await fetchAndStoreAdviceSources(); // Fetch data
                    renderSourcesList(sourcesPanel, state.allAdviceSources); // Render card list
                    // Find the grid container *after* rendering
                    const sourcesGridContainer = document.getElementById('sources-cards-grid'); // Changed ID target
                    if (sourcesGridContainer) {
                        initializeSourcesListClickListener(sourcesGridContainer); // Initialize listener
                    } else {
                        console.warn("[Research Loader] Could not find #sources-cards-grid container after rendering.");
                    }
                } else {
                    console.error("[Research Loader] Sources panel element not found.");
                }
                break;

            case 'research-paper-trading-panel':
                if (paperTradingPanel) {
                    await loadJournalPage(); // Fetches entries and calls renderJournalPage
                    // Ensure nested handlers are initialized after content might be replaced
                    initializeJournalSubTabHandlers(); // Handles Add/Open/Closed tabs within paper trading
                    initializeJournalHandlers(); // Handles form/table actions within paper trading
                } else {
                    console.error("[Research Loader] Paper Trading panel element not found.");
                }
                break;

            case 'research-action-plan-panel':
                if (actionPlanPanel) {
                    // Keep placeholder or load specific content
                    actionPlanPanel.innerHTML = `<h3>Action Plan</h3><p><i>Content for Action Plan to be developed...</i></p>`;
                } else {
                    console.error("[Research Loader] Action Plan panel element not found.");
                }
                break;

            default:
                console.warn(`[Research Loader] Unknown or missing research sub-tab ID: ${activeSubTabId}`);
                // Provide a default fallback display
                if (actionPlanPanel) {
                     actionPlanPanel.innerHTML = '<p>Please select a sub-tab.</p>';
                     // Ensure Action Plan panel is visible if no other tab ID matched
                     if (!activeSubTabId && actionPlanPanel) actionPlanPanel.classList.add('active');
                 } else if (sourcesPanel) { // Or fallback to sources panel
                     sourcesPanel.innerHTML = '<p>Please select a sub-tab.</p>';
                      if (!activeSubTabId && sourcesPanel) sourcesPanel.classList.add('active');
                 }
        }
    } catch (error) {
        console.error(`[Research Loader] Error loading content for ${activeSubTabId || 'default'}:`, error);
        showToast(`Failed to load content: ${error instanceof Error ? error.message : String(error)}`, 'error');
        // Display error in the intended panel if possible
        const targetPanel = activeSubTabId ? document.getElementById(activeSubTabId) : (actionPlanPanel || sourcesPanel);
        if (targetPanel) {
            targetPanel.innerHTML = '<p style="color: var(--negative-color);">Error loading content.</p>';
        }
    }
}


/**
 * Initializes event handlers for the Research page, primarily focusing on tab switching
 * and initializing handlers for nested content (like the journal).
 * @returns {void}
 */
export function initializeResearchHandlers() {
    console.log("[Research Init] Initializing Research page handlers...");

    // Initialize handlers for switching the main Research sub-tabs
    initializeResearchSubTabHandlers();

    // The following handlers are related to the 'Paper Trading' sub-tab content.
    // They are called here to ensure they are set up once, even though `loadResearchPage`
    // might re-call them if the paper trading panel's content is dynamically replaced.
    // Consider if `initializeJournalHandlers` needs to be idempotent or structured differently
    // if `loadJournalPage` completely replaces the panel's innerHTML including filter bars etc.
    initializeJournalSubTabHandlers(); // For Add/Open/Closed tabs within Paper Trading
    initializeJournalHandlers(); // For forms and tables within Paper Trading

    // Note: Source list interaction listeners are handled dynamically by `initializeSourcesListClickListener`
    // which is called by `loadResearchPage` when the 'research-sources-panel' is activated.

    console.log("[Research Init] Research page handlers initialized.");
}

// Export the main loader function
export { loadResearchPage };