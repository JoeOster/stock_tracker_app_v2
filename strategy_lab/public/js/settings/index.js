import {
  initializeAppearanceSettings,
  saveAppearanceSettings,
} from './appearance.js';
import { initializeGeneralSettings, saveGeneralSettings } from './general.js';
import { initializeDataManagement } from './data-management.js';
import { initializeExchanges } from './exchanges.js';
import { initializeUserManagement } from './user-management.js'; // Assuming user-management.js will handle user management initialization

export function initializeSettings() {
  // Removed direct calls to initialization functions.
  // They will now be called dynamically when their respective tabs are clicked.

  const saveSettingsButton = document.getElementById('save-settings-button');
  if (saveSettingsButton) {
    saveSettingsButton.addEventListener('click', async () => {
      const settingsPanelContainer = document.querySelector(
        '#settings-page .sub-tab-content'
      );
      const activePanel = settingsPanelContainer.querySelector(
        '.sub-tab-panel.active'
      );

      if (activePanel) {
        switch (activePanel.id) {
          case 'general-settings-panel':
            await saveGeneralSettings();
            break;
          case 'appearance-settings-panel':
            await saveAppearanceSettings();
            break;
          case 'data-settings-panel':
            console.warn(
              'Save functionality not yet implemented for Data Management panel.'
            );
            break;
          case 'user-management-settings-panel':
            console.warn(
              'Save functionality not yet implemented for User Management panel.'
            );
            break;
          // Add cases for other settings panels as they are refactored
          default:
            console.warn(
              'No save function defined for active panel:',
              activePanel.id
            );
            break;
        }
      }
    });
  }

  // Add event listener for top-level tab clicks to initialize sub-tabs dynamically
  const topLevelSubTabsContainer = document.querySelector(
    '#settings-page > .sub-tabs'
  );
  if (topLevelSubTabsContainer) {
    topLevelSubTabsContainer.addEventListener('click', (event) => {
      const tab = event.target.closest('.sub-tab');
      if (tab) {
        const tabId = tab.dataset.tab;
        switch (tabId) {
          case 'appearance-settings-panel':
            initializeAppearanceSettings();
            break;
          case 'general-settings-panel':
            initializeGeneralSettings();
            break;
          case 'data-settings-panel':
            initializeDataManagement();
            break;
          case 'user-management-settings-panel':
            initializeUserManagement(); // Call initializeUserManagement for User Management tab
            break;
        }
      }
    });
  }
}
