// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Tracker script loaded. Initializing...");

    // DOM SELECTORS
    const addTransactionContainer = document.getElementById('add-transaction-container');
    const transactionForm = document.getElementById('add-transaction-form');
    const dailyReportContainer = document.getElementById('daily-report-container');
    const chartsContainer = document.getElementById('charts-container');
    const ledgerPageContainer = document.getElementById('ledger-page-container');
    const ledgerFilterTicker = document.getElementById('ledger-filter-ticker');
    const ledgerFilterStart = document.getElementById('ledger-filter-start');
    const ledgerFilterEnd = document.getElementById('ledger-filter-end');
    const ledgerClearFiltersBtn = document.getElementById('ledger-clear-filters-btn');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-transaction-form');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-button');
    const finnhubApiKeyInput = document.getElementById('finnhub-api-key-input');
    const alphaVantageApiKeyInput = document.getElementById('alpha-vantage-api-key-input');
    const noActivityModal = document.getElementById('no-activity-modal');
    const confirmNoActivityBtn = document.getElementById('confirm-no-activity-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    const screenshotFileInput = document.getElementById('screenshot-file-input');
    const processScreenshotBtn = document.getElementById('process-screenshot-btn');
    const aiStatus = document.getElementById('ai-status');
    const aiConfirmationContainer = document.getElementById('ai-confirmation-container');
    const approveAiBtn = document.getElementById('approve-ai-btn');
    const cancelAiBtn = document.getElementById('cancel-ai-btn');
    const snapshotForm = document.getElementById('add-snapshot-form');

    // STATE
    let settings = { 
        finnhubApiKey: "", 
        alphaVantageApiKey: "", 
        takeProfitPercent: null, 
        stopLossPercent: null 
    };
    let currentView = { type: 'date', value: null };
    let activityMap = new Map();
    let allTimeChart=null, fiveDayChart=null, dateRangeChart=null, zoomedChart=null;
    let allSnapshots = [], allTransactions = [];
    let priceCache = new Map();
    let ledgerSort = { column: 'transaction_date', direction: 'asc' };
    let isApiLimitReached = false;
    let aiExtractedTransactions = [];

    // HELPER FUNCTIONS (App-specific)
    function saveSettings() { localStorage.setItem('stockTrackerSettings', JSON.stringify(settings)); }

    function loadSettings() { 
        const saved = localStorage.getItem('stockTrackerSettings'); 
        if(saved) { settings = { ...settings, ...JSON.parse(saved) }; } 
        finnhubApiKeyInput.value = settings.finnhubApiKey;
        alphaVantageApiKeyInput.value = settings.alphaVantageApiKey;
        document.getElementById('take-profit-percent').value = settings.takeProfitPercent !== null ? settings.takeProfitPercent : '8';
        document.getElementById('stop-loss-percent').value = settings.stopLossPercent !== null ? settings.stopLossPercent : '8';
    }
  
async function handleTabClick(type, value) {
    currentView = { type, value };
    renderTabs(currentView);

    addTransactionContainer.style.display = 'none';
    dailyReportContainer.style.display = 'none';
    chartsContainer.style.display = 'none';
    ledgerPageContainer.style.display = 'none';

    if (type === 'date') {
        addTransactionContainer.style.display = 'block';
        dailyReportContainer.style.display = 'block';
        await renderDailyReport(value, activityMap, priceCache, settings); // Pass settings
    } else if (type === 'charts') {
        chartsContainer.style.display = 'block';
        await renderChartsPage();
    } else if (type === 'ledger') {
        addTransactionContainer.style.display = 'block';
        ledgerPageContainer.style.display = 'block';
        await renderLedger();
    }
}

    async function checkForDailyActivity() {
        const today = getCurrentESTDateString();
        if (localStorage.getItem(`activity-ack-${today}`)) return;
        const now = new Date();
        const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const dayOfWeek = estTime.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return;
        const response = await fetch(`/api/positions/${today}`);
        const data = await response.json();
        if (data && data.dailyTransactions.length === 0) {
            noActivityModal.classList.add('visible');
        }
    }

    // EVENT LISTENERS
    ledgerFilterTicker.addEventListener('input', renderLedger);
    ledgerFilterStart.addEventListener('change', renderLedger);
    ledgerFilterEnd.addEventListener('change', renderLedger);
    ledgerClearFiltersBtn.addEventListener('click', () => {
        ledgerFilterTicker.value = '';
        ledgerFilterStart.value = '';
        ledgerFilterEnd.value = '';
        renderLedger();
    });

    csvFileInput.addEventListener('change', (e) => { /* ... event listener unchanged ... */ });
    transactionForm.addEventListener('submit', async (e) => { /* ... event listener unchanged ... */ });

    saveSettingsBtn.addEventListener('click', () => { 
        saveSettingsBtn.classList.add('btn-in-progress');
        setTimeout(() => {
            settings.finnhubApiKey = finnhubApiKeyInput.value.trim(); 
            settings.alphaVantageApiKey = alphaVantageApiKeyInput.value.trim();
            settings.takeProfitPercent = parseFloat(document.getElementById('take-profit-percent').value) || null;
            settings.stopLossPercent = parseFloat(document.getElementById('stop-loss-percent').value) || null;
            saveSettings(); 
            settingsModal.classList.remove('visible'); 
            saveSettingsBtn.classList.remove('btn-in-progress');
            if (currentView.type === 'date') {
                renderDailyReport(currentView.value, activityMap, priceCache, settings);
            }
        }, 300);
    });

    processScreenshotBtn.addEventListener('click', async () => { /* ... event listener unchanged ... */ });
    cancelAiBtn.addEventListener('click', () => { /* ... event listener unchanged ... */ });
    approveAiBtn.addEventListener('click', async () => { /* ... event listener unchanged ... */ });
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('visible'));
    document.querySelector('#ledger-table thead').addEventListener('click', (e) => { /* ... event listener unchanged ... */ });
    document.querySelector('#ledger-table tbody').addEventListener('click', async (e) => { /* ... event listener unchanged, targeted tbody now */ });
    editForm.addEventListener('submit', async (e) => { /* ... event listener unchanged ... */ });
    document.querySelectorAll('.modal .close-button').forEach(btn => btn.addEventListener('click', e => e.target.closest('.modal').classList.remove('visible')));
    window.addEventListener('click', e => { if (e.target.classList.contains('modal')) e.target.classList.remove('visible'); });
    document.getElementById('refresh-prices-btn').addEventListener('click', async () => { /* ... event listener unchanged ... */ });
    confirmNoActivityBtn.addEventListener('click', () => { /* ... event listener unchanged ... */ });
    snapshotForm.addEventListener('submit', async (e) => { /* ... event listener unchanged ... */ });

async function initialize() {
    isApiLimitReached = false;
    loadSettings();
    const today = getCurrentESTDateString();
    document.getElementById('transaction-date').value = today;
    document.getElementById('snapshot-date').value = today;
    const mainExchangeSelect = document.getElementById('exchange');
    document.getElementById('snapshot-exchange').innerHTML = mainExchangeSelect.innerHTML;
    const expirationSelects = [document.getElementById('limit-expiration'), document.getElementById('edit-limit-expiration')];
    const expirationOptions = document.querySelector('#limit-expiration').innerHTML;
    expirationSelects.forEach(sel => sel.innerHTML = expirationOptions);

    await handleTabClick('date', today);
    updateAllPrices(activityMap, priceCache, isApiLimitReached, settings); // Pass arguments
    initializeScheduler();
    checkForDailyActivity();
}

    initialize();
});