import { handleResponse } from '../api/api-helpers.js';
// public/event-handlers/_settings_holders.js
/**
 * @file Initializes event handlers for Account Holder management within the Settings modal.
 * @module event-handlers/_settings_holders
 */

import { state, updateState } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { renderAccountHolderManagementList, saveSettings } from '../ui/settings.js'; // Need saveSettings for default change

/**
 * Populates all account holder dropdowns on the page with the latest data from the state.
 * @returns {void}
 */
function populateAllAccountHolderDropdowns() {
    const holderSelects = document.querySelectorAll('.account-holder-select');
    holderSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
        const currentVal = select.value;
        select.innerHTML = '';

        if (select.id === 'global-account-holder-filter') {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Accounts';
            select.appendChild(allOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Select Holder";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            select.appendChild(defaultOption);
        }

        const sortedHolders = Array.isArray(state.allAccountHolders)
            ? [...state.allAccountHolders].sort((a, b) => a.name.localeCompare(b.name))
            : [];

        sortedHolders.forEach(holder => {
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
    });
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
 * Initializes event listeners for Account Holder Management.
 * @returns {void}
 */
export function initializeHolderManagementHandlers() {
    const accountHolderList = document.getElementById('account-holder-list');
    const addAccountHolderBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('add-account-holder-btn'));
    const newAccountHolderNameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('new-account-holder-name'));

    // --- Add Account Holder ---
    if (addAccountHolderBtn && newAccountHolderNameInput) {
        addAccountHolderBtn.addEventListener('click', async () => {
            const name = newAccountHolderNameInput.value.trim();
            if (!name) return showToast('Account holder name cannot be empty.', 'error');
            if (state.allAccountHolders.some(h => h.name.toLowerCase() === name.toLowerCase())) {
                return showToast(`Account holder "${name}" already exists.`, 'error');
            }

            addAccountHolderBtn.disabled = true;
            try {
                const res = await fetch('/api/accounts/holders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                await handleResponse(res);
                await fetchAndPopulateAccountHolders(); // Refetch state and update dropdowns
                newAccountHolderNameInput.value = '';
                renderAccountHolderManagementList(); // Re-render list in modal
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
             // console.log("Click detected inside accountHolderList."); // Keep for debugging
             const target = /** @type {HTMLElement} */ (e.target);

             // Radio button clicks are handled implicitly by saveSettings, so ignore them for direct actions
             if (target.matches('input[type="radio"]')) {
                 console.log("Click was on radio button, default will be saved on 'Save & Close'.");
                 return;
             }
             // Allow clicks on the label to toggle the radio
             if (target.matches('label[for^="holder_radio_"]')) {
                 console.log("Click on radio label.");
                 // Find the associated radio and check it (browser might do this anyway)
                 const radioId = target.getAttribute('for');
                 const radio = radioId ? /** @type {HTMLInputElement | null} */(document.getElementById(radioId)) : null;
                 if (radio) radio.checked = true;
                 return; // Don't process further for edit/delete
             }

            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) return; // Click wasn't on a button within a list item

            const id = li.dataset.id;
             if (!id) return; // Should not happen

            // Find elements within the specific list item `li`
            const nameLabel = /** @type {HTMLLabelElement | null} */ (li.querySelector('label.holder-name'));
            const nameInput = /** @type {HTMLInputElement | null} */ (li.querySelector('.edit-holder-input'));
            const editBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.edit-holder-btn'));
            const saveBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.save-holder-btn'));
            const cancelBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.cancel-holder-btn'));
            const deleteBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.delete-holder-btn'));

             if (!nameLabel || !nameInput || !editBtn || !saveBtn || !cancelBtn) {
                  console.error("Could not find core elements within the account holder list item.");
                  return;
             }

            // --- Button Actions ---
            if (target === editBtn) {
                 nameLabel.style.display = 'none';
                 nameInput.style.display = '';
                 nameInput.focus();
                 editBtn.style.display = 'none';
                 if (deleteBtn) deleteBtn.style.display = 'none';
                 saveBtn.style.display = '';
                 cancelBtn.style.display = '';
            }
            else if (target === cancelBtn) {
                 nameInput.value = nameLabel.textContent || '';
                 nameLabel.style.display = '';
                 nameInput.style.display = 'none';
                 editBtn.style.display = '';
                 if (deleteBtn) deleteBtn.style.display = '';
                 saveBtn.style.display = 'none';
                 cancelBtn.style.display = 'none';
            }
            else if (target === saveBtn) {
                const newName = nameInput.value.trim();
                // Validation
                 if (!newName) return showToast('Name cannot be empty.', 'error');
                 if (newName.toLowerCase() === nameLabel.textContent?.toLowerCase()) {
                     // @ts-ignore
                     cancelBtn.click(); // No change
                     return;
                 }
                  if (state.allAccountHolders.some(h => String(h.id) !== id && h.name.toLowerCase() === newName.toLowerCase())) {
                    return showToast(`Another account holder named "${newName}" already exists.`, 'error');
                 }

                saveBtn.disabled = true;
                try {
                    const res = await fetch(`/api/accounts/holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    await handleResponse(res);
                    await fetchAndPopulateAccountHolders(); // Refreshes state and dropdowns
                    renderAccountHolderManagementList(); // Re-render this list
                    showToast('Account holder updated!', 'success');
                } catch (error) {
                    // @ts-ignore
                    showToast(`Error updating account holder: ${error.message}`, 'error');
                     saveBtn.disabled = false;
                }
            } else if (deleteBtn && target === deleteBtn) {
                 const holderName = nameLabel.textContent;
                 if (String(state.selectedAccountHolderId) === id) {
                      return showToast(`Cannot delete the currently selected account holder ("${holderName}"). Please switch accounts first.`, 'error');
                 }
                 // Check if it's the default holder being deleted
                 const isDefault = state.settings.defaultAccountHolderId == id; // Use == for potential type difference

                 showConfirmationModal(`Delete Account Holder "${holderName}"?`, 'This cannot be undone and will fail if the holder has transactions.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/holders/${id}`, { method: 'DELETE' });
                        await handleResponse(res);

                        // If the deleted holder *was* the default, reset default to Primary (ID 1)
                        if (isDefault) {
                             updateState({ settings: { ...state.settings, defaultAccountHolderId: 1 } }); // Reset to Primary
                             showToast('Default account holder was deleted, default reset to Primary (will save on close).', 'info');
                        }

                        await fetchAndPopulateAccountHolders(); // Refetch state and update dropdowns
                        renderAccountHolderManagementList(); // Re-render list in modal
                        showToast('Account holder deleted.', 'success');
                    } catch (error) { 
                        // @ts-ignore
                        showToast(`Error deleting account holder: ${error.message}`, 'error'); 
                    }
                });
            }
        });
    } else {
        console.warn("Account holder list element (#account-holder-list) not found for event listener setup.");
    }
}
