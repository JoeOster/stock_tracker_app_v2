import { refreshLedger } from '../api/transactions-api.js';
// public/event-handlers/_settings.js
import { state } from '../state.js';
import { showConfirmationModal, showToast } from '../ui/helpers.js';
import {
  applyAppearanceSettings,
  renderAccountHolderManagementList,
  renderExchangeManagementList,
  saveSettings,
} from '../ui/settings.js';
//import { switchView } from '../event-handlers/_navigation.js';
/**
 * Populates all exchange dropdowns on the page with the latest data from the state.
 * @returns {void}
 */
function populateAllExchangeDropdowns() {
  const exchangeSelects = document.querySelectorAll('select[id*="exchange"]');
  exchangeSelects.forEach(
    /** @param {HTMLSelectElement} select */ (select) => {
      const currentVal = select.value;
      select.innerHTML = '';
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select Exchange';
      defaultOption.disabled = true;
      select.appendChild(defaultOption);
      state.allExchanges.forEach((ex) => {
        const option = document.createElement('option');
        option.value = ex.name;
        option.textContent = ex.name;
        select.appendChild(option);
      });
      select.value = currentVal;
    }
  );
}

/**
 * Fetches the list of exchanges and populates all relevant dropdowns.
 * @returns {Promise<void>}
 */
export async function fetchAndRenderExchanges() {
  try {
    const response = await fetch('/api/accounts/exchanges');
    state.allExchanges = await response.json();
    populateAllExchangeDropdowns();
  } catch {
    showToast('Could not load exchanges.', 'error');
  }
}

/**
 * Fetches the list of account holders and populates all relevant dropdowns.
 * @returns {Promise<void>}
 */
export async function fetchAndPopulateAccountHolders() {
  try {
    const response = await fetch('/api/accounts/holders');
    state.allAccountHolders = await response.json();

    const holderSelects = document.querySelectorAll('.account-holder-select');
    holderSelects.forEach(
      /** @param {HTMLSelectElement} select */ (select) => {
        select.innerHTML = '';

        if (select.id === 'global-account-holder-filter') {
          const allOption = document.createElement('option');
          allOption.value = 'all';
          allOption.textContent = 'All Accounts';
          select.appendChild(allOption);
        } else {
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = 'Select Holder';
          defaultOption.disabled = true;
          select.appendChild(defaultOption);
        }

        state.allAccountHolders.forEach((holder) => {
          const option = document.createElement('option');
          option.value = holder.id;
          option.textContent = holder.name;
          select.appendChild(option);
        });
      }
    );
  } catch {
    showToast('Could not load account holders.', 'error');
  }
}

/**
 * Initializes all event listeners within the Settings modal.
 * This includes opening/saving the modal, tab navigation, and full CRUD
 * functionality for managing Exchanges and Account Holders.
 * @returns {void}
 */
export function initializeSettingsHandlers() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const saveSettingsBtn = document.getElementById('save-settings-button');
  const themeSelector = /** @type {HTMLSelectElement} */ (
    document.getElementById('theme-selector')
  );
  const fontSelector = /** @type {HTMLSelectElement} */ (
    document.getElementById('font-selector')
  );
  const exchangeList = document.getElementById('exchange-list');
  const addExchangeBtn = document.getElementById('add-exchange-btn');
  const newExchangeNameInput = /** @type {HTMLInputElement} */ (
    document.getElementById('new-exchange-name')
  );
  const accountHolderList = document.getElementById('account-holder-list');
  const addAccountHolderBtn = document.getElementById('add-account-holder-btn');
  const newAccountHolderNameInput = /** @type {HTMLInputElement} */ (
    document.getElementById('new-account-holder-name')
  );
  const settingsTabsContainer = document.querySelector('.settings-tabs');

  // --- Settings Modal Opening/Saving ---
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // Re-render management lists each time the modal is opened to ensure data is fresh.
      renderExchangeManagementList();
      renderAccountHolderManagementList();
      settingsModal.classList.add('visible');
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      saveSettings();
      settingsModal.classList.remove('visible');
    });
  }

  // --- Live Appearance Updates ---
  if (themeSelector) {
    themeSelector.addEventListener('change', () => {
      state.settings.theme = themeSelector.value;
      applyAppearanceSettings();
    });
  }

  if (fontSelector) {
    fontSelector.addEventListener('change', () => {
      state.settings.font = fontSelector.value;
      applyAppearanceSettings();
    });
  }

  // --- Settings Modal Tab Navigation ---
  if (settingsTabsContainer) {
    settingsTabsContainer.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.classList.contains('settings-tab')) {
        const tabName = target.dataset.tab;

        // Update active tab styles
        document
          .querySelectorAll('.settings-tab')
          .forEach((tab) => tab.classList.remove('active'));
        target.classList.add('active');

        // Show the corresponding content panel
        document
          .querySelectorAll('.settings-panel')
          .forEach((panel) => panel.classList.remove('active'));
        document
          .getElementById(`${tabName}-settings-panel`)
          .classList.add('active');
      }
    });
  }

  // --- Exchange Management ---
  if (addExchangeBtn) {
    addExchangeBtn.addEventListener('click', async () => {
      const name = newExchangeNameInput.value.trim();
      if (!name) return showToast('Exchange name cannot be empty.', 'error');
      try {
        const res = await fetch('/api/accounts/exchanges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message);
        }
        await fetchAndRenderExchanges();
        newExchangeNameInput.value = '';
        renderExchangeManagementList();
        showToast('Exchange added!', 'success');
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
  }

  if (exchangeList) {
    exchangeList.addEventListener('click', async (e) => {
      const li = /** @type {HTMLElement} */ (e.target).closest('li');
      if (!li) return;

      // Get all interactive elements within the list item
      const nameSpan = /** @type {HTMLElement} */ (
        li.querySelector('.exchange-name')
      );
      const nameInput = /** @type {HTMLInputElement} */ (
        li.querySelector('.edit-exchange-input')
      );
      const editBtn = /** @type {HTMLElement} */ (
        li.querySelector('.edit-exchange-btn')
      );
      const saveBtn = /** @type {HTMLElement} */ (
        li.querySelector('.save-exchange-btn')
      );
      const cancelBtn = /** @type {HTMLElement} */ (
        li.querySelector('.cancel-exchange-btn')
      );
      const deleteBtn = /** @type {HTMLElement} */ (
        li.querySelector('.delete-exchange-btn')
      );

      if (e.target === editBtn) {
        // Switch to edit mode
        nameSpan.style.display = 'none';
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        nameInput.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        nameInput.focus();
      } else if (e.target === cancelBtn) {
        // Cancel edit mode
        nameInput.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        nameSpan.style.display = 'inline-block';
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        nameInput.value = nameSpan.textContent;
      } else if (e.target === saveBtn) {
        // Save the updated exchange name
        const id = li.dataset.id;
        const newName = nameInput.value.trim();
        if (!newName)
          return showToast('Exchange name cannot be empty.', 'error');
        try {
          const res = await fetch(`/api/accounts/exchanges/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message);
          }
          await fetchAndRenderExchanges(); // Refresh dropdowns app-wide
          await refreshLedger(); // Refresh ledger to show new name
          renderExchangeManagementList(); // Re-render the settings list
          showToast('Exchange updated!', 'success');
        } catch (error) {
          showToast(`Error: ${error.message}`, 'error');
        }
      } else if (e.target === deleteBtn) {
        // Delete the exchange
        const id = li.dataset.id;
        showConfirmationModal(
          'Delete Exchange?',
          'This cannot be undone.',
          async () => {
            try {
              const res = await fetch(`/api/accounts/exchanges/${id}`, {
                method: 'DELETE',
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
              }
              await fetchAndRenderExchanges();
              renderExchangeManagementList();
              showToast('Exchange deleted.', 'success');
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          }
        );
      }
    });
  }

  // --- Account Holder Management ---
  if (addAccountHolderBtn) {
    addAccountHolderBtn.addEventListener('click', async () => {
      const name = newAccountHolderNameInput.value.trim();
      if (!name)
        return showToast('Account holder name cannot be empty.', 'error');
      try {
        const res = await fetch('/api/accounts/holders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message);
        }
        await fetchAndPopulateAccountHolders();
        newAccountHolderNameInput.value = '';
        renderAccountHolderManagementList();
        showToast('Account holder added!', 'success');
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
  }

  if (accountHolderList) {
    accountHolderList.addEventListener('click', async (e) => {
      const li = /** @type {HTMLElement} */ (e.target).closest('li');
      if (!li) return;

      const nameSpan = /** @type {HTMLElement} */ (
        li.querySelector('.holder-name')
      );
      const nameInput = /** @type {HTMLInputElement} */ (
        li.querySelector('.edit-holder-input')
      );
      const editBtn = /** @type {HTMLElement} */ (
        li.querySelector('.edit-holder-btn')
      );
      const saveBtn = /** @type {HTMLElement} */ (
        li.querySelector('.save-holder-btn')
      );
      const cancelBtn = /** @type {HTMLElement} */ (
        li.querySelector('.cancel-holder-btn')
      );

      if (/** @type {Element} */ (e.target).matches('.edit-holder-btn')) {
        // Switch to edit mode
        nameSpan.style.display = 'none';
        editBtn.style.display = 'none';
        nameInput.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        nameInput.focus();
      } else if (
        /** @type {Element} */ (e.target).matches('.cancel-holder-btn')
      ) {
        // Cancel edit mode
        nameInput.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        nameSpan.style.display = 'inline-block';
        editBtn.style.display = 'inline-block';
        nameInput.value = nameSpan.textContent;
      } else if (
        /** @type {Element} */ (e.target).matches('.save-holder-btn')
      ) {
        // Save the updated holder name
        const id = li.dataset.id;
        const newName = nameInput.value.trim();
        if (!newName) return showToast('Name cannot be empty.', 'error');
        try {
          const res = await fetch(`/api/accounts/holders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message);
          }
          await fetchAndPopulateAccountHolders(); // Refresh dropdowns app-wide
          renderAccountHolderManagementList(); // Re-render the settings list
          showToast('Account holder updated!', 'success');
        } catch (error) {
          showToast(`Error: ${error.message}`, 'error');
        }
      } else if (
        /** @type {Element} */ (e.target).matches('.delete-holder-btn')
      ) {
        // Delete the account holder
        const id = li.dataset.id;
        showConfirmationModal(
          'Delete Account Holder?',
          'This cannot be undone.',
          async () => {
            try {
              const res = await fetch(`/api/accounts/holders/${id}`, {
                method: 'DELETE',
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
              }
              await fetchAndPopulateAccountHolders();
              renderAccountHolderManagementList();
              showToast('Account holder deleted.', 'success');
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          }
        );
      }
    });
  }
}
