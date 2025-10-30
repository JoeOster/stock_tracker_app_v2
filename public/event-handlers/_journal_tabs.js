// /public/event-handlers/_journal_tabs.js
/**
 * @file Initializes event handlers for the Research page's top-level sub-tabs
 * and the nested sub-tabs within the "Paper Trading" panel.
 * @module event-handlers/_journal_tabs
 */

import { showToast } from '../ui/helpers.js';

/**
 * Initializes the event listeners for switching between the main Research sub-tabs
 * (Sources, Paper Trading, Action Plan).
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
                    // Dynamically import from the main research loader
                    const researchModule = await import('./_research.js');
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

/**
 * Initializes the event listeners for switching between sub-tabs *within* the Paper Trading panel
 * (Add Entry, Open Ideas, Closed Ideas).
 * @returns {void}
 */
export function initializeJournalSubTabHandlers() {
    // This listener is attached *after* the paper trading panel content is loaded
    // by loadResearchPage().
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
        // This log is expected if the paper trading tab hasn't been loaded yet.
        // console.warn("Could not find paper trading panel or nested journal sub-tabs container (might be expected during init).");
    }
}