// public/event-handlers/_settings.js
/**
 * @file Initializes event listeners for general settings and non-journal data management within the Settings modal.
 * @module event-handlers/_settings
 */

import { state } from '../state.js';
import { refreshLedger, handleResponse } from '../api.js'; // Ensure handleResponse is imported
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

/**
 * Helper function to set the active tab and panel within a tab group.
 * @param {Element} containerElement - The container holding the tab buttons (e.g., .settings-tabs, .sub-tabs).
 * @param {HTMLElement} clickedTabElement - The specific tab button that was clicked.
 * @param {Element} scopeElement - The element within which to search for panels (e.g., settingsModal, dataManagementPanel).
 * @param {string} panelSelector - CSS selector for the panels (e.g., '.settings-panel', '.sub-tab-panel').
 * @param {string} tabAttribute - The data attribute on the tab button containing the panel identifier (e.g., 'data-tab', 'data-sub-tab'). Should be just the attribute name like 'data-tab'.
 * @param {string} [panelIdPrefix='#'] - The prefix for the panel ID selector (e.g., '#', '.').
 * @param {string} [panelIdSuffix=''] - The suffix for the panel ID selector (e.g., '-settings-panel', '-panel').
 */
export function setActiveTab(containerElement, clickedTabElement, scopeElement, panelSelector, tabAttribute, panelIdPrefix = '#', panelIdSuffix = '') {
    // Find the identifier from the clicked tab's data attribute
    // Use getAttribute for data-* attributes
    const tabId = clickedTabElement.getAttribute(tabAttribute);
    console.log(`setActiveTab called. Target ID from attribute [${tabAttribute}]:`, tabId); // Debug log

    if (!tabId) {
        console.error("setActiveTab: Clicked tab is missing the required data attribute:", tabAttribute);
        return; // Exit if the data attribute is missing
    }

    // Deactivate all tabs within the same container
    // Use the first class of the clicked button (e.g., 'settings-tab' or 'sub-tab') to select siblings
    const tabClass = clickedTabElement.classList[0];
    if (tabClass) {
        containerElement.querySelectorAll(`.${tabClass}`).forEach(tab => tab.classList.remove('active'));
    } else {
        console.warn("setActiveTab: Clicked tab element has no classes to identify siblings.");
    }

    // Deactivate all panels within the specified scope
    scopeElement.querySelectorAll(panelSelector).forEach(panel => panel.classList.remove('active'));

    // Activate the clicked tab
    clickedTabElement.classList.add('active');

    // Construct the ID of the corresponding panel and activate it
    const panelIdSelector = `${panelIdPrefix}${tabId}${panelIdSuffix}`; // Construct the full selector
    console.log("setActiveTab: Looking for panel selector:", panelIdSelector, "within scope:", scopeElement); // Debug log
    const panelToShow = scopeElement.querySelector(panelIdSelector);
    if (panelToShow) {
        console.log("setActiveTab: Found panel, setting active:", panelToShow); // Debug log
        panelToShow.classList.add('active');
    } else {
        console.error("setActiveTab: Could not find panel with selector:", panelIdSelector);
    }
}


/**
 * Populates all exchange dropdowns on the page with the latest data from the state.
 * @returns {void}
 */
function populateAllExchangeDropdowns() {
    const exchangeSelects = document.querySelectorAll('select[id*="exchange"], select#snapshot-exchange'); // Include snapshot-exchange
    exchangeSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
        const currentVal = select.value;
        select.innerHTML = ''; // Clear existing options
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Exchange";
        defaultOption.disabled = true; // Keep disabled
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
 * Populates all account holder dropdowns on the page with the latest data from the state.
 */
function populateAllAccountHolderDropdowns() {
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
        const sortedHolders = Array.isArray(state.allAccountHolders)
            ? [...state.allAccountHolders].sort((a, b) => a.name.localeCompare(b.name))
            : [];

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
             // Default to the first non-disabled option if previous invalid
             select.selectedIndex = select.options[0]?.disabled ? 0 : 1;
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
        populateAllAccountHolderDropdowns(); // Use the separate populator function
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
                // Fetch data needed for the modal
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

                // Render management lists (make sure these are defined elsewhere or imported)
                renderExchangeManagementList();
                renderAccountHolderManagementList();
                renderAdviceSourceManagementList();

                // Reset tabs and panels to default state
                settingsTabsContainer?.querySelectorAll('.settings-tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
                settingsModal.querySelectorAll('.settings-panel').forEach((panel, index) => panel.classList.toggle('active', index === 0));
                dataManagementPanel?.querySelectorAll('.sub-tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
                dataManagementPanel?.querySelectorAll('.sub-tab-panel').forEach((panel, index) => panel.classList.toggle('active', index === 0));

                settingsModal.classList.add('visible');
            } catch (error) {
                 console.error("Error opening settings modal:", error);
                 showToast(`Could not load all settings data: ${error.message}`, "error");
            }
        });
    }

    // --- Settings Modal Saving ---
    if (saveSettingsBtn && settingsModal) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings(); // Assumes saveSettings includes necessary validation or handles defaults
            settingsModal.classList.remove('visible');
            showToast('Settings saved!', 'success');
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

    // --- Settings Modal Main Tab Navigation --- (Use setActiveTab)
    if (settingsTabsContainer && settingsModal) {
        settingsTabsContainer.addEventListener('click', (e) => {
            console.log("Main settings tab clicked!");
            const target = /** @type {HTMLElement} */ (e.target);
            // Ensure we're clicking a button, it's a settings-tab, and not already active
            if (target.tagName === 'BUTTON' && target.classList.contains('settings-tab') && !target.classList.contains('active')) {
                // Call helper function
                setActiveTab(
                    settingsTabsContainer, // containerElement
                    target,                // clickedTabElement
                    settingsModal,         // scopeElement for panels
                    '.settings-panel',     // panelSelector
                    'data-tab',            // tabAttribute (using 'data-tab')
                    '#',                   // panelIdPrefix
                    '-settings-panel'      // panelIdSuffix
                );
            } else {
                console.log("Main tab click ignored (not a valid, inactive tab button)");
            }
        });
    } else {
        console.warn("Could not find settings tabs container or settings modal for main tab events.");
    }

    // --- Sub-Tab Switching within Data Management --- (Use setActiveTab)
    if (dataManagementPanel) {
        const subTabsContainer = dataManagementPanel.querySelector('.sub-tabs');
        if (subTabsContainer) {
            subTabsContainer.addEventListener('click', (e) => {
                console.log("Data management sub-tab clicked!");
                const target = /** @type {HTMLElement} */ (e.target);
                // Ensure we're clicking a button, it's a sub-tab, and not already active
                if (target.tagName === 'BUTTON' && target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                    // Call helper function
                    setActiveTab(
                        subTabsContainer,   // containerElement
                        target,             // clickedTabElement
                        dataManagementPanel,// scopeElement for panels (panels are inside dataManagementPanel)
                        '.sub-tab-panel',   // panelSelector
                        'data-sub-tab',     // tabAttribute (using 'data-sub-tab')
                        '#'                 // panelIdPrefix (panel IDs match data-sub-tab directly)
                        // No panelIdSuffix needed here
                    );
                } else {
                    console.log("Sub-tab click ignored (not a valid, inactive sub-tab button)");
                }
            });
        } else {
             console.warn("Could not find sub-tabs container within data management panel.");
        }
    } else {
         console.warn("Could not find data management panel for sub-tab events.");
    }

    // --- Exchange Management ---
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
                await fetchAndRenderExchanges(); // Refetch exchanges (updates state)
                newExchangeNameInput.value = '';
                renderExchangeManagementList(); // Re-render the list
                showToast('Exchange added!', 'success');
            } catch (error) { showToast(`Error adding exchange: ${error.message}`, 'error'); }
            finally { addExchangeBtn.disabled = false; }
        });
    }

    if (exchangeList) {
        exchangeList.addEventListener('click', async (e) => {
            console.log("Click detected inside exchangeList."); // Log 1
            const target = /** @type {HTMLElement} */ (e.target);
            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) {
                console.log("Click was not inside a list item (li[data-id])."); // Log 2
                return;
            }
            const id = li.dataset.id;
            console.log(`List item ID: ${id}`); // Log 3

            const nameSpan = /** @type {HTMLElement | null} */ (li.querySelector('.exchange-name'));
            const nameInput = /** @type {HTMLInputElement | null} */ (li.querySelector('.edit-exchange-input'));
            const editBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.edit-exchange-btn'));
            const saveBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.save-exchange-btn'));
            const cancelBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.cancel-exchange-btn'));
            const deleteBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.delete-exchange-btn'));

             if (!nameSpan || !nameInput || !editBtn || !saveBtn || !cancelBtn || !deleteBtn) {
                 console.error("Could not find all necessary elements (span, input, buttons) within the list item."); // Log 4
                 return;
             }
             console.log("Found all elements within list item."); // Log 5

            if (target === editBtn) {
                console.log("Edit button clicked."); // Log 6a
                nameSpan.style.display = 'none';
                nameInput.style.display = '';
                nameInput.focus();
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                saveBtn.style.display = '';
                cancelBtn.style.display = '';
            }
            else if (target === cancelBtn) {
                console.log("Cancel button clicked."); // Log 6b
                nameInput.value = nameSpan.textContent || '';
                nameSpan.style.display = '';
                nameInput.style.display = 'none';
                editBtn.style.display = '';
                deleteBtn.style.display = '';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
            else if (target === saveBtn) {
                console.log("Save button clicked."); // Log 6c
                const newName = nameInput.value.trim();
                // --- Validation ---
                if (!newName) { console.log("Save aborted: Name empty."); return showToast('Exchange name cannot be empty.', 'error'); }
                if (newName.toLowerCase() === nameSpan.textContent?.toLowerCase()) {
                    console.log("Save aborted: No change.");
                    cancelBtn.click(); // Simulate cancel click
                    return;
                }
                 if (state.allExchanges.some(ex => String(ex.id) !== id && ex.name.toLowerCase() === newName.toLowerCase())) {
                    console.log("Save aborted: Name conflict.");
                    return showToast(`Another exchange named "${newName}" already exists.`, 'error');
                 }
                // --- End Validation ---
                console.log(`Attempting to save ID ${id} with new name: ${newName}`); // Log 7
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
                console.log("Delete button clicked."); // Log 6d
                const exchangeName = nameSpan.textContent;
                showConfirmationModal(`Delete Exchange "${exchangeName}"?`, 'This cannot be undone and will fail if the exchange is currently used by any transactions.', async () => {
                    console.log(`Attempting to delete ID ${id} (${exchangeName})`); // Log 8
                    try {
                        const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'DELETE' });
                        await handleResponse(res);
                        await fetchAndRenderExchanges();
                        renderExchangeManagementList(); // Re-render list
                        showToast('Exchange deleted.', 'success');
                    } catch (error) { showToast(`Error deleting exchange: ${error.message}`, 'error'); }
                });
            } else {
                 console.log("Clicked target was not one of the expected buttons:", target); // Log 9
            }
        });
    }

    // --- Account Holder Management ---
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
                await fetchAndPopulateAccountHolders(); // Refetch holders (updates state)
                newAccountHolderNameInput.value = '';
                renderAccountHolderManagementList(); // Re-render list
                showToast('Account holder added!', 'success');
            } catch (error) { showToast(`Error adding account holder: ${error.message}`, 'error'); }
            finally { addAccountHolderBtn.disabled = false; }
        });
    }

    if (accountHolderList) {
        accountHolderList.addEventListener('click', async (e) => {
             console.log("Click detected inside accountHolderList."); // Log 10
             const target = /** @type {HTMLElement} */ (e.target);

             // Ignore clicks on radio buttons or their labels for edit/delete logic
             if (target.matches('input[type="radio"]') || target.matches('label[for^="holder_radio_"]')) {
                 console.log("Click was on radio button or its label, ignoring for edit/delete."); // Log 11
                 // Radio button change itself handles default selection change (handled by saveSettings)
                 return;
             }

            const li = /** @type {HTMLElement | null} */ (target.closest('li[data-id]'));
            if (!li) {
                 console.log("Click was not inside a list item (li[data-id])."); // Log 12
                 return;
            }
            const id = li.dataset.id;
             console.log(`List item ID: ${id}`); // Log 13

            const nameLabel = /** @type {HTMLLabelElement | null} */ (li.querySelector('label.holder-name'));
            const nameInput = /** @type {HTMLInputElement | null} */ (li.querySelector('.edit-holder-input'));
            const editBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.edit-holder-btn'));
            const saveBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.save-holder-btn'));
            const cancelBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.cancel-holder-btn'));
            const deleteBtn = /** @type {HTMLButtonElement | null} */ (li.querySelector('.delete-holder-btn'));

             if (!nameLabel || !nameInput || !editBtn || !saveBtn || !cancelBtn) {
                  console.error("Could not find all necessary elements (label, input, edit/save/cancel buttons) within the list item."); // Log 14
                  return;
             }
             console.log("Found all core elements within list item."); // Log 15

            if (target === editBtn) {
                 console.log("Edit button clicked."); // Log 16a
                 nameLabel.style.display = 'none';
                 nameInput.style.display = '';
                 nameInput.focus();
                 editBtn.style.display = 'none';
                 if (deleteBtn) deleteBtn.style.display = 'none';
                 saveBtn.style.display = '';
                 cancelBtn.style.display = '';
            }
            else if (target === cancelBtn) {
                 console.log("Cancel button clicked."); // Log 16b
                 nameInput.value = nameLabel.textContent || '';
                 nameLabel.style.display = '';
                 nameInput.style.display = 'none';
                 editBtn.style.display = '';
                 if (deleteBtn) deleteBtn.style.display = '';
                 saveBtn.style.display = 'none';
                 cancelBtn.style.display = 'none';
            }
            else if (target === saveBtn) {
                console.log("Save button clicked."); // Log 16c
                const newName = nameInput.value.trim();
                // --- Validation ---
                 if (!newName) { console.log("Save aborted: Name empty."); return showToast('Name cannot be empty.', 'error'); }
                 if (newName.toLowerCase() === nameLabel.textContent?.toLowerCase()) {
                    console.log("Save aborted: No change.");
                    cancelBtn.click();
                    return;
                 }
                  if (state.allAccountHolders.some(h => String(h.id) !== id && h.name.toLowerCase() === newName.toLowerCase())) {
                    console.log("Save aborted: Name conflict.");
                    return showToast(`Another account holder named "${newName}" already exists.`, 'error');
                 }
                // --- End Validation ---
                console.log(`Attempting to save ID ${id} with new name: ${newName}`); // Log 17
                saveBtn.disabled = true;
                try {
                    const res = await fetch(`/api/accounts/holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    await handleResponse(res);
                    await fetchAndPopulateAccountHolders(); // Refreshes state and dropdowns
                    renderAccountHolderManagementList(); // Re-render this list
                    showToast('Account holder updated!', 'success');
                } catch (error) {
                    showToast(`Error updating account holder: ${error.message}`, 'error');
                     saveBtn.disabled = false; // Re-enable only on error
                }
            } else if (deleteBtn && target === deleteBtn) { // Check if deleteBtn exists before checking target
                 console.log("Delete button clicked."); // Log 16d
                 const holderName = nameLabel.textContent;
                 if (String(state.selectedAccountHolderId) === id) {
                      console.log("Delete aborted: Cannot delete selected holder.");
                      return showToast(`Cannot delete the currently selected account holder ("${holderName}"). Please switch accounts first.`, 'error');
                 }
                 showConfirmationModal(`Delete Account Holder "${holderName}"?`, 'This cannot be undone and will fail if the holder has transactions.', async () => {
                    console.log(`Attempting to delete ID ${id} (${holderName})`); // Log 18
                    try {
                        const res = await fetch(`/api/accounts/holders/${id}`, { method: 'DELETE' });
                        await handleResponse(res);
                        // Check if the deleted holder was the default, reset if needed
                        if (String(state.settings.defaultAccountHolderId) === id) {
                             state.settings.defaultAccountHolderId = 1; // Reset to Primary
                             saveSettings(); // Save the updated default
                             showToast('Default account holder was deleted, reset to Primary.', 'info');
                        }
                        await fetchAndPopulateAccountHolders();
                        renderAccountHolderManagementList(); // Re-render list
                        showToast('Account holder deleted.', 'success');
                    } catch (error) { showToast(`Error deleting account holder: ${error.message}`, 'error'); }
                });
            } else if (!target.closest('button')) {
                 console.log("Clicked inside list item, but not on a known button or radio/label."); // Log 19
            } else {
                console.log("Clicked target was not one of the expected buttons:", target); // Log 20
            }
        });
    }

    // --- Advice Sources Management (initializes handlers defined in _journal_settings.js) ---
    // No direct listeners here, but relies on elements existing in the modal

} // <-- End of initializeSettingsHandlers function