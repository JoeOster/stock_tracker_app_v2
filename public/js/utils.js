/**
 * @file Utility functions for the application.
 * @module utils
 */

/**
 * Initializes sub-tab functionality for elements with the 'sub-tabs' class.
 * This function should be called after new content containing sub-tabs is loaded into the DOM.
 * It handles switching between sub-tabs and displaying the corresponding content panels.
 * @returns {void}
 */
export function initializeSubTabs() {
  document.querySelectorAll('.sub-tabs').forEach((subTabsContainer) => {
    const subTabButtons = subTabsContainer.querySelectorAll('.sub-tab');
    subTabButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        const clickedButton = /** @type {HTMLElement} */ (event.target);
        const targetTabId = clickedButton.dataset.tab;

        // Deactivate all sibling buttons
        subTabButtons.forEach((btn) => btn.classList.remove('active'));
        // Activate the clicked button
        clickedButton.classList.add('active');

        // Find the corresponding sub-tab-content area
        const subTabContent = clickedButton.closest('.sub-tabs')?.nextElementSibling;

        if (subTabContent && targetTabId) {
          // Hide all panels in this content area
          subTabContent.querySelectorAll('.sub-tab-panel').forEach((panel) => {
            /** @type {HTMLElement} */ (panel).style.display = 'none';
          });

          // Show the target panel
          const targetPanel = subTabContent.querySelector(`#${targetTabId}`);
          if (targetPanel) {
            /** @type {HTMLElement} */ (targetPanel).style.display = 'block';
          }
        }
      });
    });

    // Ensure one tab is active and its content is shown on initialization
    const activeTab = subTabsContainer.querySelector('.sub-tab.active');
    if (activeTab) {
      /** @type {HTMLElement} */ (activeTab).click();
    } else if (subTabButtons.length > 0) {
      // If no active tab is explicitly set, activate the first one
      /** @type {HTMLElement} */ (subTabButtons[0]).click();
    }
  });
}
