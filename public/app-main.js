// public/app-main.js

/* global Chart, Papa */

import { state } from './state.js';
import { initializeAllEventListeners } from './event-handlers/_init.js';
import { renderTabs } from './ui/renderers.js';
import { getCurrentESTDateString, getMostRecentTradingDay } from './ui/helpers.js';
import { initializeScheduler } from './scheduler.js';
import { applyAppearanceSettings } from './ui/settings.js';
import { fetchAndPopulateAccountHolders, fetchAndRenderExchanges } from './event-handlers/_settings.js';
import { autosizeAccountSelector, switchView } from './event-handlers/_navigation.js';

/**
 * Loads an HTML template from a URL and appends it to a target element.
 * @param {string} url - The URL of the HTML template to load.
 * @param {string} targetId - The ID of the element to append the template to.
 * @returns {Promise<void>}
 */
async function loadHTML(url, targetId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load template: ${url}`);
        const text = await response.text();
        const target = document.getElementById(targetId);
        if (target) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            while (tempDiv.firstChild) {
                target.appendChild(tempDiv.firstChild);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Placeholder function for a failover check for end-of-day processes.
 * @returns {Promise<void>}
 */
async function runEodFailoverCheck() { /* Unchanged */ }

/**
 * Initializes the application on page load.
 * @returns {Promise<void>}
 */
async function initialize() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    await Promise.all([
        loadHTML('/templates/_dailyReport.html', 'main-content'),
        loadHTML('/templates/_charts.html', 'main-content'),
        loadHTML('/templates/_ledger.html', 'main-content'),
        loadHTML('/templates/_orders.html', 'main-content'),
        loadHTML('/templates/_alerts.html', 'main-content'),
        loadHTML('/templates/_snapshots.html', 'main-content'),
        loadHTML('/templates/_imports.html', 'main-content'),
        loadHTML('/templates/_modals.html', 'modal-container')
    ]);

    const loadSettings = () => {
        const savedSettings = localStorage.getItem('stockTrackerSettings');
        if (savedSettings) { state.settings = { ...state.settings, ...JSON.parse(savedSettings) }; }
        (/** @type {HTMLInputElement} */(document.getElementById('take-profit-percent'))).value = String(state.settings.takeProfitPercent);
        (/** @type {HTMLInputElement} */(document.getElementById('stop-loss-percent'))).value = String(state.settings.stopLossPercent);
        (/** @type {HTMLInputElement} */(document.getElementById('notification-cooldown'))).value = String(state.settings.notificationCooldown);
        const themeSelector = /** @type {HTMLSelectElement} */(document.getElementById('theme-selector'));
        if(themeSelector) themeSelector.value = state.settings.theme;
        const fontSelector = /** @type {HTMLSelectElement} */(document.getElementById('font-selector'));
        if(fontSelector) fontSelector.value = state.settings.font;
        const familyNameInput = /** @type {HTMLInputElement} */(document.getElementById('family-name'));
        if(familyNameInput) familyNameInput.value = state.settings.familyName;
        applyAppearanceSettings();
    };
    loadSettings();
    await fetchAndRenderExchanges();
    await fetchAndPopulateAccountHolders();

    initializeAllEventListeners();
    await runEodFailoverCheck();

    const today = getCurrentESTDateString();
    const viewDate = getMostRecentTradingDay();

    const transactionDateInput = /** @type {HTMLInputElement} */ (document.getElementById('transaction-date'));
    if(transactionDateInput) transactionDateInput.value = today;

    const globalHolderFilter = /** @type {HTMLSelectElement} */(document.getElementById('global-account-holder-filter'));
    if (state.settings.defaultAccountHolderId && state.allAccountHolders.some(h => String(h.id) === state.settings.defaultAccountHolderId)) {
        globalHolderFilter.value = state.settings.defaultAccountHolderId;
        state.selectedAccountHolderId = state.settings.defaultAccountHolderId;
    } else if (globalHolderFilter.options.length > 1) {
        globalHolderFilter.value = 'all';
        state.selectedAccountHolderId = 'all';
    }
    
    autosizeAccountSelector(globalHolderFilter);

    await switchView('date', viewDate);
    initializeScheduler(state);
    initializeNotificationService();
}

/**
 * Initializes a polling service to check for new notifications.
 * @returns {void}
 */
function initializeNotificationService() {
    let lastToastTimestamp = 0;

    setInterval(async () => {
        try {
            const response = await fetch(`/api/orders/notifications?holder=${state.selectedAccountHolderId}`);
            if (response.ok) {
                const notifications = await response.json();
                const now = Date.now();
                const cooldown = (state.settings.notificationCooldown || 15) * 60 * 1000;

                if (notifications.length > 0 && (now - lastToastTimestamp > cooldown)) {
                    const alertTab = document.querySelector('.master-tab[data-view-type="alerts"]');
                    if (alertTab) alertTab.textContent = 'Alerts ❗';
                } else if (notifications.length === 0) {
                    const alertTab = document.querySelector('.master-tab[data-view-type="alerts"]');
                    if (alertTab) alertTab.textContent = 'Alerts';
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, 15000);
}

document.addEventListener('DOMContentLoaded', initialize);