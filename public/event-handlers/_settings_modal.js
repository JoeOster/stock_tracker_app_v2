// public/event-handlers/_settings_modal.js
/**
 * @file Initializes event handlers for the core Settings modal functionality (open, close, save, main tabs, appearance).
 * @module event-handlers/_settings_modal
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { saveSettings, applyAppearanceSettings } from '../ui/settings.js';
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';
import {
  loadExchangeSettings,
  initializeExchangeManagementHandlers,
} from './_settings_exchanges.js';
import {
  loadHolderSettings,
  initializeHolderManagementHandlers,
} from './_settings_holders.js';
import { fetchAllAdviceSourcesForUser } from './_journal_settings.js';
// --- REMOVED: Subscription panel initializer ---

/**
 * Helper function to set the active tab and panel within a tab group.
 * @param {Element} containerElement - The container holding the tab buttons.
 * @param {HTMLElement} clickedTabElement - The specific tab button clicked.
 * @param {Element | null} scopeElement - The element to search for panels within.
 * @param {string} panelSelector - CSS selector for the panels.
 * @param {string} tabAttribute - The data attribute on the tab button (e.g., 'data-tab').
 * @param {string} [panelIdPrefix='#'] - Prefix for the panel ID selector.
 * @param {string} [panelIdSuffix=''] - Suffix for the panel ID selector.
 * @returns {void}
 */
export function setActiveTab(
  containerElement,
  clickedTabElement,
  scopeElement,
  panelSelector,
  tabAttribute,
  panelIdPrefix = '#',
  panelIdSuffix = ''
) {
  // ... (this function remains unchanged) ...
  const tabId = clickedTabElement.getAttribute(tabAttribute);

  if (!tabId) {
    console.error(
      'setActiveTab: Clicked tab is missing the required data attribute:',
      tabAttribute
    );
    return;
  }
  if (!scopeElement) {
    console.error('setActiveTab: Scope element is null.');
    return;
  }

  const tabClass = clickedTabElement.classList[0];
  if (tabClass) {
    containerElement
      .querySelectorAll(`.${tabClass}`)
      .forEach((tab) => tab.classList.remove('active'));
  } else {
    console.warn(
      'setActiveTab: Clicked tab element has no classes to identify siblings.'
    );
  }

  scopeElement
    .querySelectorAll(panelSelector)
    .forEach((panel) => panel.classList.remove('active'));
  clickedTabElement.classList.add('active');

  const panelIdSelector = `${panelIdPrefix}${tabId}${panelIdSuffix}`;
  const panelToShow = scopeElement.querySelector(panelIdSelector);
  if (panelToShow) {
    panelToShow.classList.add('active');
  } else {
    console.error(
      'setActiveTab: Could not find panel with selector:',
      panelIdSelector
    );
  }
}

/**
 * Initializes core event listeners for the Settings modal.
 * @returns {void}
 */
export function initializeSettingsModalHandlers() {
  // ... (variable declarations remain the same) ...
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const saveSettingsBtn = document.getElementById('save-settings-button');
  const themeSelector = /** @type {HTMLSelectElement} */ (
    document.getElementById('theme-selector')
  );
  const fontSelector = /** @type {HTMLSelectElement} */ (
    document.getElementById('font-selector')
  );
  const settingsTabsContainer = settingsModal?.querySelector('.settings-tabs');
  const dataManagementPanel = settingsModal?.querySelector(
    '#data-settings-panel'
  );
  const userManagementPanel = settingsModal?.querySelector(
    '#user-management-settings-panel'
  );

  initializeExchangeManagementHandlers();
  initializeHolderManagementHandlers(); // Call the new handler
  initializeStockSplitFormHandler();

  // --- User Management Sub-Tab Navigation ---
  if (settingsBtn && settingsModal) {
    // ... (click listener remains the same as previous response) ...
    settingsBtn.addEventListener('click', async () => {
      console.log('Settings button clicked - opening modal...');

      if (state.selectedAccountHolderId === 'all') {
        showToast(
          'Please select a specific account holder to manage settings.',
          'error'
        );
        return;
      }

      try {
        showToast('Loading settings data...', 'info', 2000);

        const userSources = await Promise.all([
          loadExchangeSettings(),
          loadHolderSettings(),
          fetchAllAdviceSourcesForUser(state.selectedAccountHolderId),
        ]);

        const takeProfitInput = /** @type {HTMLInputElement} */ (
          document.getElementById('take-profit-percent')
        );
        const stopLossInput = /** @type {HTMLInputElement} */ (
          document.getElementById('stop-loss-percent')
        );
        const cooldownInput = /** @type {HTMLInputElement} */ (
          document.getElementById('notification-cooldown')
        );
        const familyNameInput = /** @type {HTMLInputElement} */ (
          document.getElementById('family-name')
        );
        if (takeProfitInput)
          takeProfitInput.value = String(state.settings.takeProfitPercent || 0);
        if (stopLossInput)
          stopLossInput.value = String(state.settings.stopLossPercent || 0);
        if (cooldownInput)
          cooldownInput.value = String(
            state.settings.notificationCooldown || 16
          );
        if (familyNameInput)
          familyNameInput.value = state.settings.familyName || '';
        const themeSelect = /** @type {HTMLSelectElement} */ (
          document.getElementById('theme-selector')
        );
        const fontSelect = /** @type {HTMLSelectElement} */ (
          document.getElementById('font-selector')
        );
        if (themeSelect) themeSelect.value = state.settings.theme || 'light';
        if (fontSelect) fontSelect.value = state.settings.font || 'Inter';
        const adviceSources = Array.isArray(userSources[2])
          ? userSources[2]
          : [];
        renderAdviceSourceManagementList(adviceSources);

        settingsTabsContainer
          ?.querySelectorAll('.settings-tab')
          .forEach((tab, index) => tab.classList.toggle('active', index === 0));
        settingsModal
          .querySelectorAll('.settings-panel')
          .forEach((panel, index) =>
            panel.classList.toggle('active', index === 0)
          );
        dataManagementPanel
          ?.querySelectorAll('.sub-tab')
          .forEach((tab, index) => tab.classList.toggle('active', index === 0));
        dataManagementPanel
          ?.querySelectorAll('.sub-tab-panel')
          .forEach((panel, index) =>
            panel.classList.toggle('active', index === 0)
          );
        userManagementPanel
          ?.querySelectorAll('.sub-tab')
          .forEach((tab, index) => tab.classList.toggle('active', index === 0));
        userManagementPanel
          ?.querySelectorAll('.sub-tab-panel')
          .forEach((panel, index) =>
            panel.classList.toggle('active', index === 0)
          );

        const subTabBtn = userManagementPanel?.querySelector(
          'button[data-sub-tab="subscriptions-panel"]'
        );
        if (subTabBtn) {
          /** @type {HTMLElement} */ (subTabBtn).style.display = 'none';
        }

        const subPanelTitle = document.getElementById(
          'subscriptions-panel-title'
        );
        const subPanelList = document.getElementById(
          'subscriptions-panel-list-container'
        );
        if (subPanelTitle)
          subPanelTitle.textContent = 'Manage Subscribed Sources for --';
        if (subPanelList)
          subPanelList.innerHTML =
            "<p>Select a user from the 'Users' tab and click 'Subscriptions' to manage them here.</p>";

        settingsModal.classList.add('visible');
        console.log('Settings modal opened and initialized.');
      } catch (error) {
        console.error('Error opening settings modal:', error);
        // @ts-ignore
        showToast(`Could not load settings data: ${error.message}`, 'error');
      }
    });
  } else {
    console.warn('Settings button or modal element not found.');
  }

  // --- Main Save Button ---
  if (saveSettingsBtn && settingsModal) {
    // --- MODIFICATION: Made listener async and added await ---
    saveSettingsBtn.addEventListener('click', async () => {
      await saveSettings(); // This function now handles default user saving
      settingsModal.classList.remove('visible');
      // saveSettings shows its own toast
    });
    // --- END MODIFICATION ---
  }

  // ... (Appearance, Main Tab, and Data Tab listeners are unchanged) ...
  if (themeSelector)
    themeSelector.addEventListener('change', () => {
      state.settings.theme = themeSelector.value;
      applyAppearanceSettings();
    });
  if (fontSelector)
    fontSelector.addEventListener('change', () => {
      state.settings.font = fontSelector.value;
      applyAppearanceSettings();
    });
  if (settingsTabsContainer && settingsModal) {
    settingsTabsContainer.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (
        target.tagName === 'BUTTON' &&
        target.classList.contains('settings-tab') &&
        !target.classList.contains('active')
      ) {
        setActiveTab(
          settingsTabsContainer,
          target,
          settingsModal,
          '.settings-panel',
          'data-tab',
          '#',
          '-settings-panel'
        );
      }
    });
  } else {
    console.warn(
      'Could not find settings tabs container or settings modal for main tab events.'
    );
  }
  if (dataManagementPanel) {
    const subTabsContainer = dataManagementPanel.querySelector('.sub-tabs');
    if (subTabsContainer) {
      subTabsContainer.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        if (
          target.tagName === 'BUTTON' &&
          target.classList.contains('sub-tab') &&
          !target.classList.contains('active')
        ) {
          setActiveTab(
            subTabsContainer,
            target,
            dataManagementPanel,
            '.sub-tab-panel',
            'data-sub-tab',
            '#'
          );
        }
      });
    } else {
      console.warn(
        'Could not find sub-tabs container within data management panel.'
      );
    }
  } else {
    console.warn('Could not find data management panel for sub-tab events.');
  }

  // --- User Management Sub-Tab Navigation ---
  if (userManagementPanel) {
    // --- REMOVED: initializeSubscriptionPanelHandlers(); ---

    const subTabsContainer = userManagementPanel.querySelector('.sub-tabs');
    if (subTabsContainer) {
      // ... (sub-tab click listener remains the same as previous response) ...
      subTabsContainer.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        if (
          target.tagName === 'BUTTON' &&
          target.classList.contains('sub-tab') &&
          !target.classList.contains('active')
        ) {
          const clickedTabId = target.dataset.subTab;
          if (clickedTabId === 'users-panel') {
            const subTabBtn = userManagementPanel?.querySelector(
              'button[data-sub-tab="subscriptions-panel"]'
            );
            if (subTabBtn) {
              /** @type {HTMLElement} */ (subTabBtn).style.display = 'none';
            }
          }

          setActiveTab(
            subTabsContainer,
            target,
            userManagementPanel,
            '.sub-tab-panel',
            'data-sub-tab',
            '#'
          );

          if (target.dataset.subTab === 'subscriptions-panel') {
            // --- MODIFICATION: Check container for holderId ---
            const container = document.getElementById(
              'subscriptions-panel-list-container'
            );
            if (
              container &&
              !(/** @type {HTMLElement} */ (container).dataset.holderId)
            ) {
              const subPanelTitle = document.getElementById(
                'subscriptions-panel-title'
              );
              const subPanelList = document.getElementById(
                'subscriptions-panel-list-container'
              );
              if (subPanelTitle)
                subPanelTitle.textContent = 'Manage Subscribed Sources for --';
              if (subPanelList)
                subPanelList.innerHTML =
                  "<p>Select a user from the 'Users' tab and click 'Subscriptions' to manage them here.</p>";
            }
            // --- END MODIFICATION ---
          }
        }
      });
    } else {
      console.warn(
        'Could not find sub-tabs container within user management panel.'
      );
    }
  } else {
    console.warn('Could not find user management panel for sub-tab events.');
  }
}

function initializeStockSplitFormHandler() {
  const stockSplitForm = document.getElementById('stock-split-form');
  if (stockSplitForm) {
    stockSplitForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const ticker = /** @type {HTMLInputElement} */ (
        document.getElementById('split-ticker')
      ).value
        .toUpperCase()
        .trim();
      const split_date = /** @type {HTMLInputElement} */ (
        document.getElementById('split-date')
      ).value;
      const split_from = /** @type {HTMLInputElement} */ (
        document.getElementById('split-from')
      ).value;
      const split_to = /** @type {HTMLInputElement} */ (
        document.getElementById('split-to')
      ).value;
      const account_holder_id = /** @type {HTMLSelectElement} */ (
        document.getElementById('split-account-holder')
      ).value;

      if (
        !ticker ||
        !split_date ||
        !split_from ||
        !split_to ||
        !account_holder_id
      ) {
        return showToast(
          'Please fill in all fields for the stock split.',
          'error'
        );
      }

      const splitData = {
        ticker,
        split_date,
        split_from,
        split_to,
        account_holder_id,
      };

      const submitButton = /** @type {HTMLButtonElement} */ (
        stockSplitForm.querySelector('button[type="submit"]')
      );
      submitButton.disabled = true;

      try {
        const response = await fetch('/api/stock-split', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(splitData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Server error');
        }

        showToast('Stock split logged successfully!', 'success');
        stockSplitForm.reset();
      } catch (error) {
        showToast(`Failed to log stock split: ${error.message}`, 'error');
      } finally {
        submitButton.disabled = false;
      }
    });
  }
}
