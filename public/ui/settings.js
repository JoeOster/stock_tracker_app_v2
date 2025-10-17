// public/ui/settings.js
// Version 0.1.1
/**
 * @file Contains all UI functions related to the settings modal.
 * @module ui/settings
 */
// FIX: Correct all relative import paths.
import { state } from '../state.js';
import { switchView } from '../event-handlers/_navigation.js';

/**
 * Saves the current settings from the UI to localStorage and applies them.
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
        state.settings.defaultAccountHolderId = null;
    }
    localStorage.setItem('stockTrackerSettings', JSON.stringify(state.settings));

    applyAppearanceSettings();

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
    const fontVar = state.settings.font === 'System' ? 'var(--font-system)' : `var(--font-${state.settings.font.toLowerCase().replace(' ', '-')})`;
    document.body.style.setProperty('--font-family-base', fontVar);

    const appTitle = document.getElementById('app-title');
    const baseTitle = state.settings.familyName ? `${state.settings.familyName} Portfolio Tracker` : 'Live Stock Tracker';

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
    list.innerHTML = '';

    state.allExchanges.forEach(exchange => {
        const li = document.createElement('li');
        li.dataset.id = String(exchange.id);
        li.innerHTML = `
            <span class="exchange-name">${exchange.name}</span>
            <input type="text" class="edit-exchange-input" value="${exchange.name}" style="display: none;">
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
    list.innerHTML = '';

    state.allAccountHolders.forEach(holder => {
        const isDefault = state.settings.defaultAccountHolderId == holder.id;
        const isProtected = holder.id == 1;
        const deleteButton = isProtected ? '' : `<button class="delete-holder-btn delete-btn" data-id="${holder.id}">Delete</button>`;

        const li = document.createElement('li');
        li.dataset.id = String(holder.id);
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="radio" id="holder_radio_${holder.id}" name="default-holder-radio" value="${holder.id}" ${isDefault ? 'checked' : ''}>
                <label for="holder_radio_${holder.id}" class="holder-name">${holder.name}</label>
                <input type="text" class="edit-holder-input" value="${holder.name}" style="display: none;">
            </div>
            <div>
                <button class="edit-holder-btn" data-id="${holder.id}">Edit</button>
                <button class="save-holder-btn" data-id="${holder.id}" style="display: none;">Save</button>
                <button class="cancel-holder-btn" data-id="${holder.id}" style="display: none;">Cancel</button>
                ${deleteButton}
            </div>
        `;
        list.appendChild(li);
    });
}