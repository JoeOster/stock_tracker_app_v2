// public/ui/settings.js
// Version Updated
/**
 * @file Contains general UI functions related to the settings modal (non-journal specific).
 * @module ui/settings
 */
import { state } from '../state.js';
import { switchView } from '../event-handlers/_navigation.js';

/**
 * Saves the current general settings from the UI to localStorage and applies them.
 * @returns {void}
 */
export function saveSettings() {
    const oldTheme = state.settings.theme;
    state.settings.takeProfitPercent = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('take-profit-percent'))).value) || 0;
    state.settings.stopLossPercent = parseFloat((/** @type {HTMLInputElement} */(document.getElementById('stop-loss-percent'))).value) || 0;
    state.settings.theme = (/** @type {HTMLSelectElement} */(document.getElementById('theme-selector'))).value;
    state.settings.font = (/** @type {HTMLSelectElement} */(document.getElementById('font-selector'))).value;
    state.settings.notificationCooldown = parseInt((/** @type {HTMLInputElement} */(document.getElementById('notification-cooldown'))).value, 10) || 16;
    state.settings.familyName = (/** @type {HTMLInputElement} */(document.getElementById('family-name'))).value.trim();

    const selectedDefaultHolder = /** @type {HTMLInputElement} */ (document.querySelector('input[name="default-holder-radio"]:checked'));
    if (selectedDefaultHolder) {
        state.settings.defaultAccountHolderId = selectedDefaultHolder.value;
    } else {
         // Keep the existing default if none is selected (shouldn't happen with radios?)
         // Or default to 1 if necessary:
         state.settings.defaultAccountHolderId = state.settings.defaultAccountHolderId || 1;
    }
    localStorage.setItem('stockTrackerSettings', JSON.stringify(state.settings));

    applyAppearanceSettings();

    // Reload chart view if theme changed
    if (state.settings.theme !== oldTheme && state.currentView.type === 'charts') {
        switchView('charts', null);
    }
}

/**
 * Applies the theme and font settings to the document body and page title.
 * @returns {void}
 */
export function applyAppearanceSettings() {
    document.body.dataset.theme = state.settings.theme;
    const fontToUse = state.settings.font || 'Inter'; // Default to Inter if setting is missing
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
    }
    document.title = pageTitle;
}

/**
 * Renders the list of exchanges in the settings modal for management.
 * @returns {void}
 */
export function renderExchangeManagementList() {
    const list = document.getElementById('exchange-list');
    if (!list) return;
    list.innerHTML = ''; // Clear previous content

    if (!state.allExchanges || state.allExchanges.length === 0) {
         list.innerHTML = '<li>No exchanges defined yet.</li>';
         return;
    }

    const sortedExchanges = [...state.allExchanges].sort((a, b) => a.name.localeCompare(b.name));

    sortedExchanges.forEach(exchange => {
        const li = document.createElement('li');
        li.dataset.id = String(exchange.id);
        // Added escaping for potential user-inputted HTML in names
        const escapeHTML = (str) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
        const escapedName = escapeHTML(exchange.name);

        li.innerHTML = `
            <span class="exchange-name">${escapedName}</span>
            <input type="text" class="edit-exchange-input" value="${escapedName}" style="display: none;">
            <div>
                <button class="edit-exchange-btn" data-id="${exchange.id}">Edit</button>
                <button class="save-exchange-btn" data-id="${exchange.id}" style="display: none;">Save</button>
                <button class="cancel-exchange-btn" data-id="${exchange.id}" style="display: none;">Cancel</button>
                <button class="delete-exchange-btn delete-btn" data-id="${exchange.id}">Delete</button>
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
    const list = document.getElementById('account-holder-list');
    if (!list) return;
    list.innerHTML = ''; // Clear previous content

     if (!state.allAccountHolders || state.allAccountHolders.length === 0) {
         list.innerHTML = '<li>No account holders found (this should not happen - Primary should exist).</li>';
         return;
    }

    const sortedHolders = [...state.allAccountHolders].sort((a, b) => a.name.localeCompare(b.name));

    sortedHolders.forEach(holder => {
        // Use == for comparison as defaultAccountHolderId might be string or number
        const isDefault = state.settings.defaultAccountHolderId == holder.id;
        const isProtected = holder.id == 1; // Primary account (ID 1) is protected
        const deleteButton = isProtected ? '' : `<button class="delete-holder-btn delete-btn" data-id="${holder.id}">Delete</button>`;

        // Added escaping for potential user-inputted HTML in names
        const escapeHTML = (str) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
        const escapedName = escapeHTML(holder.name);

        const li = document.createElement('li');
        li.dataset.id = String(holder.id);
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-grow: 1;"> <input type="radio" id="holder_radio_${holder.id}" name="default-holder-radio" value="${holder.id}" ${isDefault ? 'checked' : ''} style="flex-shrink: 0;">
                <label for="holder_radio_${holder.id}" class="holder-name">${escapedName}</label>
                <input type="text" class="edit-holder-input" value="${escapedName}" style="display: none; width: 100%;"> </div>
            <div style="flex-shrink: 0;"> <button class="edit-holder-btn" data-id="${holder.id}">Edit</button>
                <button class="save-holder-btn" data-id="${holder.id}" style="display: none;">Save</button>
                <button class="cancel-holder-btn" data-id="${holder.id}" style="display: none;">Cancel</button>
                ${deleteButton}
            </div>
        `;
        // Apply flex styles directly to li for better control
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';
        li.style.gap = '10px'; // Add gap between name/input group and buttons

        list.appendChild(li);
    });
}