// public/ui/settings.js
/**
 * @file Contains all UI functions and event handlers related to the settings modal.
 * @module ui/settings
 */

import { state, updateState } from '../state.js';
import { switchView } from '../event-handlers/_navigation.js';
import { saveSubscriptions } from '../event-handlers/_modal_manage_subscriptions.js';
import { showToast } from './helpers.js';
import { saveExchangeChange } from '../event-handlers/_settings_exchanges.js';
import { saveHolderChange } from '../event-handlers/_settings_holders.js';

// --- END IMPORTS ---

// ---
// --- Main Settings Logic (from settings.js)
// ---

/**
 * Finds all inline items in edit mode and attempts to save them.
 * @returns {Promise<void>}
 * @throws {Error} If any save fails
 */
async function commitPendingEdits() {
  const savePromises = [];
  const pendingHolderSaves = document.querySelectorAll(
    '#account-holder-list .save-holder-btn'
  );
  pendingHolderSaves.forEach((btn) => {
    if (/** @type {HTMLElement} */ (btn).style.display !== 'none') {
      const li = /** @type {HTMLLIElement} */ (btn).closest('li');
      if (li) {
        console.log(
          `[SaveSettings] Found pending edit for holder: ${li.dataset.id}`
        );
        savePromises.push(saveHolderChange(li));
      }
    }
  });

  const pendingExchangeSaves = document.querySelectorAll(
    '#exchange-list .save-exchange-btn'
  );
  pendingExchangeSaves.forEach((btn) => {
    if (/** @type {HTMLElement} */ (btn).style.display !== 'none') {
      const li = /** @type {HTMLLIElement} */ (btn).closest('li');
      if (li) {
        console.log(
          `[SaveSettings] Found pending edit for exchange: ${li.dataset.id}`
        );
        savePromises.push(saveExchangeChange(li));
      }
    }
  });

  if (savePromises.length > 0) {
    console.log(
      `[SaveSettings] Awaiting ${savePromises.length} pending inline saves...`
    );
    await Promise.all(savePromises);
    console.log('[SaveSettings] All pending inline saves completed.');
  }
}

/**
 * Saves the current general settings from the UI to localStorage and applies them.
 * @returns {Promise<void>}
 */
export async function saveSettings() {
  try {
    await commitPendingEdits();
    await saveSubscriptions();
  } catch (_) {
    console.error(
      `[SaveSettings] Failed to save pending edits or subscriptions: ${_.message}`
    );
    return Promise.reject(_); // STOP execution
  }

  const oldTheme = state.settings.theme;
  const newSettings = {
    ...state.settings,
    takeProfitPercent:
      parseFloat(
        /** @type {HTMLInputElement} */ (
          document.getElementById('take-profit-percent')
        ).value
      ) || 0,
    stopLossPercent:
      parseFloat(
        /** @type {HTMLInputElement} */ (
          document.getElementById('stop-loss-percent')
        ).value
      ) || 0,
    theme: /** @type {HTMLSelectElement} */ (
      document.getElementById('theme-selector')
    ).value,
    font: /** @type {HTMLSelectElement} */ (
      document.getElementById('font-selector')
    ).value,
    notificationCooldown:
      parseInt(
        /** @type {HTMLInputElement} */ (
          document.getElementById('notification-cooldown')
        ).value,
        10
      ) || 16,
    familyName: /** @type {HTMLInputElement} */ (
      document.getElementById('family-name')
    ).value.trim(),
  };

  const selectedDefaultHolder = /** @type {HTMLInputElement} */ (
    document.querySelector('input[name="default-holder-radio"]:checked')
  );
  if (selectedDefaultHolder) {
    newSettings.defaultAccountHolderId = selectedDefaultHolder.value;
  } else {
    newSettings.defaultAccountHolderId =
      state.settings.defaultAccountHolderId || 1;
  }

  updateState({ settings: newSettings });
  localStorage.setItem('stockTrackerSettings', JSON.stringify(state.settings));
  applyAppearanceSettings();
  showToast('Settings saved!', 'success');
  if (
    state.settings.theme !== oldTheme &&
    state.currentView.type === 'charts'
  ) {
    switchView('charts', null);
  }
}

/**
 * Applies the theme and font settings to the document body and page title.
 * @returns {void}
 */
export function applyAppearanceSettings() {
  document.body.dataset.theme = state.settings.theme;
  const fontToUse = state.settings.font || 'Inter';
  const fontVar =
    fontToUse === 'System'
      ? 'var(--font-system)'
      : `var(--font-${fontToUse.toLowerCase().replace(' ', '-')})`;
  document.body.style.setProperty('--font-family-base', fontVar);
  const appTitle = document.getElementById('app-title');
  const baseTitle = state.settings.familyName
    ? `${state.settings.familyName} Portfolio Tracker`
    : 'Portfolio Tracker';
  if (appTitle) {
    appTitle.textContent = baseTitle;
  }
  let pageTitle = baseTitle;
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    pageTitle = `[DEV] ${baseTitle}`;
    document.body.classList.add('env-development');
  } else {
    document.body.classList.remove('env-development');
  }
  document.title = pageTitle;
}
