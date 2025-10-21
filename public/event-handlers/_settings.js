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
    // ... (keep existing variable declarations at the top) ...
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
    // ... (keep the settingsBtn click listener code here, make sure the previously commented out sections are uncommented now) ...
     if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', async () => {
            try {
                // --- Re-enable data fetching and rendering ---
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
                 showToast(`Could not load all settings data: ${error.message}`, "error");
            }
        });
    }

    // --- Settings Modal Saving ---
    // ... (keep save logic) ...
    if (saveSettingsBtn && settingsModal) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings();
            settingsModal.classList.remove('visible');
            showToast('Settings saved!', 'success');
        });
    }


    // --- Generic Modal Closing ---
    // ... (keep closing logic) ...
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
    // ... (keep appearance logic) ...
     if (themeSelector) themeSelector.addEventListener('change', () => { state.settings.theme = themeSelector.value; applyAppearanceSettings(); });
     if (fontSelector) fontSelector.addEventListener('change', () => { state.settings.font = fontSelector.value; applyAppearanceSettings(); });


    // --- Settings Modal Main Tab Navigation --- ADD LOGGING HERE ---
    if (settingsTabsContainer && settingsModal) {
        settingsTabsContainer.addEventListener('click', (e) => {
            console.log("Main settings tab clicked!"); // <-- ADD LOG
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.tagName === 'BUTTON' && target.classList.contains('settings-tab') && !target.classList.contains('active')) {
                const tabId = target.dataset.tab;
                console.log("Target data-tab:", tabId); // <-- ADD LOG
                if (!tabId) {
                     console.log("No data-tab found on clicked element."); // <-- ADD LOG
                     return;
                }

                settingsTabsContainer.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
                settingsModal.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));

                target.classList.add('active');
                const panelId = `${tabId}-settings-panel`;
                console.log("Looking for panel ID:", panelId); // <-- ADD LOG
                const panelToShow = settingsModal.querySelector(`#${panelId}`);
                if (panelToShow) {
                    console.log("Found panel, setting active:", panelToShow); // <-- ADD LOG
                    panelToShow.classList.add('active');
                } else {
                    console.error("Could not find panel with ID:", panelId); // <-- Change to error log
                }
            } else {
                 console.log("Click ignored (not a tab button or already active/other element)"); // <-- ADD LOG
            }
        });
    } else {
        console.warn("Could not find settings tabs container or settings modal for main tab events.");
    }


    // --- Sub-Tab Switching within Data Management --- ADD LOGGING HERE ---
    if (dataManagementPanel) {
        const subTabsContainer = dataManagementPanel.querySelector('.sub-tabs');
        if (subTabsContainer) {
            subTabsContainer.addEventListener('click', (e) => {
                console.log("Data management sub-tab clicked!"); // <-- ADD LOG
                const target = /** @type {HTMLElement} */ (e.target);
                if (target.tagName === 'BUTTON' && target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                    const subTabId = target.dataset.subTab; // e.g., "exchanges-panel"
                    console.log("Target data-sub-tab:", subTabId); // <-- ADD LOG
                    if (!subTabId) {
                        console.log("No data-sub-tab found on clicked element."); // <-- ADD LOG
                        return;
                    }

                    subTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                    dataManagementPanel.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                    target.classList.add('active');
                    console.log("Looking for sub-panel ID:", subTabId); // <-- ADD LOG
                    const subPanelToShow = dataManagementPanel.querySelector(`#${subTabId}`);
                    if (subPanelToShow) {
                        console.log("Found sub-panel, setting active:", subPanelToShow); // <-- ADD LOG
                        subPanelToShow.classList.add('active');
                    } else {
                        console.error("Could not find sub-panel with ID:", subTabId); // <-- Change to error log
                    }
                } else {
                     console.log("Sub-tab click ignored (not a sub-tab button or already active/other element)"); // <-- ADD LOG
                }
            });
        } else {
             console.warn("Could not find sub-tabs container within data management panel.");
        }
    } else {
         console.warn("Could not find data management panel for sub-tab events.");
    }

    // --- Exchange Management ---
    // ... (keep exchange management logic) ...

    // --- Account Holder Management ---
    // ... (keep account holder management logic) ...

} // <-- End of initializeSettingsHandlers function