import { initializeSubTabs } from '../utils.js';
import { initializeExchanges } from './exchanges.js';
import { initializeHolders } from './holders.js';
import { initializeSources } from './sources.js'; // Import initializeSources

export function initializeDataManagement() {
  const dataSettingsPanel = document.getElementById('data-settings-panel');
  if (dataSettingsPanel) {
    initializeSubTabs(dataSettingsPanel);

    const subTabsContainer = dataSettingsPanel.querySelector('.sub-tabs');
    if (subTabsContainer) {
      subTabsContainer.addEventListener('click', (event) => {
        const tab = event.target.closest('.sub-tab');
        if (tab) {
          const tabId = tab.dataset.subTab;
          switch (tabId) {
            case 'sources-panel': // Add case for sources-panel
              initializeSources();
              break;
            case 'exchanges-panel':
              initializeExchanges();
              break;
            case 'users-panel':
              initializeHolders();
              break;
            // Add cases for other sub-tabs within Data Management if needed
          }
        }
      });
    }
  }
}
