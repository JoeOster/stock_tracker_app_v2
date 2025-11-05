// public/event-handlers/_settings_holders.js
import { handleResponse } from '../api/api-helpers.js';
/**
 * @file Initializes event handlers for Account Holder management within the Settings modal.
 * @module event-handlers/_settings_holders
 */

import { state, updateState } from '../state.js';
import { populateAllAccountHolderDropdowns } from '../ui/dropdowns.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { renderAccountHolderManagementList } from '../ui/settings.js';
import { populateSubscriptionPanel } from './_modal_manage_subscriptions.js';
import { setActiveTab } from './_settings_modal.js';

// ... (populateAllAccountHolderDropdowns and fetchAndPopulateAccountHolders are unchanged) ...
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

// --- NEW EXPORTED FUNCTION ---
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
    // No change, just cancel
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
    renderAccountHolderManagementList();
    showToast('Account holder updated!', 'success');
  } catch (error) {
    // @ts-ignore
    showToast(`Error updating account holder: ${error.message}`, 'error');
    throw error; // Re-throw to stop saveSettings
  } finally {
    // This might run after the list is re-rendered, so the button might not exist
    // The re-render from renderAccountHolderManagementList() handles resetting the UI.
    const currentSaveBtn = document.querySelector(
      `.save-holder-btn[data-id="${id}"]`
    );
    if (currentSaveBtn) {
      /** @type {HTMLButtonElement} */ (currentSaveBtn).disabled = false;
    }
  }
}
// --- END NEW FUNCTION ---

/**
 * Initializes event listeners for Account Holder Management.
 * @returns {void}
 */
/**
 * Loads and renders the account holder management settings.
 * @returns {Promise<void>}
 */
export async function loadHolderSettings() {
  await fetchAndPopulateAccountHolders();
  renderAccountHolderManagementList();
}

export function initializeHolderManagementHandlers() {
  loadHolderSettings();
  const accountHolderList = document.getElementById('account-holder-list');
  const addAccountHolderBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('add-account-holder-btn')
  );
  const newAccountHolderNameInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('new-account-holder-name')
  );

  // --- Add Account Holder ---
  if (addAccountHolderBtn && newAccountHolderNameInput) {
    addAccountHolderBtn.addEventListener('click', async () => {
      // ... (this logic is unchanged) ...
      const name = newAccountHolderNameInput.value.trim();
      if (!name)
        return showToast('Account holder name cannot be empty.', 'error');
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
        renderAccountHolderManagementList();
        showToast('Account holder added!', 'success');
      } catch (error) {
        // @ts-ignore
        showToast(`Error adding account holder: ${error.message}`, 'error');
      } finally {
        addAccountHolderBtn.disabled = false;
      }
    });
  }

  // --- Edit/Save/Cancel/Delete/Set Default Account Holder ---
  if (accountHolderList) {
    accountHolderList.addEventListener('click', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);

      // ... (Subscription button logic is unchanged) ...
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
              subTabsContainer,
              /** @type {HTMLElement} */ (subTabButton),
              userMgmtPanel,
              '.sub-tab-panel',
              'data-sub-tab',
              '#'
            );
          }
          await populateSubscriptionPanel(holderId, holderName);
        }
        return;
      }

      // ... (Radio button logic is unchanged) ...
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

      const li = /** @type {HTMLElement | null} */ (
        target.closest('li[data-id]')
      );
      if (!li) return;

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

      // --- Button Actions (Edit, Cancel, Delete) ---
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
      }
      // --- MODIFIED: Save button now calls the exported function ---
      else if (target === saveBtn) {
        try {
          await saveHolderChange(li); // <-- FIX: Call local function
        } catch (error) {
          void error; // Explicitly use error to satisfy linter
          console.log(
            'Inline save failed, error was already shown by saveHolderChange.'
          );
        }
      } else if (deleteBtn && target === deleteBtn) {
        // ... (Delete logic is unchanged) ...
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
              await fetchAndPopulateAccountHolders();
              renderAccountHolderManagementList();
              showToast('Account holder deleted.', 'success');
            } catch (error) {
              // @ts-ignore
              showToast(
                `Error deleting account holder: ${error.message}`,
                'error'
              );
            }
          }
        );
      }
      // --- END MODIFICATION ---
    });
  } else {
    console.warn(
      'Account holder list element (#account-holder-list) not found for event listener setup.'
    );
  }
}
