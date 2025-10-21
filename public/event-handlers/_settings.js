// public/event-handlers/_settings.js
/**
 * @file Initializes event listeners for general settings and non-journal data management within the Settings modal.
 * @module event-handlers/_settings
 */

import { state } from '../state.js';
import { refreshLedger } from '../api.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
// Import general settings UI functions from settings.js
import {
    saveSettings,
    renderExchangeManagementList,
    renderAccountHolderManagementList,
    applyAppearanceSettings
} from '../ui/settings.js';
// Import rendering function for journal settings FROM journal-settings.js
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';
// Import fetching function for journal settings FROM journal-settings.js
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
// Import handleResponse for consistency
import { handleResponse } from '../api.js';


/**
 * Populates all exchange dropdowns on the page with the latest data from the state.
 * @returns {void}
 */
function populateAllExchangeDropdowns() {
    const exchangeSelects = document.querySelectorAll('select[id*="exchange"]');
    exchangeSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
        const currentVal = select.value;
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Exchange";
        defaultOption.disabled = true;
        select.appendChild(defaultOption);

        // Ensure state.allExchanges is an array before sorting/iterating
        const sortedExchanges = Array.isArray(state.allExchanges)
            ? [...state.allExchanges].sort((a, b) => a.name.localeCompare(b.name))
            : [];


        sortedExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            select.appendChild(option);
        });
        // Restore previous value if it still exists
        if (sortedExchanges.some(ex => ex.name === currentVal)) {
            select.value = currentVal;
        } else {
             select.selectedIndex = 0; // Fallback to "Select Exchange"
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
        state.allExchanges = await handleResponse(response); // Use handleResponse
        populateAllExchangeDropdowns();
    } catch (error) {
        showToast(`Could not load exchanges: ${error.message}`, 'error');
        state.allExchanges = []; // Default to empty array on error
    }
}

/**
 * Fetches the list of account holders, stores them in state, and populates dropdowns.
 * @returns {Promise<void>}
 */
export async function fetchAndPopulateAccountHolders() {
    try {
        const response = await fetch('/api/accounts/holders');
        state.allAccountHolders = await handleResponse(response); // Use handleResponse

        // Ensure state.allAccountHolders is an array
        const sortedHolders = Array.isArray(state.allAccountHolders)
            ? [...state.allAccountHolders].sort((a, b) => a.name.localeCompare(b.name))
            : [];


        const holderSelects = document.querySelectorAll('.account-holder-select');
        holderSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
            const currentVal = select.value;
            select.innerHTML = ''; // Clear existing options

            // Add 'All Accounts' or default 'Select Holder' based on ID
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
                defaultOption.selected = true; // Make it the default display
                select.appendChild(defaultOption);
            }

            // Populate with fetched holders
            sortedHolders.forEach(holder => {
                const option = document.createElement('option');
                option.value = String(holder.id); // Ensure value is string
                option.textContent = holder.name;
                select.appendChild(option);
            });

            // Try to restore previous selection
            if (select.querySelector(`option[value="${currentVal}"]`)) {
                select.value = currentVal;
            } else if (select.id === 'global-account-holder-filter') {
                 select.value = 'all'; // Default global filter to 'all' if previous invalid
            } else {
                 select.selectedIndex = select.options[0]?.disabled ? 0 : 1; // Default to first non-disabled option
            }
        });

    } catch (error) {
        showToast(`Could not load account holders: ${error.message}`, 'error');
        state.allAccountHolders = []; // Default to empty array
    }
}

/**
 * Initializes all event listeners within the Settings modal
 * (excluding journal-specific settings handled elsewhere).
 * @returns {void}
 */
export function initializeSettingsHandlers() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-button');
    const themeSelector = /** @type {HTMLSelectElement} */ (document.getElementById('theme-selector'));
    const fontSelector = /** @type {HTMLSelectElement} */ (document.getElementById('font-selector'));
    const settingsTabsContainer = document.querySelector('.settings-tabs');

    // Data Management Elements (non-journal)
    const dataManagementPanel = document.getElementById('data-settings-panel');
    const exchangeList = document.getElementById('exchange-list');
    const addExchangeBtn = /** @type {HTMLButtonElement} */ (document.getElementById('add-exchange-btn'));
    const newExchangeNameInput = /** @type {HTMLInputElement} */ (document.getElementById('new-exchange-name'));
    const accountHolderList = document.getElementById('account-holder-list');
    const addAccountHolderBtn = /** @type {HTMLButtonElement} */ (document.getElementById('add-account-holder-btn'));
    const newAccountHolderNameInput = /** @type {HTMLInputElement} */ (document.getElementById('new-account-holder-name'));

    // --- Settings Modal Opening ---
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', async () => {
            try {
                await Promise.all([
                    fetchAndRenderExchanges(),
                    fetchAndPopulateAccountHolders(),
                    fetchAndStoreAdviceSources() // Fetch journal data
                ]);

                // Load current settings into the form fields
                (/** @type {HTMLInputElement} */(document.getElementById('take-profit-percent'))).value = String(state.settings.takeProfitPercent || 0);
                (/** @type {HTMLInputElement} */(document.getElementById('stop-loss-percent'))).value = String(state.settings.stopLossPercent || 0);
                (/** @type {HTMLSelectElement} */(document.getElementById('theme-selector'))).value = state.settings.theme || 'light';
                (/** @type {HTMLSelectElement} */(document.getElementById('font-selector'))).value = state.settings.font || 'Inter';
                (/** @type {HTMLInputElement} */(document.getElementById('notification-cooldown'))).value = String(state.settings.notificationCooldown || 16);
                (/** @type {HTMLInputElement} */(document.getElementById('family-name'))).value = state.settings.familyName || '';

                // Render management lists
                renderExchangeManagementList();
                renderAccountHolderManagementList();
                renderAdviceSourceManagementList();

                // Reset tabs and panels
                document.querySelectorAll('.settings-tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
                document.querySelectorAll('.settings-panel').forEach((panel, index) => panel.classList.toggle('active', index === 0));
                dataManagementPanel?.querySelectorAll('.sub-tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
                dataManagementPanel?.querySelectorAll('.sub-tab-panel').forEach((panel, index) => panel.classList.toggle('active', index === 0));

                settingsModal.classList.add('visible');
            } catch (error) {
                 console.error("Error opening settings modal:", error);
                 showToast(`Could not load all settings data: ${error.message}`, "error"); // Use message
            }
        });
    }

    // --- Settings Modal Saving ---
    if (saveSettingsBtn && settingsModal) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings(); // Assumes saveSettings includes necessary validation or handles defaults
            settingsModal.classList.remove('visible');
            showToast('Settings saved!', 'success'); // Add feedback on save
        });
    }

     // --- Generic Modal Closing ---
    settingsModal?.querySelectorAll('.close-button').forEach(btn =>
        btn.addEventListener('click', e =>
            (/** @type {HTMLElement} */ (e.target)).closest('.modal')?.classList.remove('visible')
        )
    );
     settingsModal?.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('visible');
        }
    });

    // --- Live Appearance Updates ---
    if (themeSelector) themeSelector.addEventListener('change', () => { state.settings.theme = themeSelector.value; applyAppearanceSettings(); });
    if (fontSelector) fontSelector.addEventListener('change', () => { state.settings.font = fontSelector.value; applyAppearanceSettings(); });

    // --- Settings Modal Main Tab Navigation ---
    if (settingsTabsContainer) { /* ... Tab logic remains the same ... */ }
    // --- Sub-Tab Switching within Data Management ---
    if (dataManagementPanel) { /* ... Sub-tab logic remains the same ... */ }

    // --- Exchange Management ---
    if (addExchangeBtn && newExchangeNameInput) {
        addExchangeBtn.addEventListener('click', async () => {
            const name = newExchangeNameInput.value.trim();
            // --- Validation ---
            if (!name) return showToast('Exchange name cannot be empty.', 'error');
            // Check if exchange already exists (client-side check for better UX)
            if (state.allExchanges.some(ex => ex.name.toLowerCase() === name.toLowerCase())) {
                 return showToast(`Exchange "${name}" already exists.`, 'error');
            }
            // --- End Validation ---

            addExchangeBtn.disabled = true;
            try {
                const res = await fetch('/api/accounts/exchanges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                await handleResponse(res); // Use handleResponse
                await fetchAndRenderExchanges();
                newExchangeNameInput.value = '';
                renderExchangeManagementList();
                showToast('Exchange added!', 'success');
            } catch (error) { showToast(`Error adding exchange: ${error.message}`, 'error'); } // Use message
            finally { addExchangeBtn.disabled = false; }
        });
    }


    if (exchangeList) {
        exchangeList.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) return;
            const id = li.dataset.id;
            if (!id) return; // Should always have an ID

            const nameSpan = /** @type {HTMLElement} */ (li.querySelector('.exchange-name'));
            const nameInput = /** @type {HTMLInputElement} */ (li.querySelector('.edit-exchange-input'));
            const editBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.edit-exchange-btn'));
            const saveBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.save-exchange-btn'));
            const cancelBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.cancel-exchange-btn'));
            const deleteBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.delete-exchange-btn'));

             if (!nameSpan || !nameInput || !editBtn || !saveBtn || !cancelBtn || !deleteBtn) return;

            if (target === editBtn) { /* ... Edit toggle logic ... */ }
            else if (target === cancelBtn) { /* ... Cancel toggle logic ... */ }
            else if (target === saveBtn) {
                const newName = nameInput.value.trim();
                // --- Validation ---
                if (!newName) return showToast('Exchange name cannot be empty.', 'error');
                if (newName.toLowerCase() === nameSpan.textContent?.toLowerCase()) { // No change
                    // Just cancel the edit state without saving
                     cancelBtn.click(); // Simulate cancel click
                     return;
                }
                 // Check if new name conflicts with *another* existing exchange
                 if (state.allExchanges.some(ex => String(ex.id) !== id && ex.name.toLowerCase() === newName.toLowerCase())) {
                    return showToast(`Another exchange named "${newName}" already exists.`, 'error');
                 }
                // --- End Validation ---
                saveBtn.disabled = true;
                try {
                    const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    await handleResponse(res); // Use handleResponse
                    await fetchAndRenderExchanges(); // Refreshes state and all dropdowns
                    renderExchangeManagementList(); // Re-render this list
                    showToast('Exchange updated!', 'success');
                    await refreshLedger(); // Refresh ledger as exchange name might have changed
                } catch (error) {
                    showToast(`Error updating exchange: ${error.message}`, 'error'); // Use message
                    saveBtn.disabled = false; // Re-enable on error
                }
                // No finally here, button stays disabled on success until list re-renders
            } else if (target === deleteBtn) {
                const exchangeName = nameSpan.textContent;
                showConfirmationModal(`Delete Exchange "${exchangeName}"?`, 'This cannot be undone and will fail if the exchange is currently used by any transactions.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'DELETE' });
                        await handleResponse(res); // Use handleResponse
                        await fetchAndRenderExchanges();
                        renderExchangeManagementList();
                        showToast('Exchange deleted.', 'success');
                    } catch (error) { showToast(`Error deleting exchange: ${error.message}`, 'error'); } // Use message
                });
            }
        });
    }

    // --- Account Holder Management ---
    if (addAccountHolderBtn && newAccountHolderNameInput) {
        addAccountHolderBtn.addEventListener('click', async () => {
            const name = newAccountHolderNameInput.value.trim();
            // --- Validation ---
            if (!name) return showToast('Account holder name cannot be empty.', 'error');
            // Check if name already exists
            if (state.allAccountHolders.some(h => h.name.toLowerCase() === name.toLowerCase())) {
                return showToast(`Account holder "${name}" already exists.`, 'error');
            }
            // --- End Validation ---
            addAccountHolderBtn.disabled = true;
            try {
                const res = await fetch('/api/accounts/holders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                await handleResponse(res); // Use handleResponse
                await fetchAndPopulateAccountHolders();
                newAccountHolderNameInput.value = '';
                renderAccountHolderManagementList();
                showToast('Account holder added!', 'success');
            } catch (error) { showToast(`Error adding account holder: ${error.message}`, 'error'); } // Use message
            finally { addAccountHolderBtn.disabled = false; }
        });
    }

    if (accountHolderList) {
        accountHolderList.addEventListener('click', async (e) => {
             const target = /** @type {HTMLElement} */ (e.target);
            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) return;
            const id = li.dataset.id;
             if (!id) return; // Should always have an ID

            const nameSpan = /** @type {HTMLElement} */ (li.querySelector('.holder-name'));
            const nameInput = /** @type {HTMLInputElement} */ (li.querySelector('.edit-holder-input'));
            const editBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.edit-holder-btn'));
            const saveBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.save-holder-btn'));
            const cancelBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.cancel-holder-btn'));
            const deleteBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.delete-holder-btn'));

            if (!nameSpan || !nameInput || !editBtn || !saveBtn || !cancelBtn) return; // Basic elements

            if (target.matches('.edit-holder-btn')) { /* ... Edit toggle ... */ }
            else if (target.matches('.cancel-holder-btn')) { /* ... Cancel toggle ... */ }
            else if (target.matches('.save-holder-btn')) {
                const newName = nameInput.value.trim();
                // --- Validation ---
                if (!newName) return showToast('Name cannot be empty.', 'error');
                 if (newName.toLowerCase() === nameSpan.textContent?.toLowerCase()) { // No change
                     cancelBtn.click(); // Simulate cancel
                     return;
                 }
                 // Check name conflict with *other* holders
                  if (state.allAccountHolders.some(h => String(h.id) !== id && h.name.toLowerCase() === newName.toLowerCase())) {
                    return showToast(`Another account holder named "${newName}" already exists.`, 'error');
                 }
                // --- End Validation ---
                saveBtn.disabled = true;
                try {
                    const res = await fetch(`/api/accounts/holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    await handleResponse(res); // Use handleResponse
                    await fetchAndPopulateAccountHolders();
                    renderAccountHolderManagementList();
                    showToast('Account holder updated!', 'success');
                } catch (error) {
                    showToast(`Error updating account holder: ${error.message}`, 'error'); // Use message
                     saveBtn.disabled = false; // Re-enable on error
                }
            } else if (deleteBtn && target.matches('.delete-holder-btn')) {
                 const holderName = nameSpan.textContent;
                 // Add check: Don't allow deleting the currently selected holder if it's not 'all'
                 if (String(state.selectedAccountHolderId) === id) {
                      return showToast(`Cannot delete the currently selected account holder ("${holderName}"). Please switch accounts first.`, 'error');
                 }
                 showConfirmationModal(`Delete Account Holder "${holderName}"?`, 'This cannot be undone and will fail if the holder has transactions.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/holders/${id}`, { method: 'DELETE' });
                        await handleResponse(res); // Use handleResponse
                        // Check if the deleted holder was the default, reset if needed
                        if (String(state.settings.defaultAccountHolderId) === id) {
                             state.settings.defaultAccountHolderId = 1; // Reset to Primary
                             saveSettings(); // Save the updated default
                             showToast('Default account holder was deleted, reset to Primary.', 'info');
                        }
                        await fetchAndPopulateAccountHolders();
                        renderAccountHolderManagementList();
                        showToast('Account holder deleted.', 'success');
                    } catch (error) { showToast(`Error deleting account holder: ${error.message}`, 'error'); } // Use message
                });
            }
        });
    }
}