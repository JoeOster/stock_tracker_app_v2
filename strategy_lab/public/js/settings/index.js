import {
  initializeAppearanceSettings,
  saveAppearanceSettings,
} from './appearance.js';
import { initializeGeneralSettings, saveGeneralSettings } from './general.js';
import { initializeDataManagement } from './data-management.js';
import { initializeExchanges } from './exchanges.js';
import { initializeUserManagement } from './user-management.js'; // Assuming user-management.js will handle user management initialization

export function initializeSettings() {
  const settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) {
    console.error('Settings modal not found.');
    return;
  }

  const mainTabsContainer = settingsModal.querySelector('.tabs');
  const mainTabPanels = settingsModal.querySelectorAll('.tab-panel');

  if (mainTabsContainer) {
    mainTabsContainer.addEventListener('click', (event) => {
      const clickedTab = event.target.closest('.tab');
      if (clickedTab) {
        const tabId = clickedTab.dataset.tab;

        // Deactivate all tabs and panels
        mainTabsContainer.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        mainTabPanels.forEach(panel => panel.classList.remove('active'));

        // Activate clicked tab and corresponding panel
        clickedTab.classList.add('active');
        const targetPanel = document.getElementById(tabId);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }

        // Initialize content for the activated tab
        switch (tabId) {
          case 'general-settings-panel':
            initializeGeneralSettings();
            break;
          case 'appearance-settings-panel':
            initializeAppearanceSettings();
            break;
          case 'data-management-settings-panel':
            initializeDataManagement();
            break;
          // Add cases for other main settings tabs if they are added
        }
      }
    });
  }

  // Initialize the currently active tab on load (default to General)
  const activeTab = mainTabsContainer ? mainTabsContainer.querySelector('.tab.active') : null;
  if (activeTab) {
    const tabId = activeTab.dataset.tab;
    switch (tabId) {
      case 'general-settings-panel':
        initializeGeneralSettings();
        break;
      case 'appearance-settings-panel':
        initializeAppearanceSettings();
        break;
      case 'data-management-settings-panel':
        initializeDataManagement();
        break;
    }
  }

  const saveSettingsButton = document.getElementById('save-settings-button');
  if (saveSettingsButton) {
    saveSettingsButton.addEventListener('click', async () => {
      const activePanel = settingsModal.querySelector('.tab-panel.active');

      if (activePanel) {
        switch (activePanel.id) {
          case 'general-settings-panel':
            await saveGeneralSettings();
            break;
          case 'appearance-settings-panel':
            await saveAppearanceSettings();
            break;
          case 'data-management-settings-panel':
            console.warn(
              'Save functionality not yet implemented for Data Management panel.'
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
}
