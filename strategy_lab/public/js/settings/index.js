import { initializeAppearanceSettings } from './appearance.js';
import { initializeUserManagement } from './user-management.js';
import { authenticatedFetch } from '../../app-main.js';

export function initializeSettings() {
  initializeAppearanceSettings();
  initializeUserManagement();

  const saveButton = document.getElementById('save-settings-button');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        const themeSelector = document.getElementById('theme-selector');
        const fontSelector = document.getElementById('font-selector');

        const settings = {
          theme: themeSelector.value,
          font: fontSelector.value,
        };

        const response = await authenticatedFetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          throw new Error('Failed to save settings.');
        }

        // We can show a success message to the user.
        // For now, we just log it to the console.
        console.log('Settings saved successfully.');
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    });
  }
}
