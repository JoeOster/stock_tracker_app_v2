/**
 * @file Initializes event handlers for the Journal page's sub-tabs.
 * @module event-handlers/_journal_tabs
 */

/**
 * Initializes the event listeners for switching between sub-tabs on the Journal page.
 */
export function initializeJournalSubTabHandlers() {
    const journalPageContainer = document.getElementById('journal-page-container');
    const journalSubTabsContainer = journalPageContainer?.querySelector('.journal-sub-tabs');

    // --- Sub-Tab Switching ---
    if (journalSubTabsContainer && journalPageContainer) {
        journalSubTabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                const subTabName = target.dataset.subTab;
                if (!subTabName) return;

                // Remove active class from all tabs and panels within the journal page context
                journalSubTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                journalPageContainer.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                // Add active class to the clicked tab and corresponding panel
                target.classList.add('active');
                const panelToShow = journalPageContainer.querySelector(`#${subTabName}`);
                if (panelToShow) {
                    panelToShow.classList.add('active');
                }
            }
        });
    } else {
        console.warn("Could not find journal page container or sub-tabs container for event listener setup.");
    }
}