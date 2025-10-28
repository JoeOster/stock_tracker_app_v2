// /public/event-handlers/_journal_tabs.js
/**
 * @file Initializes event handlers for the Research page's top-level sub-tabs.
 * @module event-handlers/_journal_tabs
 */

import { showToast } from '../ui/helpers.js';

/**
 * Initializes the event listeners for switching between the main Research sub-tabs.
 * @returns {void}
 */
export function initializeResearchSubTabHandlers() {
    const researchPageContainer = document.getElementById('research-page-container');
    const researchSubTabsContainer = researchPageContainer?.querySelector('.research-sub-tabs');

    if (researchSubTabsContainer && researchPageContainer) {
        researchSubTabsContainer.addEventListener('click', async (e) => { // Make async
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                const subTabName = target.dataset.subTab;
                if (!subTabName) return;

                researchSubTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                researchPageContainer.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                target.classList.add('active');
                const panelToShow = researchPageContainer.querySelector(`#${subTabName}`);
                if (panelToShow instanceof HTMLElement) { // Type guard
                    panelToShow.classList.add('active');
                }

                // Reload content for the newly activated tab
                try {
                    // Dynamically import from the new loader file
                    const researchModule = await import('./_research_loader.js');
                    if (researchModule.loadResearchPage && typeof researchModule.loadResearchPage === 'function') {
                        await researchModule.loadResearchPage();
                    } else {
                         throw new Error("loadResearchPage function not found in imported module.");
                    }
                } catch (error) {
                    // Explicitly cast error to Error type
                    const err = /** @type {Error} */ (error);
                    console.error("Error reloading research page content:", err);
                    showToast(`Failed to load content: ${err.message}`, 'error');
                    if(panelToShow instanceof HTMLElement) {
                         panelToShow.innerHTML = '<p style="color: var(--negative-color);">Error loading content.</p>';
                    }
                }
            }
        });
    } else {
        console.warn("Could not find research page container or research sub-tabs container for event listener setup.");
    }
}

// NOTE: initializeJournalSubTabHandlers (for nested tabs in Paper Trading)
// should remain in this file or potentially move to a _journal_tabs.js file
// if it becomes complex, but it's fine here for now.
/**
 * Initializes the event listeners for switching between sub-tabs within the Paper Trading panel.
 * @returns {void}
 */
export function initializeJournalSubTabHandlers() {
    // This listener needs to be attached *after* the paper trading panel content is loaded.
    // We'll attach it within loadResearchPage when the paper trading tab is selected,
    // OR potentially delegate from the researchPageContainer if structure allows.
    // For now, let's keep the function definition here.

    // Get the container dynamically when needed, or use event delegation
    const paperTradingPanel = document.getElementById('research-paper-trading-panel');
    const journalSubTabsContainer = paperTradingPanel?.querySelector('.journal-sub-tabs'); // Target nested tabs

    if (journalSubTabsContainer && paperTradingPanel) {
        // Simple click handler for switching nested tabs
        journalSubTabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                const subTabName = target.dataset.subTab;
                if (!subTabName) return;

                journalSubTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                paperTradingPanel.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                target.classList.add('active');
                const panelToShow = paperTradingPanel.querySelector(`#${subTabName}`);
                if (panelToShow instanceof HTMLElement) {
                    panelToShow.classList.add('active');
                }
            }
        });
    } else {
        // This might log during initial setup before paper trading tab is loaded, which is okay
        // console.warn("Could not find paper trading panel or nested journal sub-tabs container for event listener setup (might be expected during init).");
    }
}