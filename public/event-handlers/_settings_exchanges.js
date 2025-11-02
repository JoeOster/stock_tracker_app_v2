// public/event-handlers/_settings_exchanges.js
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
/**
 * @file Initializes event handlers for Exchange management within the Settings modal.
 * @module event-handlers/_settings_exchanges
 */

import { state, updateState } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { renderExchangeManagementList } from '../ui/settings.js';

// ... (populateAllExchangeDropdowns and fetchAndRenderExchanges are unchanged) ...
function populateAllExchangeDropdowns() {
  const exchangeSelects = document.querySelectorAll(
    'select[id*="exchange"], select#snapshot-exchange'
  );
  exchangeSelects.forEach(
    /** @param {HTMLSelectElement} select */ (select) => {
      const currentVal = select.value; // Store current value before clearing
      select.innerHTML = ''; // Clear existing options
      if (select.id.includes('filter')) {
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Exchanges';
        select.appendChild(allOption);
      } else {
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
                if (ex.name.toLowerCase() === 'other') {
                  otherOption = ex;
                  return false;
                }
                return true;
              }
            )
            .sort((/** @type {any} */ a, /** @type {any} */ b) =>
              a.name.localeCompare(b.name)
            )
        : [];
      sortedExchanges.forEach((ex) => {
        const option = document.createElement('option');
        // @ts-ignore
        option.value = ex.name;
        // @ts-ignore
        option.textContent = ex.name;
        select.appendChild(option);
      });
      if (otherOption) {
        const option = document.createElement('option');
        // @ts-ignore
        option.value = otherOption.name;
        // @ts-ignore
        option.textContent = otherOption.name;
        select.appendChild(option);
      }
      if (select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
      } else {
        select.selectedIndex = 0;
      }
    }
  );
}
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

// --- THIS IS THE FIX ---
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
    // No change, just cancel
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
    renderExchangeManagementList();
    showToast('Exchange updated!', 'success');
    await refreshLedger();
  } catch (error) {
    // @ts-ignore
    showToast(`Error updating exchange: ${error.message}`, 'error');
    throw error; // Re-throw to stop saveSettings
  } finally {
    const currentSaveBtn = document.querySelector(
      `.save-exchange-btn[data-id="${id}"]`
    );
    if (currentSaveBtn) {
      /** @type {HTMLButtonElement} */ (currentSaveBtn).disabled = false;
    }
  }
}
// --- END FIX ---

/**
 * Initializes event listeners for Exchange Management.
 * @returns {void}
 */
export function initializeExchangeManagementHandlers() {
  // ... (Add Exchange unchanged) ...
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
        await fetchAndRenderExchanges(); // Refetch exchanges (updates state and dropdowns)
        newExchangeNameInput.value = '';
        renderExchangeManagementList(); // Re-render the list in the modal
        showToast('Exchange added!', 'success');
      } catch (error) {
        // @ts-ignore
        showToast(`Error adding exchange: ${error.message}`, 'error');
      } finally {
        addExchangeBtn.disabled = false;
      }
    });
  }

  // --- Edit/Save/Cancel/Delete Exchange ---
  if (exchangeList) {
    exchangeList.addEventListener('click', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const li = /** @type {HTMLElement | null} */ (
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
      }
      // --- THIS IS THE FIX ---
      else if (target === saveBtn) {
        try {
          await saveExchangeChange(li);
        } catch (error) {
          void error; // Explicitly use error to satisfy linter
          console.log(
            'Inline save failed, error was already shown by saveExchangeChange.'
          );
        }
      }
      // --- END FIX ---
      else if (target === deleteBtn) {
        // ... (Delete logic unchanged) ...
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
