// public/ui/settings.js
/**
 * @file Contains all UI functions and event handlers related to the settings modal.
 * @module ui/settings
 */

// --- IMPORTS (FIX) ---
// Added all missing imports to resolve "Cannot find name" errors
import { state, updateState } from '../state.js';
import { switchView } from '../event-handlers/_navigation.js';
import {
  saveSubscriptions,
  populateSubscriptionPanel,
} from '../event-handlers/_modal_manage_subscriptions.js';
import { showToast, showConfirmationModal } from './helpers.js';
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
import { setActiveTab } from '../event-handlers/_settings_modal.js';
// --- END IMPORTS ---

// ---
// --- Exchange Logic (from _settings_exchanges.js)
// ---

/**
 * Populates all exchange dropdowns on the page.
 */
function populateAllExchangeDropdowns() {
  const exchangeSelects = document.querySelectorAll(
    'select[id*="exchange"], select#snapshot-exchange'
  );
  exchangeSelects.forEach(
    /** @param {HTMLSelectElement} select */ (select) => {
      const currentVal = select.value; // Store current value before clearing
      select.innerHTML = ''; // Clear existing options

      // Add "All Exchanges" option for filter dropdowns
      if (select.id.includes('filter')) {
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Exchanges';
        select.appendChild(allOption);
      } else {
        // Add default disabled option for forms
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Exchange';
        defaultOption.disabled = true;
        select.appendChild(defaultOption);
      }

      let otherOption = null;
      const sortedExchanges = Array.isArray(state.allExchanges)
        ? [...state.allExchanges]
            .filter(
              /** @param {any} ex */ (ex) => {
                // Filter out 'Other' temporarily
                if (ex.name.toLowerCase() === 'other') {
                  otherOption = ex;
                  return false;
                }
                return true;
              }
            )
            .sort((/** @type {any} */ a, /** @type {any} */ b) =>
              a.name.localeCompare(b.name)
            ) // Sort the rest alphabetically
        : [];

      // Add sorted exchanges
      sortedExchanges.forEach((ex) => {
        const option = document.createElement('option');
        // @ts-ignore
        option.value = ex.name;
        // @ts-ignore
        option.textContent = ex.name;
        select.appendChild(option);
      });

      // Add 'Other' option at the end if it exists
      if (otherOption) {
        const option = document.createElement('option');
        // @ts-ignore
        option.value = otherOption.name;
        // @ts-ignore
        option.textContent = otherOption.name;
        select.appendChild(option);
      }

      // Try to restore the previously selected value
      if (select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
      } else {
        // If previous value not found (e.g., deleted), select the first option (which is now either "All" or "Select")
        select.selectedIndex = 0;
      }
    }
  );
}

/**
 * Fetches exchanges, stores in state, and populates dropdowns.
 * @async
 * @returns {Promise<void>}
 */
export async function fetchAndRenderExchanges() {
  try {
    const response = await fetch('/api/accounts/exchanges');
    const exchanges = await handleResponse(response);
    updateState({ allExchanges: exchanges }); // Update state
    populateAllExchangeDropdowns(); // Update dropdowns everywhere using the new sorted logic
  } catch (error) {
    // @ts-ignore
    showToast(`Could not load exchanges: ${error.message}`, 'error');
    updateState({ allExchanges: [] });
  }
}

/**
 * Renders the list of exchanges in the settings modal for management.
 * @returns {void}
 */
export function renderExchangeManagementList() {
  const list = document.getElementById('exchange-list');
  if (!list) return;
  list.innerHTML = '';
  if (!state.allExchanges || state.allExchanges.length === 0) {
    list.innerHTML = '<li>No exchanges defined yet.</li>';
    return;
  }
  const sortedExchanges = [...state.allExchanges].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  sortedExchanges.forEach((exchange) => {
    const li = document.createElement('li');
    li.dataset.id = String(exchange.id);
    const escapeHTML = (str) =>
      str
        ? String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
        : '';
    const escapedName = escapeHTML(exchange.name);
    li.innerHTML = `
            <span class="exchange-name">${escapedName}</span>
            <input type="text" class="edit-exchange-input" value="${escapedName}" style="display: none;">
            <div>
                <button type="button" class="edit-exchange-btn" data-id="${exchange.id}">Edit</button>
                <button type="button" class="save-exchange-btn" data-id="${exchange.id}" style="display: none;">Save</button>
                <button type="button" class="cancel-exchange-btn cancel-btn" data-id="${exchange.id}" style="display: none;">Cancel</button>
                <button type="button" class="delete-exchange-btn delete-btn" data-id="${exchange.id}">Delete</button>
            </div>
        `;
    list.appendChild(li);
  });
}

/**
 * Saves the changes for a specific exchange list item in edit mode.
 * @param {HTMLLIElement} li - The <li> element for the exchange.
 * @returns {Promise<void>}
 * @throws {Error} If save fails
 */
export async function saveExchangeChange(li) {
  const id = li.dataset.id;
  if (!id) throw new Error('Missing ID on list item.');

  const nameSpan = /** @type {HTMLElement | null} */ (
    li.querySelector('.exchange-name')
  );
  const nameInput = /** @type {HTMLInputElement | null} */ (
    li.querySelector('.edit-exchange-input')
  );
  const saveBtn = /** @type {HTMLButtonElement | null} */ (
    li.querySelector('.save-exchange-btn')
  );

  if (!nameSpan || !nameInput || !saveBtn) {
    throw new Error('Could not find all required elements for saving.');
  }

  const newName = nameInput.value.trim();
  if (!newName) {
    showToast('Exchange name cannot be empty.', 'error');
    throw new Error('Exchange name cannot be empty.');
  }
  if (newName.toLowerCase() === nameSpan.textContent?.toLowerCase()) {
    const cancelBtn = /** @type {HTMLButtonElement | null} */ (
      li.querySelector('.cancel-exchange-btn')
    );
    if (cancelBtn) cancelBtn.click();
    return;
  }
  // @ts-ignore
  if (
    state.allExchanges.some(
      (ex) =>
        String(ex.id) !== id && ex.name.toLowerCase() === newName.toLowerCase()
    )
  ) {
    showToast(`Another exchange named "${newName}" already exists.`, 'error');
    throw new Error(`Another exchange named "${newName}" already exists.`);
  }

  saveBtn.disabled = true;
  try {
    const res = await fetch(`/api/accounts/exchanges/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    await handleResponse(res);
    await fetchAndRenderExchanges();
    renderExchangeManagementList(); // <-- FIX: Function is now defined above
    showToast('Exchange updated!', 'success');
    await refreshLedger();
  } catch (error) {
    // @ts-ignore
    showToast(`Error updating exchange: ${error.message}`, 'error');
    throw error;
  } finally {
    const currentSaveBtn = document.querySelector(
      `.save-exchange-btn[data-id="${id}"]`
    );
    if (currentSaveBtn) {
      /** @type {HTMLButtonElement} */ (currentSaveBtn).disabled = false;
    }
  }
}

/**
 * Initializes event listeners for Exchange Management.
 * @returns {void}
 */
export function initializeExchangeManagementHandlers() {
  const exchangeList = document.getElementById('exchange-list');
  const addExchangeBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('add-exchange-btn')
  );
  const newExchangeNameInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('new-exchange-name')
  );

  if (addExchangeBtn && newExchangeNameInput) {
    addExchangeBtn.addEventListener('click', async () => {
      const name = newExchangeNameInput.value.trim();
      if (!name) return showToast('Exchange name cannot be empty.', 'error');
      // @ts-ignore
      if (
        state.allExchanges.some(
          (ex) => ex.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        return showToast(`Exchange "${name}" already exists.`, 'error');
      }
      addExchangeBtn.disabled = true;
      try {
        const res = await fetch('/api/accounts/exchanges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        await handleResponse(res);
        await fetchAndRenderExchanges();
        newExchangeNameInput.value = '';
        renderExchangeManagementList(); // <-- FIX: Function is now defined above
        showToast('Exchange added!', 'success');
      } catch (error) {
        // @ts-ignore
        showToast(`Error adding exchange: ${error.message}`, 'error');
      } finally {
        addExchangeBtn.disabled = false;
      }
    });
  }

  if (exchangeList) {
    exchangeList.addEventListener('click', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const li = /** @type {HTMLLIElement | null} */ (
        target.closest('li[data-id]')
      );
      if (!li) return;
      const id = li.dataset.id;
      if (!id) return;
      const nameSpan = /** @type {HTMLElement | null} */ (
        li.querySelector('.exchange-name')
      );
      const nameInput = /** @type {HTMLInputElement | null} */ (
        li.querySelector('.edit-exchange-input')
      );
      const editBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.edit-exchange-btn')
      );
      const saveBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.save-exchange-btn')
      );
      const cancelBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.cancel-exchange-btn')
      );
      const deleteBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.delete-exchange-btn')
      );
      if (
        !nameSpan ||
        !nameInput ||
        !editBtn ||
        !saveBtn ||
        !cancelBtn ||
        !deleteBtn
      ) {
        console.error(
          'Could not find all necessary elements within the exchange list item.'
        );
        return;
      }
      if (target === editBtn) {
        nameSpan.style.display = 'none';
        nameInput.style.display = '';
        nameInput.focus();
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        saveBtn.style.display = '';
        cancelBtn.style.display = '';
      } else if (target === cancelBtn) {
        nameInput.value = nameSpan.textContent || '';
        nameSpan.style.display = '';
        nameInput.style.display = 'none';
        editBtn.style.display = '';
        deleteBtn.style.display = '';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
      } else if (target === saveBtn) {
        try {
          await saveExchangeChange(li);
        } catch (error) {
          console.log(
            'Inline save failed, error was already shown by saveExchangeChange.'
          );
        }
      } else if (target === deleteBtn) {
        const exchangeName = nameSpan.textContent;
        showConfirmationModal(
          `Delete Exchange "${exchangeName}"?`,
          'This cannot be undone and will fail if the exchange is currently used by any transactions.',
          async () => {
            try {
              const res = await fetch(`/api/accounts/exchanges/${id}`, {
                method: 'DELETE',
              });
              await handleResponse(res);
              await fetchAndRenderExchanges();
              renderExchangeManagementList();
              showToast('Exchange deleted.', 'success');
            } catch (error) {
              // @ts-ignore
              showToast(`Error deleting exchange: ${error.message}`, 'error');
            }
          }
        );
      }
    });
  } else {
    console.warn(
      'Exchange list element (#exchange-list) not found for event listener setup.'
    );
  }
}

// ---
// --- Account Holder Logic (from _settings_holders.js)
// ---

/**
 * Populates all account holder dropdowns on the page.
 * @returns {void}
 */
function populateAllAccountHolderDropdowns() {
  const holderSelects = document.querySelectorAll('.account-holder-select');
  holderSelects.forEach(
    /** @param {HTMLSelectElement} select */ (select) => {
      const currentVal = select.value;
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
        defaultOption.selected = true;
        select.appendChild(defaultOption);
      }

      const sortedHolders = Array.isArray(state.allAccountHolders)
        ? [...state.allAccountHolders].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        : [];

      sortedHolders.forEach((holder) => {
        const option = document.createElement('option');
        option.value = String(holder.id);
        option.textContent = holder.name;
        select.appendChild(option);
      });

      if (select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
      } else if (select.id === 'global-account-holder-filter') {
        select.value = 'all';
      } else {
        select.selectedIndex = select.options[0]?.disabled ? 0 : 1;
      }
    }
  );
}

/**
 * Fetches the list of account holders, stores them in state, and populates dropdowns.
 * @async
 * @returns {Promise<void>}
 */
export async function fetchAndPopulateAccountHolders() {
  try {
    const response = await fetch('/api/accounts/holders');
    const holders = await handleResponse(response);
    updateState({ allAccountHolders: holders }); // Update state
    populateAllAccountHolderDropdowns();
  } catch (error) {
    // @ts-ignore
    showToast(`Could not load account holders: ${error.message}`, 'error');
    updateState({ allAccountHolders: [] });
  }
}

/**
 * Renders the list of account holders in the settings modal for management.
 * @returns {void}
 */
export function renderAccountHolderManagementList() {
  const list = document.getElementById('account-holder-list');
  const secondaryList = document.getElementById('holder-list-secondary');
  if (secondaryList) {
    console.warn(
      "Found 'holder-list-secondary', this is deprecated and should be removed from _modal_settings.html."
    );
    secondaryList.innerHTML =
      '<li>This list is deprecated. Please use the "User Management" tab.</li>';
  }
  if (!list) {
    console.warn("Could not find '#account-holder-list' to render.");
    return;
  }
  list.innerHTML = '';
  if (!state.allAccountHolders || state.allAccountHolders.length === 0) {
    list.innerHTML =
      '<li>No account holders found (this should not happen - Primary should exist).</li>';
    return;
  }
  const sortedHolders = [...state.allAccountHolders].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const defaultHolderIdStr = String(
    state.settings.defaultAccountHolderId || '1'
  );
  sortedHolders.forEach((holder) => {
    const holderIdStr = String(holder.id);
    const isDefault = defaultHolderIdStr === holderIdStr;
    const isProtected = holder.id == 1;
    const deleteButton = isProtected
      ? ''
      : `<button type="button" class="delete-holder-btn delete-btn" data-id="${holder.id}">Delete</button>`;
    const escapeHTML = (str) =>
      str
        ? String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
        : '';
    const escapedName = escapeHTML(holder.name);
    const li = document.createElement('li');
    li.dataset.id = holderIdStr;
    li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-grow: 1;">
                <input type="radio" id="holder_radio_${holder.id}" name="default-holder-radio" value="${holder.id}" ${isDefault ? 'checked' : ''} style="flex-shrink: 0;" title="Set as default account">
                <label for="holder_radio_${holder.id}" class="holder-name" style="cursor: pointer;">${escapedName}</label>
                <input type="text" class="edit-holder-input" value="${escapedName}" style="display: none; width: 100%;">
            </div>
            <div style="flex-shrink: 0; display: flex; gap: 5px;">
                <button type="button" class="manage-subscriptions-btn" data-id="${holder.id}" data-name="${escapedName}" title="Manage source subscriptions for this user">Subscriptions</button>
                <button type="button" class="edit-holder-btn" data-id="${holder.id}">Edit</button>
                <button type="button" class="save-holder-btn" data-id="${holder.id}" style="display: none;">Save</button>
                <button type="button" class="cancel-holder-btn cancel-btn" data-id="${holder.id}" style="display: none;">Cancel</button>
                ${deleteButton}
            </div>
        `;
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.gap = '10px';
    list.appendChild(li);
  });
}

/**
 * Saves the changes for a specific account holder list item in edit mode.
 * @param {HTMLLIElement} li - The <li> element for the holder.
 * @returns {Promise<void>}
 * @throws {Error} If save fails
 */
export async function saveHolderChange(li) {
  const id = li.dataset.id;
  if (!id) throw new Error('Missing ID on list item.');

  const nameLabel = /** @type {HTMLLabelElement | null} */ (
    li.querySelector('label.holder-name')
  );
  const nameInput = /** @type {HTMLInputElement | null} */ (
    li.querySelector('.edit-holder-input')
  );
  const saveBtn = /** @type {HTMLButtonElement | null} */ (
    li.querySelector('.save-holder-btn')
  );

  if (!nameLabel || !nameInput || !saveBtn) {
    throw new Error('Could not find all required elements for saving.');
  }

  const newName = nameInput.value.trim();
  if (!newName) {
    showToast('Name cannot be empty.', 'error');
    throw new Error('Name cannot be empty.');
  }
  if (newName.toLowerCase() === nameLabel.textContent?.toLowerCase()) {
    const cancelBtn = /** @type {HTMLButtonElement | null} */ (
      li.querySelector('.cancel-holder-btn')
    );
    if (cancelBtn) cancelBtn.click();
    return;
  }
  // @ts-ignore
  if (
    state.allAccountHolders.some(
      (h) =>
        String(h.id) !== id && h.name.toLowerCase() === newName.toLowerCase()
    )
  ) {
    showToast(
      `Another account holder named "${newName}" already exists.`,
      'error'
    );
    throw new Error(
      `Another account holder named "${newName}" already exists.`
    );
  }

  saveBtn.disabled = true;
  try {
    const res = await fetch(`/api/accounts/holders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    await handleResponse(res);
    await fetchAndPopulateAccountHolders();
    renderAccountHolderManagementList(); // <-- FIX: Function is now defined above
    showToast('Account holder updated!', 'success');
  } catch (error) {
    // @ts-ignore
    showToast(`Error updating account holder: ${error.message}`, 'error');
    throw error;
  } finally {
    const currentSaveBtn = document.querySelector(
      `.save-holder-btn[data-id="${id}"]`
    );
    if (currentSaveBtn) {
      /** @type {HTMLButtonElement} */ (currentSaveBtn).disabled = false;
    }
  }
}

/**
 * Initializes event listeners for Account Holder Management.
 * @returns {void}
 */
export function initializeHolderManagementHandlers() {
  const accountHolderList = document.getElementById('account-holder-list');
  const addAccountHolderBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('add-account-holder-btn')
  );
  const newAccountHolderNameInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('new-account-holder-name')
  );

  if (addAccountHolderBtn && newAccountHolderNameInput) {
    addAccountHolderBtn.addEventListener('click', async () => {
      const name = newAccountHolderNameInput.value.trim();
      if (!name)
        return showToast('Account holder name cannot be empty.', 'error');
      // @ts-ignore
      if (
        state.allAccountHolders.some(
          (h) => h.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        return showToast(`Account holder "${name}" already exists.`, 'error');
      }
      addAccountHolderBtn.disabled = true;
      try {
        const res = await fetch('/api/accounts/holders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        await handleResponse(res);
        await fetchAndPopulateAccountHolders();
        newAccountHolderNameInput.value = '';
        renderAccountHolderManagementList(); // <-- FIX: Function is now defined above
        showToast('Account holder added!', 'success');
      } catch (error) {
        // @ts-ignore
        showToast(`Error adding account holder: ${error.message}`, 'error');
      } finally {
        addAccountHolderBtn.disabled = false;
      }
    });
  }

  if (accountHolderList) {
    accountHolderList.addEventListener('click', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);

      const subBtn = target.closest('.manage-subscriptions-btn');
      if (subBtn) {
        const holderId = /** @type {HTMLElement} */ (subBtn).dataset.id;
        const holderName = /** @type {HTMLElement} */ (subBtn).dataset.name;
        if (holderId && holderName) {
          const userMgmtPanel = document.getElementById(
            'user-management-settings-panel'
          );
          const subTabsContainer = userMgmtPanel?.querySelector('.sub-tabs');
          const subTabButton = userMgmtPanel?.querySelector(
            'button[data-sub-tab="subscriptions-panel"]'
          );
          if (subTabButton) {
            /** @type {HTMLElement} */ (subTabButton).style.display = '';
          }
          if (userMgmtPanel && subTabsContainer && subTabButton) {
            setActiveTab(
              // <-- FIX: This function is now imported
              subTabsContainer,
              /** @type {HTMLElement} */ (subTabButton),
              userMgmtPanel,
              '.sub-tab-panel',
              'data-sub-tab',
              '#'
            );
          }
          await populateSubscriptionPanel(holderId, holderName); // <-- FIX: This function is now imported
        }
        return;
      }

      if (target.matches('input[type="radio"]')) {
        return;
      }
      if (target.matches('label[for^="holder_radio_"]')) {
        const radioId = target.getAttribute('for');
        const radio = radioId
          ? /** @type {HTMLInputElement | null} */ (
              document.getElementById(radioId)
            )
          : null;
        if (radio) radio.checked = true;
        return;
      }

      // --- FIX: Cast li to HTMLLIElement ---
      const li = /** @type {HTMLLIElement | null} */ (
        target.closest('li[data-id]')
      );
      if (!li) return;
      // --- END FIX ---
      const id = li.dataset.id;
      if (!id) return;
      const nameLabel = /** @type {HTMLLabelElement | null} */ (
        li.querySelector('label.holder-name')
      );
      const nameInput = /** @type {HTMLInputElement | null} */ (
        li.querySelector('.edit-holder-input')
      );
      const editBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.edit-holder-btn')
      );
      const saveBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.save-holder-btn')
      );
      const cancelBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.cancel-holder-btn')
      );
      const deleteBtn = /** @type {HTMLButtonElement | null} */ (
        li.querySelector('.delete-holder-btn')
      );
      if (!nameLabel || !nameInput || !editBtn || !saveBtn || !cancelBtn) {
        console.error(
          'Could not find core elements within the account holder list item.'
        );
        return;
      }
      if (target === editBtn) {
        nameLabel.style.display = 'none';
        nameInput.style.display = '';
        nameInput.focus();
        editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        saveBtn.style.display = '';
        cancelBtn.style.display = '';
      } else if (target === cancelBtn) {
        nameInput.value = nameLabel.textContent || '';
        nameLabel.style.display = '';
        nameInput.style.display = 'none';
        editBtn.style.display = '';
        if (deleteBtn) deleteBtn.style.display = '';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
      } else if (target === saveBtn) {
        try {
          await saveHolderChange(li); // <-- FIX: Call local function
        } catch (error) {
          console.log(
            'Inline save failed, error was already shown by saveHolderChange.'
          );
        }
      } else if (deleteBtn && target === deleteBtn) {
        const holderName = nameLabel.textContent;
        if (String(state.selectedAccountHolderId) === id) {
          return showToast(
            `Cannot delete the currently selected account holder ("${holderName}"). Please switch accounts first.`,
            'error'
          );
        }
        const isDefault = state.settings.defaultAccountHolderId == id;
        showConfirmationModal(
          `Delete Account Holder "${holderName}"?`,
          'This cannot be undone and will fail if the holder has transactions.',
          async () => {
            try {
              const res = await fetch(`/api/accounts/holders/${id}`, {
                method: 'DELETE',
              });
              await handleResponse(res);
              if (isDefault) {
                updateState({
                  settings: { ...state.settings, defaultAccountHolderId: 1 },
                });
                showToast(
                  'Default account holder was deleted, default reset to Primary (will save on close).',
                  'info'
                );
              }
              await renderAccountHolderManagementList(); // <-- FIX: Call local function
              showToast('Account holder deleted.', 'success');
            } catch (_) {
              showToast(
                `Error deleting account holder: ${_.message}`,
                'error'
              );
            }
          }
        );
      }
    });
  } else {
    console.warn(
      'Account holder list element (#account-holder-list) not found for event listener setup.'
    );
  }
}

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
