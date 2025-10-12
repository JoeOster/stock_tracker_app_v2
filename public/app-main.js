// Portfolio Tracker V3.0.5
// public/app-main.js

/* global Chart */

import { state } from './state.js';
import { initializeAllEventListeners } from './event-handlers/_init.js';
import { renderTabs, renderDailyReport, renderLedger, renderChartsPage, renderSnapshotsPage, renderOrdersPage, renderAlertsPage } from './ui/renderers.js';
import { populatePricesFromCache, getCurrentESTDateString, showToast, getMostRecentTradingDay } from './ui/helpers.js';
import { updatePricesForView, fetchPendingOrders, fetchAlerts, fetchDailyPerformance, fetchPositions } from './api.js'; // Import the new fetch functions
import { initializeScheduler } from './scheduler.js';

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
 * Switches the main view of the application, rendering the appropriate page.
 * @param {string} viewType - The type of view to switch to (e.g., 'date', 'charts').
 * @param {string|null} viewValue - The value associated with the view (e.g., a specific date).
 * @returns {Promise<void>}
 */
export async function switchView(viewType, viewValue) {
    state.currentView = { type: viewType, value: viewValue };
    renderTabs(state.currentView);
    (/** @type {HTMLSelectElement} */(document.getElementById('global-account-holder-filter'))).value = state.selectedAccountHolderId;

    document.querySelectorAll('.page-container').forEach(/** @param {HTMLElement} c */ c => c.style.display = 'none');

    const containerIdMap = {
        'ledger': 'ledger-page-container',
        'orders': 'orders-page-container',
        'alerts': 'alerts-page-container',
        'snapshots': 'snapshots-page-container',
        'imports': 'imports-page-container',
        'charts': 'charts-container',
        'date': 'daily-report-container'
    };

    const finalContainerId = containerIdMap[viewType] || `${viewType}-container`;
    const pageContainer = document.getElementById(finalContainerId);

    if (pageContainer) {
        pageContainer.style.display = 'block';
    }

    if (viewType === 'date') {
        // --- REFACTORED ORCHESTRATION ---
        // Set loading states before fetching
        const performanceSummary = document.getElementById('daily-performance-summary');
        if(performanceSummary) { performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>--</span></h3><h3 id="total-value-summary">Total Open Value: <span>--</span></h3>`; }
        const logBody = document.querySelector('#log-body');
        const summaryBody = document.querySelector('#positions-summary-body');
        if(logBody) logBody.innerHTML = `<tr><td colspan="12">Loading...</td></tr>`;
        if(summaryBody) summaryBody.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;

        try {
            // Fetch all required data in parallel
            const [perfData, positionData] = await Promise.all([
                fetchDailyPerformance(viewValue, state.selectedAccountHolderId),
                fetchPositions(viewValue, state.selectedAccountHolderId)
            ]);
            
            // Pass the fetched data to the renderer
            renderDailyReport(viewValue, state.activityMap, perfData, positionData);

            // Fetch live prices for the newly rendered positions
            await updatePricesForView(viewValue, state.activityMap, state.priceCache);
            populatePricesFromCache(state.activityMap, state.priceCache);
        } catch (error) {
            console.error("Failed to load daily report:", error);
            showToast(error.message, 'error');
            // Render error state using the now-pure renderer
            renderDailyReport(viewValue, state.activityMap, null, null);
             if(logBody) logBody.innerHTML = `<tr><td colspan="12">Error loading transaction data.</td></tr>`;
             if(summaryBody) summaryBody.innerHTML = '<tr><td colspan="10">Error loading position data.</td></tr>';
        }
        // --- END REFACTOR ---
    } else if (viewType === 'charts') {
        await new Promise(resolve => setTimeout(resolve, 50));
        await refreshSnapshots();
        await renderChartsPage();
    } else if (viewType === 'ledger') {
        await refreshLedger();
    } else if (viewType === 'orders') {
        const tableBody = document.querySelector('#pending-orders-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7">Loading active orders...</td></tr>';
        }
        try {
            const orders = await fetchPendingOrders(state.selectedAccountHolderId);
            renderOrdersPage(orders);
        } catch (error) {
            console.error("Failed to load orders page:", error);
            showToast(error.message, 'error');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7">Error loading pending orders.</td></tr>';
            }
        }
    } else if (viewType === 'alerts') {
        const tableBody = document.querySelector('#alerts-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="3">Loading alerts...</td></tr>';
        }
        try {
            const alerts = await fetchAlerts(state.selectedAccountHolderId);
            renderAlertsPage(alerts);
        } catch (error) {
            console.error("Failed to load alerts page:", error);
            showToast(error.message, 'error');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="3">Error loading alerts.</td></tr>';
            }
        }
    } else if (viewType === 'snapshots') {
        await refreshSnapshots();
        renderSnapshotsPage();
    }

    const headerSummary = /** @type {HTMLElement} */ (document.getElementById('header-daily-summary'));
    if (headerSummary) {
        headerSummary.style.display = viewType === 'date' ? 'block' : 'none';
    }
}

/**
 * Fetches the latest transactions and re-renders the ledger view.
 * @returns {Promise<void>}
 */
export async function refreshLedger() {
    try {
        const res = await fetch(`/api/transactions?holder=${state.selectedAccountHolderId}`);
        if (!res.ok) throw new Error('Failed to fetch latest transactions');
        state.allTransactions = await res.json();
        renderLedger(state.allTransactions, state.ledgerSort);
    } catch (error) { console.error("Failed to refresh ledger:", error); showToast("Could not refresh the ledger.", "error"); }
}

/**
 * Fetches the latest account snapshots from the server.
 * @returns {Promise<void>}
 */
export async function refreshSnapshots() {
     try {
        const res = await fetch(`/api/utility/snapshots?holder=${state.selectedAccountHolderId}`);
        if(res.ok) state.allSnapshots = await res.json();
    } catch (e) { console.error("Could not fetch snapshots", e); }
}

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
 * Applies the theme and font settings to the document body.
 * @returns {void}
 */
function applyAppearanceSettings() {
    document.body.dataset.theme = state.settings.theme;
    const fontVar = state.settings.font === 'System' ? 'var(--font-system)' : `var(--font-${state.settings.font.toLowerCase().replace(' ', '-')})`;
    document.body.style.setProperty('--font-family-base', fontVar);

    const appTitle = document.getElementById('app-title');
    if (appTitle) {
        appTitle.textContent = state.settings.familyName ? `${state.settings.familyName} Portfolio Tracker` : 'Live Stock Tracker';
    }
}

/**
 * Sorts a table by a specific column.
 * @param {HTMLTableCellElement} th - The table header element that was clicked.
 * @param {HTMLTableSectionElement} tbody - The tbody element of the table to sort.
 * @returns {void}
 */
export function sortTableByColumn(th, tbody) {
    const column = th.cellIndex;
    const dataType = th.dataset.type || 'string';
    let direction = th.classList.contains('sorted-asc') ? 'desc' : 'asc';
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        let valA = a.cells[column]?.textContent.trim() || '';
        let valB = b.cells[column]?.textContent.trim() || '';
        if (dataType === 'numeric') {
            valA = parseFloat(valA.replace(/[$,\(\)]/g, '')) || 0;
            valB = parseFloat(valB.replace(/[$,\(\)]/g, '')) || 0;
            return direction === 'asc' ? valA - valB : valB - valA;
        } else {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
    });
    const allHeaders = th.parentElement.children;
    for (const header of allHeaders) {
        header.classList.remove('sorted-asc', 'sorted-desc');
    }
    th.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    tbody.append(...rows);
}

/**
 * Fetches the list of exchanges and populates all relevant dropdowns.
 * @returns {Promise<void>}
 */
export async function fetchAndRenderExchanges() {
    try {
        const response = await fetch('/api/accounts/exchanges');
        state.allExchanges = await response.json();
        populateAllExchangeDropdowns();
    } catch (error) {
        showToast('Could not load exchanges.', 'error');
    }
}

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
        state.allExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            select.appendChild(option);
        });
        select.value = currentVal;
    });
}

/**
 * Fetches the list of account holders and populates all relevant dropdowns.
 * @returns {Promise<void>}
 */
export async function fetchAndPopulateAccountHolders() {
    try {
        const response = await fetch('/api/accounts/holders');
        state.allAccountHolders = await response.json();

        const holderSelects = document.querySelectorAll('.account-holder-select');
        holderSelects.forEach(/** @param {HTMLSelectElement} select */ select => {
            select.innerHTML = '';

            if(select.id === 'global-account-holder-filter') {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Accounts';
                select.appendChild(allOption);
            } else {
                 const defaultOption = document.createElement('option');
                defaultOption.value = "";
                defaultOption.textContent = "Select Holder";
                defaultOption.disabled = true;
                select.appendChild(defaultOption);
            }

            state.allAccountHolders.forEach(holder => {
                const option = document.createElement('option');
                option.value = holder.id;
                option.textContent = holder.name;
                select.appendChild(option);
            });
        });

    } catch (error) {
        showToast('Could not load account holders.', 'error');
    }
}

/**
 * Placeholder function for a failover check for end-of-day processes.
 * @returns {Promise<void>}
 */
async function runEodFailoverCheck() { /* Unchanged */ }
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

    const { autosizeAccountSelector } = await import('./event-handlers/_navigation.js');
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
                    if (alertTab) {
                        alertTab.textContent = 'Alerts ❗';
                    }
                    lastToastTimestamp = now;
                } else if (notifications.length === 0) {
                    const alertTab = document.querySelector('.master-tab[data-view-type="alerts"]');
                    if (alertTab) {
                        alertTab.textContent = 'Alerts';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, 15000); // Poll every 15 seconds
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initialize);