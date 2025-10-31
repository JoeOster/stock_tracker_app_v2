// public/event-handlers/_settings_modal.js
/**
 * @file Initializes event handlers for the core Settings modal functionality (open, close, save, main tabs, appearance).
 * @module event-handlers/_settings_modal
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import {
    saveSettings,
    applyAppearanceSettings,
    renderExchangeManagementList, // Still need renderers called on open
    renderAccountHolderManagementList
} from '../ui/settings.js';
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';
// Import fetching functions needed *before* opening the modal
import { fetchAndRenderExchanges } from './_settings_exchanges.js';
import { fetchAndPopulateAccountHolders } from './_settings_holders.js';
// --- MODIFIED: Import the NEW settings-specific fetcher ---
import { fetchAllAdviceSourcesForSettings } from './_journal_settings.js';

/**
 * Helper function to set the active tab and panel within a tab group.
 * @param {Element} containerElement - The container holding the tab buttons.
 * @param {HTMLElement} clickedTabElement - The specific tab button clicked.
 * @param {Element | null} scopeElement - The element to search for panels within.
 * @param {string} panelSelector - CSS selector for the panels.
 * @param {string} tabAttribute - The data attribute on the tab button (e.g., 'data-tab').
 * @param {string} [panelIdPrefix='#'] - Prefix for the panel ID selector.
 * @param {string} [panelIdSuffix=''] - Suffix for the panel ID selector.
 * @returns {void}
 */
export function setActiveTab(containerElement, clickedTabElement, scopeElement, panelSelector, tabAttribute, panelIdPrefix = '#', panelIdSuffix = '') {
    const tabId = clickedTabElement.getAttribute(tabAttribute);
    // console.log(`setActiveTab called. Target ID from attribute [${tabAttribute}]:`, tabId); // Keep for debugging if needed

    if (!tabId) {
        console.error("setActiveTab: Clicked tab is missing the required data attribute:", tabAttribute);
        return;
    }
    if (!scopeElement) {
        console.error("setActiveTab: Scope element is null.");
        return;
    }

    const tabClass = clickedTabElement.classList[0];
    if (tabClass) {
        containerElement.querySelectorAll(`.${tabClass}`).forEach(tab => tab.classList.remove('active'));
    } else {
        console.warn("setActiveTab: Clicked tab element has no classes to identify siblings.");
    }

    scopeElement.querySelectorAll(panelSelector).forEach(panel => panel.classList.remove('active'));
    clickedTabElement.classList.add('active');

    const panelIdSelector = `${panelIdPrefix}${tabId}${panelIdSuffix}`;
    // console.log("setActiveTab: Looking for panel selector:", panelIdSelector, "within scope:", scopeElement);
    const panelToShow = scopeElement.querySelector(panelIdSelector);
    if (panelToShow) {
        // console.log("setActiveTab: Found panel, setting active:", panelToShow);
        panelToShow.classList.add('active');
    } else {
        console.error("setActiveTab: Could not find panel with selector:", panelIdSelector);
    }
}


/**
 * Initializes core event listeners for the Settings modal.
 * @returns {void}
 */
export function initializeSettingsModalHandlers() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-button');
    const themeSelector = /** @type {HTMLSelectElement} */ (document.getElementById('theme-selector'));
    const fontSelector = /** @type {HTMLSelectElement} */ (document.getElementById('font-selector'));
    const settingsTabsContainer = settingsModal?.querySelector('.settings-tabs'); // Scope search to modal
    const dataManagementPanel = settingsModal?.querySelector('#data-settings-panel'); // Scope search to modal


    // --- Settings Modal Opening ---
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', async () => {
            console.log("Settings button clicked - opening modal...");
            try {
                // Fetch all necessary data before showing/rendering lists
                showToast('Loading settings data...', 'info', 2000);
                // --- MODIFIED: Fetch ALL sources (active/inactive) for the modal ---
                const [_, __, allSources] = await Promise.all([
                    fetchAndRenderExchanges(), // Fetch data needed for exchange list & dropdowns
                    fetchAndPopulateAccountHolders(), // Fetch data needed for holder list & dropdowns
                    fetchAllAdviceSourcesForSettings(state.selectedAccountHolderId) // Fetch ALL sources for settings
                ]);
                // --- END MODIFIED ---

                // --- FIX: Add checks for all elements before setting values ---
                const takeProfitInput = /** @type {HTMLInputElement} */(document.getElementById('take-profit-percent'));
                const stopLossInput = /** @type {HTMLInputElement} */(document.getElementById('stop-loss-percent'));
                const themeSelect = /** @type {HTMLSelectElement} */(document.getElementById('theme-selector'));
                const fontSelect = /** @type {HTMLSelectElement} */(document.getElementById('font-selector'));
                const cooldownInput = /** @type {HTMLInputElement} */(document.getElementById('notification-cooldown'));
                const familyNameInput = /** @type {HTMLInputElement} */(document.getElementById('family-name'));

                if (!takeProfitInput || !stopLossInput || !themeSelect || !fontSelect || !cooldownInput || !familyNameInput) {
                    console.error("Error populating settings: One or more form elements are missing from _modal_settings.html.");
                    throw new Error("Modal UI elements are missing. Check browser cache or template file.");
                }

                // Load current settings values into the form fields
                takeProfitInput.value = String(state.settings.takeProfitPercent || 0);
                stopLossInput.value = String(state.settings.stopLossPercent || 0);
                themeSelect.value = state.settings.theme || 'light';
                fontSelect.value = state.settings.font || 'Inter';
                cooldownInput.value = String(state.settings.notificationCooldown || 16);
                familyNameInput.value = state.settings.familyName || '';
                // --- END FIX ---


                // Render management lists now that data is fetched
                renderExchangeManagementList();
                renderAccountHolderManagementList();
                // --- MODIFIED: Pass the full list of sources to the renderer ---
                renderAdviceSourceManagementList(allSources);

                // Reset tabs and panels to default state (first tab active)
                settingsTabsContainer?.querySelectorAll('.settings-tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
                settingsModal.querySelectorAll('.settings-panel').forEach((panel, index) => panel.classList.toggle('active', index === 0));
                dataManagementPanel?.querySelectorAll('.sub-tab').forEach((tab, index) => tab.classList.toggle('active', index === 0));
                dataManagementPanel?.querySelectorAll('.sub-tab-panel').forEach((panel, index) => panel.classList.toggle('active', index === 0));

                settingsModal.classList.add('visible'); // Show modal
                console.log("Settings modal opened and initialized.");

            } catch (error) {
                 console.error("Error opening settings modal:", error);
                 // @ts-ignore
                 showToast(`Could not load settings data: ${error.message}`, "error");
            }
        });
    } else {
        console.warn("Settings button or modal element not found.");
    }

    // --- Settings Modal Saving ---
    if (saveSettingsBtn && settingsModal) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings(); // saveSettings function is imported from ui/settings.js
            settingsModal.classList.remove('visible');
            showToast('Settings saved!', 'success');
        });
    }

     // --- REMOVED: Generic Modal Closing ---
     // This is now handled globally by initializeModalHandlers() in _modals.js
     // --- END REMOVAL ---

    // --- Live Appearance Updates ---
    if (themeSelector) themeSelector.addEventListener('change', () => { state.settings.theme = themeSelector.value; applyAppearanceSettings(); });
    if (fontSelector) fontSelector.addEventListener('change', () => { state.settings.font = fontSelector.value; applyAppearanceSettings(); });

    // --- Settings Modal Main Tab Navigation ---
    if (settingsTabsContainer && settingsModal) {
        settingsTabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.tagName === 'BUTTON' && target.classList.contains('settings-tab') && !target.classList.contains('active')) {
                setActiveTab(
                    settingsTabsContainer, target, settingsModal,
                    '.settings-panel', 'data-tab', '#', '-settings-panel'
                );
            }
        });
    } else {
        console.warn("Could not find settings tabs container or settings modal for main tab events.");
    }

    // --- Sub-Tab Switching within Data Management ---
    if (dataManagementPanel) {
        const subTabsContainer = dataManagementPanel.querySelector('.sub-tabs');
        if (subTabsContainer) {
            subTabsContainer.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                if (target.tagName === 'BUTTON' && target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                    setActiveTab(
                        subTabsContainer, target, dataManagementPanel,
                        '.sub-tab-panel', 'data-sub-tab', '#'
                    );
                }
            });
        } else {
             console.warn("Could not find sub-tabs container within data management panel.");
        }
    } else {
         console.warn("Could not find data management panel for sub-tab events.");
    }
}