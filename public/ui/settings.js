// public/ui/settings.js
/**
 * @file Contains general UI functions related to the settings modal (non-journal specific).
 * @module ui/settings
 */
import { state, updateState } from '../state.js';
import { switchView } from '../event-handlers/_navigation.js';
// --- ADDED: Import the subscription save function ---
import { saveSubscriptions } from '../event-handlers/_modal_manage_subscriptions.js';
// --- END ADDED ---

/**
 * Saves the current general settings from the UI to localStorage and applies them.
 * @returns {Promise<void>}
 */
export async function saveSettings() { // --- MODIFIED: Made async
    // --- ADDED: Call saveSubscriptions first ---
    try {
        await saveSubscriptions();
    } catch (subError) {
        console.error("Failed to save subscriptions:", subError);
        // We can decide whether to stop the whole save or just log the error
        // For now, we'll log it but continue saving the rest of the settings.
        // showToast is already called by saveSubscriptions on error.
    }
    // --- END ADDED ---

    const oldTheme = state.settings.theme;
    
    const newSettings = {
        ...state.settings, // Start with existing settings
        takeProfitPercent: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('take-profit-percent'))).value) || 0,
        stopLossPercent: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('stop-loss-percent'))).value) || 0,
        theme: (/** @type {HTMLSelectElement} */(document.getElementById('theme-selector'))).value,
        font: (/** @type {HTMLSelectElement} */(document.getElementById('font-selector'))).value,
        notificationCooldown: parseInt((/** @type {HTMLInputElement} */(document.getElementById('notification-cooldown'))).value, 10) || 16,
        familyName: (/** @type {HTMLInputElement} */(document.getElementById('family-name'))).value.trim()
    };

    // This logic correctly reads the radio button selection from the "User Management" tab
    const selectedDefaultHolder = /** @type {HTMLInputElement} */ (document.querySelector('input[name="default-holder-radio"]:checked'));
    if (selectedDefaultHolder) {
        newSettings.defaultAccountHolderId = selectedDefaultHolder.value;
    } else {
         newSettings.defaultAccountHolderId = state.settings.defaultAccountHolderId || 1;
    }
    
    updateState({ settings: newSettings });
    
    localStorage.setItem('stockTrackerSettings', JSON.stringify(state.settings));

    applyAppearanceSettings();

    try {
        const { showToast } = await import('../ui/helpers.js');
        // @ts-ignore
        showToast('Settings saved!', 'success');
    } catch(e) {
        console.error("Failed to show toast, helpers not loaded?", e);
    }

    if (state.settings.theme !== oldTheme && state.currentView.type === 'charts') {
        switchView('charts', null);
    }
}

/**
 * Applies the theme and font settings to the document body and page title.
 * @returns {void}
 */
export function applyAppearanceSettings() {
    // ... (this function remains unchanged) ...
    document.body.dataset.theme = state.settings.theme;
    const fontToUse = state.settings.font || 'Inter';
    const fontVar = fontToUse === 'System' ? 'var(--font-system)' : `var(--font-${fontToUse.toLowerCase().replace(' ', '-')})`;
    document.body.style.setProperty('--font-family-base', fontVar);

    const appTitle = document.getElementById('app-title');
    const baseTitle = state.settings.familyName ? `${state.settings.familyName} Portfolio Tracker` : 'Portfolio Tracker';

    if (appTitle) {
        appTitle.textContent = baseTitle;
    }

    let pageTitle = baseTitle;
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        pageTitle = `[DEV] ${baseTitle}`;
        document.body.classList.add('env-development');
    } else {
        document.body.classList.remove('env-development');
    }
    document.title = pageTitle;
}

/**
 * Renders the list of exchanges in the settings modal for management.
 * @returns {void}
 */
export function renderExchangeManagementList() {
    // ... (this function remains unchanged) ...
    const list = document.getElementById('exchange-list');
    if (!list) return;
    list.innerHTML = '';

    if (!state.allExchanges || state.allExchanges.length === 0) {
         list.innerHTML = '<li>No exchanges defined yet.</li>';
         return;
    }

    const sortedExchanges = [...state.allExchanges].sort((a, b) => a.name.localeCompare(b.name));

    sortedExchanges.forEach(exchange => {
        const li = document.createElement('li');
        li.dataset.id = String(exchange.id);
        const escapeHTML = (str) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
        const escapedName = escapeHTML(exchange.name);

        li.innerHTML = `
            <span class="exchange-name">${escapedName}</span>
            <input type="text" class="edit-exchange-input" value="${escapedName}" style="display: none;">
            <div>
                <button type="button" class="edit-exchange-btn" data-id="${exchange.id}">Edit</button>
                <button type="button" class="save-exchange-btn" data-id="${exchange.id}" style="display: none;">Save</button>
                <button type="button" class="cancel-exchange-btn cancel-btn" data-id="${exchange.id}" style="display: none;">Cancel</button>
                <button type="button" class="delete-exchange-btn delete-btn" data-id="${exchange.id}">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}

/**
 * Renders the list of account holders in the settings modal for management.
 * @returns {void}
 */
export function renderAccountHolderManagementList() {
    // ... (this function remains unchanged) ...
    const list = document.getElementById('account-holder-list');
    const secondaryList = document.getElementById('holder-list-secondary');
    if (secondaryList) {
        console.warn("Found 'holder-list-secondary', this is deprecated and should be removed from _modal_settings.html.");
        secondaryList.innerHTML = '<li>This list is deprecated. Please use the "User Management" tab.</li>';
    }

    if (!list) {
        console.warn("Could not find '#account-holder-list' to render.");
        return;
    }
    list.innerHTML = '';

     if (!state.allAccountHolders || state.allAccountHolders.length === 0) {
         list.innerHTML = '<li>No account holders found (this should not happen - Primary should exist).</li>';
         return;
    }

    const sortedHolders = [...state.allAccountHolders].sort((a, b) => a.name.localeCompare(b.name));
    const defaultHolderIdStr = String(state.settings.defaultAccountHolderId || '1');

    sortedHolders.forEach(holder => {
        const holderIdStr = String(holder.id);
        const isDefault = defaultHolderIdStr === holderIdStr;
        const isProtected = holder.id == 1; // Primary account
        
        const deleteButton = isProtected ? '' : `<button type="button" class="delete-holder-btn delete-btn" data-id="${holder.id}">Delete</button>`;
        
        const escapeHTML = (str) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
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