// public/event-handlers/_settings_exchanges.js
/**
 * @file Initializes event handlers for Exchange management within the Settings modal.
 * @module event-handlers/_settings_exchanges
 */

import { state } from '../state.js';
import { handleResponse, refreshLedger } from '../api.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { renderExchangeManagementList } from '../ui/settings.js';

/**
 * Populates all exchange dropdowns on the page with the latest data from the state,
 * sorted alphabetically with "Other" placed last.
 * @returns {void}
 */
function populateAllExchangeDropdowns() {
    const exchangeSelects = document.querySelectorAll('select[id*="exchange"], select#snapshot-exchange');
    exchangeSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
        const currentVal = select.value; // Store current value before clearing
        select.innerHTML = ''; // Clear existing options

        // Add default disabled option
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Exchange";
        defaultOption.disabled = true;
        // Do not set selected=true here, let the value restoration handle it
        select.appendChild(defaultOption);

        let otherOption = null;
        const sortedExchanges = Array.isArray(state.allExchanges)
            ? [...state.allExchanges]
                  .filter(ex => { // Filter out 'Other' temporarily
                      if (ex.name.toLowerCase() === 'other') {
                          otherOption = ex;
                          return false;
                      }
                      return true;
                  })
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort the rest alphabetically
            : [];

        // Add sorted exchanges
        sortedExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            select.appendChild(option);
        });

        // Add 'Other' option at the end if it exists
        if (otherOption) {
            const option = document.createElement('option');
            option.value = otherOption.name;
            option.textContent = otherOption.name;
            select.appendChild(option);
        }

        // Try to restore the previously selected value
        if (select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        } else {
             // If previous value not found (e.g., deleted), select the default disabled option
             select.selectedIndex = 0;
        }
    });
}


/**
 * Fetches the list of exchanges, stores them in state, and populates dropdowns.
 * @returns {Promise<void>}
 */
export async function fetchAndRenderExchanges() {
    try {
        const response = await fetch('/api/accounts/exchanges');
        state.allExchanges = await handleResponse(response);
        populateAllExchangeDropdowns(); // Update dropdowns everywhere using the new sorted logic
    } catch (error) {
        showToast(`Could not load exchanges: ${error.message}`, 'error');
        state.allExchanges = [];
    }
}


/**
 * Initializes event listeners for Exchange Management.
 */
export function initializeExchangeManagementHandlers() {
    const exchangeList = document.getElementById('exchange-list');
    const addExchangeBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('add-exchange-btn'));
    const newExchangeNameInput = /** @type {HTMLInputElement | null} */ (document.getElementById('new-exchange-name'));

    // --- Add Exchange ---
    if (addExchangeBtn && newExchangeNameInput) {
         addExchangeBtn.addEventListener('click', async () => {
            const name = newExchangeNameInput.value.trim();
            if (!name) return showToast('Exchange name cannot be empty.', 'error');
            if (state.allExchanges.some(ex => ex.name.toLowerCase() === name.toLowerCase())) {
                 return showToast(`Exchange "${name}" already exists.`, 'error');
            }

            addExchangeBtn.disabled = true;
            try {
                const res = await fetch('/api/accounts/exchanges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                await handleResponse(res);
                await fetchAndRenderExchanges(); // Refetch exchanges (updates state and dropdowns)
                newExchangeNameInput.value = '';
                renderExchangeManagementList(); // Re-render the list in the modal
                showToast('Exchange added!', 'success');
            } catch (error) {
                showToast(`Error adding exchange: ${error.message}`, 'error');
            } finally {
                addExchangeBtn.disabled = false;
            }
        });
    }

    // --- Edit/Save/Cancel/Delete Exchange ---
    if (exchangeList) {
        exchangeList.addEventListener('click', async (e) => {
            // ... (rest of the edit/save/cancel/delete logic remains the same) ...
            const target = /** @type {HTMLElement} */ (e.target);
            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) return;

            const id = li.dataset.id;
            if (!id) return;

            const nameSpan = /** @type {HTMLElement | null} */ (li.querySelector('.exchange-name'));
            const nameInput = /** @type {HTMLInputElement | null} */ (li.querySelector('.edit-exchange-input'));
            const editBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.edit-exchange-btn'));
            const saveBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.save-exchange-btn'));
            const cancelBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.cancel-exchange-btn'));
            const deleteBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.delete-exchange-btn'));

             if (!nameSpan || !nameInput || !editBtn || !saveBtn || !cancelBtn || !deleteBtn) {
                 console.error("Could not find all necessary elements within the exchange list item.");
                 return;
             }

            if (target === editBtn) {
                nameSpan.style.display = 'none'; nameInput.style.display = ''; nameInput.focus();
                editBtn.style.display = 'none'; deleteBtn.style.display = 'none';
                saveBtn.style.display = ''; cancelBtn.style.display = '';
            }
            else if (target === cancelBtn) {
                nameInput.value = nameSpan.textContent || ''; nameSpan.style.display = '';
                nameInput.style.display = 'none'; editBtn.style.display = '';
                deleteBtn.style.display = ''; saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
            else if (target === saveBtn) {
                const newName = nameInput.value.trim();
                if (!newName) return showToast('Exchange name cannot be empty.', 'error');
                if (newName.toLowerCase() === nameSpan.textContent?.toLowerCase()) { cancelBtn.click(); return; }
                 if (state.allExchanges.some(ex => String(ex.id) !== id && ex.name.toLowerCase() === newName.toLowerCase())) {
                    return showToast(`Another exchange named "${newName}" already exists.`, 'error');
                 }
                saveBtn.disabled = true;
                try {
                    const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    await handleResponse(res);
                    await fetchAndRenderExchanges();
                    renderExchangeManagementList();
                    showToast('Exchange updated!', 'success');
                    await refreshLedger();
                } catch (error) {
                    showToast(`Error updating exchange: ${error.message}`, 'error');
                    saveBtn.disabled = false;
                }
            } else if (target === deleteBtn) {
                const exchangeName = nameSpan.textContent;
                showConfirmationModal(`Delete Exchange "${exchangeName}"?`, 'This cannot be undone and will fail if the exchange is currently used by any transactions.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'DELETE' });
                        await handleResponse(res);
                        await fetchAndRenderExchanges();
                        renderExchangeManagementList();
                        showToast('Exchange deleted.', 'success');
                    } catch (error) { showToast(`Error deleting exchange: ${error.message}`, 'error'); }
                });
            }
        });
    } else {
        console.warn("Exchange list element (#exchange-list) not found for event listener setup.");
    }
}