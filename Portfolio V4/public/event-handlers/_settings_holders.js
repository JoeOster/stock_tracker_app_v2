// /Portfolio V4/public/event-handlers/_settings_holders.js
/**
 * @file Manages the account holders settings logic.
 * @module event-handlers/settings-holders
 */

import { state, updateState } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { handleResponse } from '../api/api-helpers.js';
import { setActiveTab } from './_settings_modal.js';
import { populateSubscriptionPanel } from './_modal_manage_subscriptions.js';

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
              showToast(`Error deleting account holder: ${_.message}`, 'error');
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
