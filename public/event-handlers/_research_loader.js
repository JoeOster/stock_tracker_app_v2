// /public/event-handlers/_research_loader.js
/**
 * @file Handles initialization and loading logic for the main Research page container and its top-level sub-tabs.
 * @module event-handlers/_research_loader
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { handleResponse } from '../api.js';
// Import functions needed for specific sub-tabs
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
// UPDATED: Import from new render/handler files
import { renderSourcesList } from './_research_sources_render.js';
import { initializeSourcesListClickListener } from './_research_sources_handlers.js';
// --- END UPDATE ---
import { loadJournalPage, initializeJournalHandlers } from './_journal.js';
// Import top-level sub-tab initializer
import { initializeResearchSubTabHandlers } from './_journal_tabs.js';

/**
 * Loads data and renders content based on the active sub-tab for the Research page.
 * @async
 * @returns {Promise<void>} A promise that resolves when the content is loaded and rendered.
 */
async function loadResearchPage() {
    const activeSubTabButton = document.querySelector('#research-page-container .research-sub-tabs .sub-tab.active');
    const activeSubTabId = /** @type {HTMLElement} */ (activeSubTabButton)?.dataset.subTab;

    const sourcesPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-sources-panel'));
    const paperTradingPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-paper-trading-panel'));
    const actionPlanPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-action-plan-panel'));

    // ... (Clear panels logic remains the same) ...
    if (sourcesPanel) sourcesPanel.innerHTML = '<p>Loading sources...</p>';
    if (paperTradingPanel) paperTradingPanel.innerHTML = '<p>Loading paper trading data...</p>';
    if (actionPlanPanel) actionPlanPanel.innerHTML = '<p><i>Action Plan content to be developed...</i></p>';


    try {
        switch (activeSubTabId) {
            case 'research-sources-panel':
                if (sourcesPanel) {
                    await fetchAndStoreAdviceSources();
                    // Use imported render function
                    renderSourcesList(sourcesPanel, state.allAdviceSources);
                    const sourcesListContainer = /** @type {HTMLElement | null} */ (document.getElementById('sources-list'));
                    if (sourcesListContainer) {
                        // Use imported handler initializer
                        initializeSourcesListClickListener(sourcesListContainer);
                    } else { console.warn("Could not find #sources-list container to attach listener after rendering."); }
                } else { console.error("Sources panel not found."); }
                break;

            case 'research-paper-trading-panel':
                // ... (Paper trading logic remains the same) ...
                 if (paperTradingPanel) {
                    // Inject the structure from _journal.html into the panel
                    try {
                        const response = await fetch('./templates/_journal.html'); // Fetch journal template
                        // Use handleResponse only if expecting JSON, otherwise use .text() for HTML
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const journalHTML = await response.text(); // Get HTML as text

                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = journalHTML;
                        // Select all direct children except h2 and subtitle
                        const journalNodes = tempDiv.querySelector('#journal-page-container')?.children;
                        if (journalNodes) {
                            paperTradingPanel.innerHTML = ''; // Clear loading message
                            Array.from(journalNodes).forEach(node => {
                                if (node.tagName !== 'H2' && !node.classList.contains('subtitle')) {
                                    paperTradingPanel.appendChild(node.cloneNode(true)); // Append cloned node
                                }
                            });
                        } else {
                            throw new Error("Could not find expected content within _journal.html");
                        }
                    } catch (fetchError) {
                         console.error("Failed to fetch or inject journal template:", fetchError);
                         paperTradingPanel.innerHTML = '<p style="color: var(--negative-color);">Error loading Paper Trading interface.</p>';
                         break; // Don't proceed if template fails
                    }
                } else { console.error("Paper Trading panel not found."); break; }

                // Now load the journal data and initialize its specific handlers
                await loadJournalPage();
                initializeJournalHandlers(); // Ensure journal's internal handlers (forms, tables) are attached
                break;

            case 'research-action-plan-panel':
                // ... (Action plan logic remains the same) ...
                if (actionPlanPanel) {
                    actionPlanPanel.innerHTML = `<h3>Action Plan</h3><p><i>Content for Action Plan to be developed...</i></p>`;
                    // Add specific loading/rendering for Action Plan here later
                } else { console.error("Action Plan panel not found."); }
                break;

            default:
                // ... (Default logic remains the same) ...
                console.warn(`Unknown or no active research sub-tab ID: ${activeSubTabId}`);
                // Default to showing the first tab's content (Sources)
                if (sourcesPanel) {
                     await fetchAndStoreAdviceSources();
                     renderSourcesList(sourcesPanel, state.allAdviceSources);
                     const sourcesListContainer = /** @type {HTMLElement | null} */ (document.getElementById('sources-list'));
                     if (sourcesListContainer) initializeSourcesListClickListener(sourcesListContainer);
                } else if(actionPlanPanel) { // Fallback message if even sources panel is missing
                     actionPlanPanel.innerHTML = '<p>Please select a sub-tab.</p>';
                }
        }
    } catch (error) {
        // ... (Error handling remains the same) ...
         // Explicitly cast error to Error type
         const err = /** @type {Error} */ (error);
         console.error(`Error loading content for research sub-tab ${activeSubTabId}:`, err);
         showToast(`Error loading content: ${err.message}`, 'error');
         // Show error in the relevant panel
         const panelWithError = activeSubTabId ? document.getElementById(activeSubTabId) : null;
         if (panelWithError) {
             panelWithError.innerHTML = `<p style="color: var(--negative-color);">Error loading content for this section.</p>`;
         }
    }
}

/**
 * Initializes event handlers for the Research page's top-level sub-tabs.
 * @returns {void}
 */
export function initializeResearchHandlers() {
    initializeResearchSubTabHandlers();
}

export { loadResearchPage };