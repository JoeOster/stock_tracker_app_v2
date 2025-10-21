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
 * Populates all exchange dropdowns on the page with the latest data from the state.
 * @returns {void}
 */
function populateAllExchangeDropdowns() {
    const exchangeSelects = document.querySelectorAll('select[id*="exchange"], select#snapshot-exchange');
    exchangeSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
        const currentVal = select.value;
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Exchange";
        defaultOption.disabled = true;
        select.appendChild(defaultOption);

        const sortedExchanges = Array.isArray(state.allExchanges)
            ? [...state.allExchanges].sort((a, b) => a.name.localeCompare(b.name))
            : [];

        sortedExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            select.appendChild(option);
        });

        if (sortedExchanges.some(ex => ex.name === currentVal)) {
            select.value = currentVal;
        } else {
             select.selectedIndex = 0;
        }
    });
}

/**
 * Fetches the list of exchanges, stores them in state, and populates dropdowns.
 * This needs to be called when the modal opens and after updates.
 * @returns {Promise<void>}
 */
export async function fetchAndRenderExchanges() {
    try {
        const response = await fetch('/api/accounts/exchanges');
        state.allExchanges = await handleResponse(response);
        populateAllExchangeDropdowns(); // Update dropdowns everywhere
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
            // console.log("Click detected inside exchangeList."); // Keep for debugging if needed
            const target = /** @type {HTMLElement} */ (e.target);
            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) return;

            const id = li.dataset.id;
            if (!id) return; // Should not happen if li is found

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

            // --- Button Actions ---
            if (target === editBtn) {
                nameSpan.style.display = 'none';
                nameInput.style.display = '';
                nameInput.focus();
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                saveBtn.style.display = '';
                cancelBtn.style.display = '';
            }
            else if (target === cancelBtn) {
                nameInput.value = nameSpan.textContent || '';
                nameSpan.style.display = '';
                nameInput.style.display = 'none';
                editBtn.style.display = '';
                deleteBtn.style.display = '';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
            else if (target === saveBtn) {
                const newName = nameInput.value.trim();
                // Validation
                if (!newName) return showToast('Exchange name cannot be empty.', 'error');
                if (newName.toLowerCase() === nameSpan.textContent?.toLowerCase()) {
                    cancelBtn.click(); // No change, just cancel edit mode
                    return;
                }
                 if (state.allExchanges.some(ex => String(ex.id) !== id && ex.name.toLowerCase() === newName.toLowerCase())) {
                    return showToast(`Another exchange named "${newName}" already exists.`, 'error');
                 }

                saveBtn.disabled = true;
                try {
                    const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    await handleResponse(res);
                    await fetchAndRenderExchanges(); // Refreshes state and all dropdowns
                    renderExchangeManagementList(); // Re-render this list
                    showToast('Exchange updated!', 'success');
                    await refreshLedger(); // Refresh ledger as exchange name might have changed
                } catch (error) {
                    showToast(`Error updating exchange: ${error.message}`, 'error');
                    saveBtn.disabled = false; // Re-enable only on error
                }
            } else if (target === deleteBtn) {
                const exchangeName = nameSpan.textContent;
                showConfirmationModal(`Delete Exchange "${exchangeName}"?`, 'This cannot be undone and will fail if the exchange is currently used by any transactions.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'DELETE' });
                        await handleResponse(res);
                        await fetchAndRenderExchanges(); // Refetch state and update dropdowns
                        renderExchangeManagementList(); // Re-render list in modal
                        showToast('Exchange deleted.', 'success');
                    } catch (error) { showToast(`Error deleting exchange: ${error.message}`, 'error'); }
                });
            }
        });
    } else {
        console.warn("Exchange list element (#exchange-list) not found for event listener setup.");
    }
}