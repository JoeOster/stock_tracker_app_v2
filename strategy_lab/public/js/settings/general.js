import { authenticatedFetch } from '../../app-main.js';

export function initializeGeneralSettings() {
  const generalSettingsForm = document.getElementById('general-settings-form');
  const saveGeneralSettingsBtn = document.getElementById(
    'save-settings-button'
  );

  const familyNameInput = document.getElementById('family-name');
  const notificationCooldownInput = document.getElementById(
    'notification-cooldown'
  );
  const takeProfitPercentInput = document.getElementById('take-profit-percent');
  const stopLossPercentInput = document.getElementById('stop-loss-percent');

  async function fetchGeneralSettings() {
    try {
      const response = await authenticatedFetch('/api/settings');
      const settings = await response.json();

      if (settings) {
        familyNameInput.value = settings.family_name || '';
        notificationCooldownInput.value = settings.notification_cooldown || '';
        takeProfitPercentInput.value = settings.take_profit_percent || '';
        stopLossPercentInput.value = settings.stop_loss_percent || '';
      }
    } catch (error) {
      console.error('Error fetching general settings:', error);
    }
  }

export async function saveGeneralSettings() {
    const familyNameInput = document.getElementById('family-name');
    const notificationCooldownInput = document.getElementById(
      'notification-cooldown'
    );
    const takeProfitPercentInput = document.getElementById(
      'take-profit-percent'
    );
    const stopLossPercentInput = document.getElementById('stop-loss-percent');

    const settingsData = {
      familyName: familyNameInput.value,
      notificationCooldown: parseInt(notificationCooldownInput.value, 10),
      takeProfitPercent: parseFloat(takeProfitPercentInput.value),
      stopLossPercent: parseFloat(stopLossPercentInput.value),
    };

    try {
      const response = await authenticatedFetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (response.ok) {
        console.log('General settings saved successfully!');
        // Optionally, show a success message to the user
      } else {
        console.error('Failed to save general settings:', response.statusText);
        // Optionally, show an error message to the user
      }
    } catch (error) {
      console.error('Error saving general settings:', error);
    }
  }

  if (generalSettingsForm) {
    // Removed event listener for form submit
  }
  if (saveGeneralSettingsBtn) {
    // Removed event listener for save button click
  }

  fetchGeneralSettings();
}
