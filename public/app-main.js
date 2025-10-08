import { initializeEventListeners } from './event-listeners.js';
import { renderTabs, renderDailyReport, renderLedger, renderChartsPage, renderSnapshotsPage } from './ui/renderers.js';
import { updatePricesForView } from './api.js';
import { getCurrentESTDateString, showToast } from './ui/helpers.js';
import { initializeScheduler } from './scheduler.js';

export const state = {
    // State now uses a 'theme' string instead of a boolean
    settings: { takeProfitPercent: 8, stopLossPercent: 8, marketHoursInterval: 2, afterHoursInterval: 15, theme: 'light' },
    currentView: { type: null, value: null },
    activityMap: new Map(),
    priceCache: new Map(),
    allTransactions: [],
    allSnapshots: [],
    allExchanges: [],
    ledgerSort: { column: 'transaction_date', direction: 'desc' },
    allTimeChart: null, fiveDayChart: null, dateRangeChart: null, zoomedChart: null
};

export async function switchView(viewType, viewValue) {
    state.currentView = { type: viewType, value: viewValue };
    renderTabs(state.currentView);

    document.getElementById('daily-report-container').style.display = 'none';
    document.getElementById('charts-container').style.display = 'none';
    document.getElementById('ledger-page-container').style.display = 'none';
    document.getElementById('snapshots-page-container').style.display = 'none';

    if (viewType === 'date') {
        document.getElementById('daily-report-container').style.display = 'block';
        await renderDailyReport(viewValue, state.activityMap);
        await updatePricesForView(viewValue, state.activityMap, state.priceCache);
    } else if (viewType === 'charts') {
        document.getElementById('charts-container').style.display = 'block';
        await new Promise(resolve => setTimeout(resolve, 50));
        await renderChartsPage(state);
    } else if (viewType === 'ledger') {
        document.getElementById('ledger-page-container').style.display = 'block';
        if (state.allTransactions.length === 0) {
            await refreshLedger();
        } else {
            renderLedger(state.allTransactions, state.ledgerSort);
        }
    } else if (viewType === 'snapshots') {
        document.getElementById('snapshots-page-container').style.display = 'block';
        if (state.allSnapshots.length === 0) {
            try {
                const res = await fetch('/api/snapshots');
                if(res.ok) state.allSnapshots = await res.json();
            } catch (e) { console.error("Could not fetch snapshots", e); }
        }
        renderSnapshotsPage(state);
    }
}

export async function refreshLedger() {
    try {
        const res = await fetch('/api/transactions');
        if (!res.ok) throw new Error('Failed to fetch latest transactions');
        state.allTransactions = await res.json();
        renderLedger(state.allTransactions, state.ledgerSort);
    } catch (error) { console.error("Failed to refresh ledger:", error); showToast("Could not refresh the ledger.", "error"); }
}

// Updated saveSettings to handle the theme string
export function saveSettings() {
    const oldTheme = state.settings.theme; // Get the theme before changes

    // Read all settings from the form
    state.settings.takeProfitPercent = parseFloat(document.getElementById('take-profit-percent').value) || 0;
    state.settings.stopLossPercent = parseFloat(document.getElementById('stop-loss-percent').value) || 0;
    state.settings.marketHoursInterval = parseInt(document.getElementById('market-hours-interval').value) || 2;
    state.settings.afterHoursInterval = parseInt(document.getElementById('after-hours-interval').value) || 15;
    state.settings.theme = document.getElementById('theme-selector').value;
    
    // Save to localStorage
    localStorage.setItem('stockTrackerSettings', JSON.stringify(state.settings));
    
    // Apply the theme to the body
    document.body.dataset.theme = state.settings.theme;

    // If the theme changed and we are on the charts page, refresh the charts
    if (state.settings.theme !== oldTheme && state.currentView.type === 'charts') {
        switchView('charts');
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

export function showConfirmationModal(title, body, onConfirm) {
    const confirmModal = document.getElementById('confirm-modal');
    if (!confirmModal) return;
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-body').textContent = body;
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    const closeModal = () => confirmModal.classList.remove('visible');
    newConfirmBtn.addEventListener('click', () => { onConfirm(); closeModal(); }, { once: true });
    cancelBtn.addEventListener('click', closeModal, { once: true });
    confirmModal.classList.add('visible');
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

async function fetchAndRenderExchanges() {
    try {
        const response = await fetch('/api/exchanges');
        state.allExchanges = await response.json();
    } catch (error) {
        showToast('Could not load exchanges.', 'error');
    }
}
function populateAllExchangeDropdowns() {
    // This selector targets all exchange dropdowns in the app
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

async function initialize() {
    // Updated loadSettings to handle the theme string
    const loadSettings = () => {
        const savedSettings = localStorage.getItem('stockTrackerSettings');
        if (savedSettings) { state.settings = { ...state.settings, ...JSON.parse(savedSettings) }; }

        document.getElementById('take-profit-percent').value = state.settings.takeProfitPercent;
        document.getElementById('stop-loss-percent').value = state.settings.stopLossPercent;
        document.getElementById('market-hours-interval').value = state.settings.marketHoursInterval;
        document.getElementById('after-hours-interval').value = state.settings.afterHoursInterval;
        
        const darkModeCheckbox = document.getElementById('dark-mode-checkbox');
        if(darkModeCheckbox) {
            // Set checkbox based on the theme string
            darkModeCheckbox.checked = state.settings.theme === 'dark';
        }
        // Apply theme by setting a data-attribute on the body
        document.body.setAttribute('data-theme', state.settings.theme);
    }
    loadSettings();
    await fetchAndRenderExchanges();
    
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
    
    await switchView('date', viewDate);
    initializeScheduler(state);
}

initialize();

