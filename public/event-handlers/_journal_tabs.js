// /public/event-handlers/_journal_tabs.js
// Version Updated (Handle dynamic import correctly)
/**
 * @file Initializes event handlers for the Journal page's sub-tabs.
 * @module event-handlers/_journal_tabs
 */

// Static import for showToast (needed for error handling)
import { showToast } from '../ui/helpers.js';

/**
 * Initializes the event listeners for switching between the main Research sub-tabs.
 * @returns {void}
 */
export function initializeResearchSubTabHandlers() {
    const researchPageContainer = document.getElementById('research-page-container');
    const researchSubTabsContainer = researchPageContainer?.querySelector('.research-sub-tabs');

    // --- Main Research Sub-Tab Switching ---
    if (researchSubTabsContainer && researchPageContainer) {
        researchSubTabsContainer.addEventListener('click', async (e) => { // Make async to handle dynamic import
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                const subTabName = target.dataset.subTab;
                if (!subTabName) return;

                // Remove active class from all tabs and panels within the research page context
                researchSubTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                researchPageContainer.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                // Add active class to the clicked tab and corresponding panel
                target.classList.add('active');
                const panelToShow = researchPageContainer.querySelector(`#${subTabName}`);
                if (panelToShow) {
                    /** @type {HTMLElement} */ (panelToShow).classList.add('active'); // Cast to HTMLElement
                }

                // Reload content for the newly activated tab
                try {
                    // Dynamically import _research.js ONLY when needed to call loadResearchPage
                    const researchModule = await import('./_research.js');
                    // --- FIX: Access loadResearchPage via default ---
                    if (researchModule.default && typeof researchModule.default.loadResearchPage === 'function') {
                        // Handle potential { default: { loadResearchPage: ... } } structure
                        await researchModule.default.loadResearchPage();
                    } else if (typeof researchModule.loadResearchPage === 'function') {
                         // Handle direct named export structure
                        await researchModule.loadResearchPage();
                    } else {
                         throw new Error("loadResearchPage function not found in imported module.");
                    }
                    // --- END FIX ---
                } catch (error) {
                    console.error("Error reloading research page content:", error);
                    showToast(`Failed to load content: ${error.message}`, 'error');
                    // Optionally clear the panel or show an error message inside it
                    if(panelToShow) {
                         /** @type {HTMLElement} */ (panelToShow).innerHTML = '<p style="color: var(--negative-color);">Error loading content.</p>';
                    }
                }
            }
        });
    } else {
        console.warn("Could not find research page container or research sub-tabs container for event listener setup.");
    }
}


/**
 * Initializes the event listeners for switching between sub-tabs within the Paper Trading panel.
 * @returns {void}
 */
export function initializeJournalSubTabHandlers() {
    // This function now handles the *nested* tabs within the Paper Trading panel
    const paperTradingPanel = document.getElementById('research-paper-trading-panel');
    const journalSubTabsContainer = paperTradingPanel?.querySelector('.journal-sub-tabs'); // Target nested tabs

    // --- Nested Journal Sub-Tab Switching ---
    if (journalSubTabsContainer && paperTradingPanel) { // Check parent panel exists
        journalSubTabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                const subTabName = target.dataset.subTab;
                if (!subTabName) return;

                // Remove active class from all tabs and panels within the paper trading panel context
                journalSubTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                paperTradingPanel.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                // Add active class to the clicked tab and corresponding panel
                target.classList.add('active');
                const panelToShow = paperTradingPanel.querySelector(`#${subTabName}`); // Find panel within paperTradingPanel
                if (panelToShow) {
                    /** @type {HTMLElement} */ (panelToShow).classList.add('active');
                }
            }
        });
    } else {
        // This might log during initial setup before paper trading tab is loaded, which is okay
        console.warn("Could not find paper trading panel or nested journal sub-tabs container for event listener setup.");
    }
}

