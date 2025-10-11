// public/app-main.js
import { initializeAllEventListeners } from './event-handlers/_init.js'; 
import { renderTabs, renderDailyReport, renderLedger, renderChartsPage, renderSnapshotsPage, renderOrdersPage, renderAlertsPage } from './ui/renderers.js'; 
import { populatePricesFromCache, getCurrentESTDateString, showToast } from './ui/helpers.js';
import { updatePricesForView } from './api.js';
import { initializeScheduler } from './scheduler.js';

export const state = {
    settings: { 
        takeProfitPercent: 8, 
        stopLossPercent: 8, 
        marketHoursInterval: 2, 
        afterHoursInterval: 15, 
        theme: 'light', 
        font: 'Inter', 
        defaultAccountHolderId: null,
        notificationCooldown: 16,
        familyName: ''
    },
    currentView: { type: null, value: null },
    activityMap: new Map(),
    priceCache: new Map(),
    allTransactions: [],
    allSnapshots: [],
    pendingOrders: [],
    activeAlerts: [],
    selectedAccountHolderId: 'all',
    ledgerSort: { column: 'transaction_date', direction: 'desc' },
    allTimeChart: null, fiveDayChart: null, dateRangeChart: null, zoomedChart: null
};

// --- NEW: Helper function to load HTML templates ---
async function loadHTML(url, targetId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load template: ${url}`);
        const text = await response.text();
        const target = document.getElementById(targetId);
        if (target) {
            // Use a temporary div to parse the HTML and append its children
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
        await renderDailyReport(viewValue, state.activityMap);
        await updatePricesForView(viewValue, state.activityMap, state.priceCache);
        populatePricesFromCache(state.activityMap, state.priceCache);
    } else if (viewType === 'charts') {
        await new Promise(resolve => setTimeout(resolve, 50));
        await refreshSnapshots();
        await renderChartsPage(state);
    } else if (viewType === 'ledger') {
        await refreshLedger();
    } else if (viewType === 'orders') {
        await renderOrdersPage();
    } else if (viewType === 'alerts') {
        await renderAlertsPage();        
    } else if (viewType === 'snapshots') {
        await refreshSnapshots();
        renderSnapshotsPage();
    }
    
    const headerSummary = /** @type {HTMLElement} */ (document.getElementById('header-daily-summary'));
    if (headerSummary) {
        headerSummary.style.display = viewType === 'date' ? 'block' : 'none';
    }
}

export async function refreshLedger() {
    try {
        const res = await fetch(`/api/transactions?holder=${state.selectedAccountHolderId}`);
        if (!res.ok) throw new Error('Failed to fetch latest transactions');
        state.allTransactions = await res.json();
        renderLedger(state.allTransactions, state.ledgerSort);
    } catch (error) { console.error("Failed to refresh ledger:", error); showToast("Could not refresh the ledger.", "error"); }
}

export async function refreshSnapshots() {
     try {
        const res = await fetch(`/api/utility/snapshots?holder=${state.selectedAccountHolderId}`);
        if(res.ok) state.allSnapshots = await res.json();
    } catch (e) { console.error("Could not fetch snapshots", e); }
}

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
        switchView('charts');
    }
}

function applyAppearanceSettings() {
    document.body.dataset.theme = state.settings.theme;
    const fontVar = state.settings.font === 'System' ? 'var(--font-system)' : `var(--font-${state.settings.font.toLowerCase().replace(' ', '-')})`;
    document.body.style.setProperty('--font-family-base', fontVar);

    const appTitle = document.getElementById('app-title');
    if (appTitle) {
        appTitle.textContent = state.settings.familyName ? `${state.settings.familyName} Portfolio Tracker` : 'Live Stock Tracker';
    }
}

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

export async function fetchAndRenderExchanges() {
    try {
        const response = await fetch('/api/accounts/holders');
        state.allExchanges = await response.json();
        populateAllExchangeDropdowns(); 
    } catch (error) {
        showToast('Could not load exchanges.', 'error');
    }
}

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

async function runEodFailoverCheck() { /* Unchanged */ }
export function renderExchangeManagementList() {
    const list = document.getElementById('exchange-list');
    if (!list) return;
    list.innerHTML = '';

    state.allExchanges.forEach(exchange => {
        const li = document.createElement('li');
        li.dataset.id = exchange.id;
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

export function renderAccountHolderManagementList() {
    const list = document.getElementById('account-holder-list');
    if (!list) return;
    list.innerHTML = ''; 

    state.allAccountHolders.forEach(holder => {
        const isDefault = state.settings.defaultAccountHolderId == holder.id;
        const isProtected = holder.id == 1;
        const deleteButton = isProtected ? '' : `<button class="delete-holder-btn delete-btn" data-id="${holder.id}">Delete</button>`;

        const li = document.createElement('li');
        li.dataset.id = holder.id;
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

async function initialize() {
    // --- UPDATED: Load all templates on startup ---
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = ''; // Clear it out first
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
    let dateForView = new Date(today + 'T12:00:00Z');
    let dayOfWeek = dateForView.getUTCDay();
    while (dayOfWeek === 0 || dayOfWeek === 6) {
        dateForView.setUTCDate(dateForView.getUTCDate() - 1);
        dayOfWeek = dateForView.getUTCDay();
    }
    const viewDate = dateForView.toISOString().split('T')[0];
    
    const transactionDateInput = /** @type {HTMLInputElement} */ (document.getElementById('transaction-date'));
    if(transactionDateInput) transactionDateInput.value = today;
    
    const globalHolderFilter = /** @type {HTMLSelectElement} */(document.getElementById('global-account-holder-filter'));
    if (state.settings.defaultAccountHolderId && state.allAccountHolders.some(h => h.id == state.settings.defaultAccountHolderId)) {
        globalHolderFilter.value = state.settings.defaultAccountHolderId;
        state.selectedAccountHolderId = state.settings.defaultAccountHolderId;
    } else if (globalHolderFilter.options.length > 1) {
        globalHolderFilter.value = 'all';
        state.selectedAccountHolderId = 'all';
    }
    
    await switchView('date', viewDate);
    initializeScheduler(state);
    initializeNotificationService(); 
}

function initializeNotificationService() {
    let lastToastTimestamp = 0;

    setInterval(async () => {
        try {
            const response = await fetch(`/api/notifications?holder=${state.selectedAccountHolderId}`);
            if (!response.ok) return;

            const unreadNotifications = await response.json();
            const alertsTab = document.querySelector('.tab[data-view-type="alerts"]');

            if (alertsTab) {
                if (unreadNotifications.length > 0) {
                    if (!alertsTab.textContent.includes('⚠️')) {
                        alertsTab.textContent = 'Alerts ⚠️';
                    }
                } else {
                    alertsTab.textContent = 'Alerts';
                }
            }

            const cooldownMinutes = state.settings.notificationCooldown;
            const cooldownMilliseconds = cooldownMinutes * 60 * 1000;
            
            if (unreadNotifications.length > 0 && (Date.now() - lastToastTimestamp > cooldownMilliseconds)) {
                showToast(`You have ${unreadNotifications.length} new alert(s). Check the Alerts tab.`, 'info');
                lastToastTimestamp = Date.now();
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, 30000); 
}
initialize();