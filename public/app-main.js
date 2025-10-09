// public/app-main.js - v2.13 (Corrected Data Flow)
import { initializeEventListeners } from './event-listeners.js';
import { renderTabs, renderDailyReport, renderLedger, renderChartsPage, renderSnapshotsPage, populatePricesFromCache } from './ui/renderers.js';
import { updatePricesForView } from './api.js';
import { getCurrentESTDateString, showToast } from './ui/helpers.js';
import { initializeScheduler } from './scheduler.js';

export const state = {
    settings: { takeProfitPercent: 8, stopLossPercent: 8, marketHoursInterval: 2, afterHoursInterval: 15, theme: 'light', font: 'Inter' },
    currentView: { type: null, value: null },
    activityMap: new Map(),
    priceCache: new Map(),
    allTransactions: [],
    allSnapshots: [],
    allExchanges: [],
    allAccountHolders: [],
    selectedAccountHolderId: 'all',
    ledgerSort: { column: 'transaction_date', direction: 'desc' },
    allTimeChart: null, fiveDayChart: null, dateRangeChart: null, zoomedChart: null
};

export async function switchView(viewType, viewValue) {
    state.currentView = { type: viewType, value: viewValue };
    renderTabs(state.currentView);
    document.getElementById('global-account-holder-filter').value = state.selectedAccountHolderId;

    document.querySelectorAll('.page-container').forEach(c => c.style.display = 'none');

    if (viewType === 'date') {
        document.getElementById('daily-report-container').style.display = 'block';
        await renderDailyReport(viewValue, state.activityMap);
        // This enforces the correct order: fetch prices, THEN populate the UI with them.
        await updatePricesForView(viewValue, state.activityMap, state.priceCache);
        populatePricesFromCache(state.activityMap, state.priceCache);
    } else if (viewType === 'charts') {
        document.getElementById('charts-container').style.display = 'block';
        await new Promise(resolve => setTimeout(resolve, 50));
        await refreshSnapshots();
        await renderChartsPage(state);
    } else if (viewType === 'ledger') {
        document.getElementById('ledger-page-container').style.display = 'block';
        await refreshLedger();
    } else if (viewType === 'snapshots') {
        document.getElementById('snapshots-page-container').style.display = 'block';
        await refreshSnapshots();
        renderSnapshotsPage();
    } else if (viewType === 'imports') {
        document.getElementById('imports-page-container').style.display = 'block';
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
        const res = await fetch(`/api/snapshots?holder=${state.selectedAccountHolderId}`);
        if(res.ok) state.allSnapshots = await res.json();
    } catch (e) { console.error("Could not fetch snapshots", e); }
}

export function saveSettings() {
    const oldTheme = state.settings.theme;
    state.settings.takeProfitPercent = parseFloat(document.getElementById('take-profit-percent').value) || 0;
    state.settings.stopLossPercent = parseFloat(document.getElementById('stop-loss-percent').value) || 0;
    state.settings.marketHoursInterval = parseInt(document.getElementById('market-hours-interval').value) || 2;
    state.settings.afterHoursInterval = parseInt(document.getElementById('after-hours-interval').value) || 15;
    state.settings.theme = document.getElementById('theme-selector').value;
    state.settings.font = document.getElementById('font-selector').value;
    
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
        const response = await fetch('/api/exchanges');
        state.allExchanges = await response.json();
        populateAllExchangeDropdowns(); 
    } catch (error) {
        showToast('Could not load exchanges.', 'error');
    }
}

function populateAllExchangeDropdowns() {
    const exchangeSelects = document.querySelectorAll('select[id*="exchange"]');
    exchangeSelects.forEach(select => {
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
        const response = await fetch('/api/account_holders');
        state.allAccountHolders = await response.json();
        
        const holderSelects = document.querySelectorAll('.account-holder-select');
        holderSelects.forEach(select => {
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

async function runEodFailoverCheck() {
    console.log("Running EOD failover check...");
    const todayStr = getCurrentESTDateString();
    let lastRunStr = localStorage.getItem('lastEodRunDate');
    if (!lastRunStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        lastRunStr = new Date(yesterday).toLocaleDateString('en-CA');
        localStorage.setItem('lastEodRunDate', lastRunStr);
        return;
    }
    const lastRunDate = new Date(lastRunStr + 'T12:00:00Z');
    const today = new Date(todayStr + 'T12:00:00Z');
    const missedDates = [];
    for (let d = new Date(lastRunDate); d < today; d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getTime() === lastRunDate.getTime()) continue;
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) {
             missedDates.push(d.toLocaleDateString('en-CA'));
        }
    }
    if (missedDates.length > 0) {
        showToast(`Capturing missed EOD prices for ${missedDates.length} day(s)...`, 'info');
        const promises = missedDates.map(date => 
            fetch(`/api/tasks/capture-eod/${date}`, { method: 'POST' })
        );
        await Promise.all(promises);
        showToast('EOD data is now up to date.', 'success');
    }
    localStorage.setItem('lastEodRunDate', todayStr);
}

export function renderExchangeManagementList() {
    const list = document.getElementById('exchange-list');
    if (!list) return;
    list.innerHTML = '';
    state.allExchanges.forEach(ex => {
        const li = document.createElement('li');
        li.dataset.id = ex.id;
        li.innerHTML = `
            <span class="exchange-name">${ex.name}</span>
            <input type="text" class="edit-exchange-input" value="${ex.name}" style="display: none;">
            <div class="exchange-actions">
                <button class="edit-exchange-btn">Edit</button>
                <button class="save-exchange-btn" style="display: none;">Save</button>
                <button class="delete-exchange-btn delete-btn">Delete</button>
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
        const li = document.createElement('li');
        li.dataset.id = holder.id;
        li.innerHTML = `
            <span class="holder-name">${holder.name}</span>
            <input type="text" class="edit-holder-input" value="${holder.name}" style="display: none;">
            <div class="holder-actions">
                <button class="edit-holder-btn">Edit</button>
                <button class="save-holder-btn" style="display: none;">Save</button>
                <button class="delete-holder-btn delete-btn">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}

async function initialize() {
    const loadSettings = () => {
        const savedSettings = localStorage.getItem('stockTrackerSettings');
        if (savedSettings) { state.settings = { ...state.settings, ...JSON.parse(savedSettings) }; }
        document.getElementById('take-profit-percent').value = state.settings.takeProfitPercent;
        document.getElementById('stop-loss-percent').value = state.settings.stopLossPercent;
        document.getElementById('market-hours-interval').value = state.settings.marketHoursInterval;
        document.getElementById('after-hours-interval').value = state.settings.afterHoursInterval;
        
        const themeSelector = document.getElementById('theme-selector');
        if(themeSelector) themeSelector.value = state.settings.theme;
        
        const fontSelector = document.getElementById('font-selector');
        if(fontSelector) fontSelector.value = state.settings.font;
        
        applyAppearanceSettings();
    }
    loadSettings();
    await fetchAndRenderExchanges();
    await fetchAndPopulateAccountHolders();
    
    initializeEventListeners();
    await runEodFailoverCheck();
    
    const today = getCurrentESTDateString();
    let dateForView = new Date(today + 'T12:00:00Z');
    let dayOfWeek = dateForView.getUTCDay();
    while (dayOfWeek === 0 || dayOfWeek === 6) {
        dateForView.setUTCDate(dateForView.getUTCDate() - 1);
        dayOfWeek = dateForView.getUTCDay();
    }
    const viewDate = dateForView.toISOString().split('T')[0];
    
    const transactionDateInput = document.getElementById('transaction-date');
    if(transactionDateInput) transactionDateInput.value = today;
    
    const globalHolderFilter = document.getElementById('global-account-holder-filter');
    if(globalHolderFilter.options.length > 1) {
        const firstHolder = state.allAccountHolders[0];
        if(firstHolder) {
            globalHolderFilter.value = firstHolder.id;
            state.selectedAccountHolderId = firstHolder.id;
        }
    }
    
    await switchView('date', viewDate);
    initializeScheduler(state);
}

initialize();

