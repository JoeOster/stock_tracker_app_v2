// /public/event-handlers/_settings.ui.test.js
/**
 * @jest-environment jsdom
 */

// --- Mocks ---
// Mock modules that are dependencies of the files under test

// Mock UI Helpers
jest.mock('../ui/helpers.js', () => ({
    showToast: jest.fn(),
    showConfirmationModal: jest.fn((title, body, callback) => callback()), // Auto-confirm
}));

// Mock API
jest.mock('../api.js', () => ({
    handleResponse: jest.fn(res => res.json()),
    refreshLedger: jest.fn().mockResolvedValue(undefined),
    fetchAdviceSources: jest.fn().mockResolvedValue([]),
    addAdviceSource: jest.fn().mockResolvedValue({ id: 99, name: 'New Source' }),
    updateAdviceSource: jest.fn().mockResolvedValue({ message: 'Success' }),
    deleteAdviceSource: jest.fn().mockResolvedValue({ message: 'Success' }),
}));

// Mock State
jest.mock('../state.js', () => ({
    state: {
        allExchanges: [{ id: 1, name: 'Fidelity' }],
        allAccountHolders: [{ id: 1, name: 'Primary' }],
        allAdviceSources: [{ id: 1, name: 'TestSource', type: 'Person' }],
        selectedAccountHolderId: 1,
        settings: {
            defaultAccountHolderId: 1,
        },
    },
    updateState: jest.fn(),
}));

// --- MOCK the functions CALLED BY initializeSettingsHandlers ---
// Mock the newly refactored modules
jest.mock('./_settings_modal.js', () => {
    // We need to test 'setActiveTab' from this module, so we requireActual
    const original = jest.requireActual('./_settings_modal.js');
    return {
        ...original, // Keep actual setActiveTab
        initializeSettingsModalHandlers: jest.fn(), // Mock the initializer
    };
});

jest.mock('./_settings_exchanges.js', () => ({
    fetchAndRenderExchanges: jest.fn().mockResolvedValue(undefined),
    initializeExchangeManagementHandlers: jest.fn(),
}));

jest.mock('./_settings_holders.js', () => ({
    fetchAndPopulateAccountHolders: jest.fn().mockResolvedValue(undefined),
    initializeHolderManagementHandlers: jest.fn(),
}));

jest.mock('./_journal_settings.js', () => ({
    fetchAndStoreAdviceSources: jest.fn().mockResolvedValue(undefined),
    initializeJournalSettingsHandlers: jest.fn(),
}));

jest.mock('../ui/settings.js', () => ({
    saveSettings: jest.fn(),
    applyAppearanceSettings: jest.fn(),
    renderExchangeManagementList: jest.fn(),
    renderAccountHolderManagementList: jest.fn(),
}));

jest.mock('../ui/journal-settings.js', () => ({
    renderAdviceSourceManagementList: jest.fn(),
}));


// --- Import the REAL functions under test ---
// Import the main initializer from the old (now non-existent, but testing its *concept*) file
// We can't import from _settings.js, but we can import the initializer it *calls*
const { initializeSettingsModalHandlers } = require('./_settings_modal.js');
// Import the helper function we want to test directly
const { setActiveTab } = require('./_settings_modal.js');

// --- Re-import helpers after mocks ---
const { showToast, showConfirmationModal } = require('../ui/helpers.js');
const { state } = require('../state.js');

// Helper to provide Settings Modal HTML
const getSettingsModalHTML = () => `
    <div id="settings-modal" class="modal">
        <div class="modal-content modal-large">
            <span class="close-button">&times;</span>
            <div class="settings-layout">
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="general">General</button>
                    <button class="settings-tab" data-tab="appearance">Appearance</button>
                    <button class="settings-tab" data-tab="data">Data Management</button>
                </div>
                <div class="settings-content">
                    <div id="general-settings-panel" class="settings-panel active">General Content</div>
                    <div id="appearance-settings-panel" class="settings-panel">Appearance Content</div>
                    <div id="data-settings-panel" class="settings-panel">
                        <div class="sub-tabs">
                            <button class="sub-tab active" data-sub-tab="exchanges-panel">Exchanges</button>
                            <button class="sub-tab" data-sub-tab="holders-panel">Account Holders</button>
                            <button class="sub-tab" data-sub-tab="sources-panel">Advice Sources</button>
                        </div>
                        <div class="sub-tab-content">
                            <div id="exchanges-panel" class="sub-tab-panel active"></div>
                            <div id="holders-panel" class="sub-tab-panel"></div>
                            <div id="sources-panel" class="sub-tab-panel"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <div class="modal-actions-right">
                    <button id="save-settings-button">Save & Close</button>
                </div>
            </div>
        </div>
    </div>
    <button id="settings-btn">Open Settings</button>
`;

// Helper to flush microtask queue
const flushPromises = () => new Promise(setImmediate);


// ===========================================
// NEW: UI Logic Function Unit Tests (Isolated)
// ===========================================
describe('setActiveTab Helper Function', () => {

    test('should correctly switch main settings tabs and panels', () => {
        document.body.innerHTML = getSettingsModalHTML(); // Use full HTML
        
        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.settings-tabs'));
        const scopeElement = document.getElementById('settings-modal');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button[data-tab="appearance"]'));

        setActiveTab(
            tabsContainer,
            targetTab,
            scopeElement,
            '.settings-panel',
            'data-tab',
            '#',
            '-settings-panel'
        );

        // Assertions
        expect(document.querySelector('button[data-tab="general"]')?.classList.contains('active')).toBe(false);
        expect(targetTab.classList.contains('active')).toBe(true);
        expect(document.getElementById('general-settings-panel')?.classList.contains('active')).toBe(false);
        expect(document.getElementById('appearance-settings-panel')?.classList.contains('active')).toBe(true);
    });

    test('should correctly switch data management sub-tabs and panels', () => {
        document.body.innerHTML = getSettingsModalHTML(); // Use full HTML

        const subTabsContainer = /** @type {HTMLElement} */ (document.querySelector('#data-settings-panel .sub-tabs'));
        const scopeElement = document.getElementById('data-settings-panel');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button[data-sub-tab="holders-panel"]'));

        setActiveTab(
            subTabsContainer,
            targetTab,
            scopeElement,
            '.sub-tab-panel',
            'data-sub-tab',
            '#'
        );

        // Assertions
        expect(document.querySelector('button[data-sub-tab="exchanges-panel"]')?.classList.contains('active')).toBe(false);
        expect(targetTab.classList.contains('active')).toBe(true);
        expect(document.getElementById('exchanges-panel')?.classList.contains('active')).toBe(false);
        expect(document.getElementById('holders-panel')?.classList.contains('active')).toBe(true);
    });

     test('should log error if tab attribute is missing', () => {
        document.body.innerHTML = `
            <div id="settings-modal">
                <div class="settings-tabs">
                    <button class="settings-tab active">General</button> {/* Missing data-tab */}
                </div>
            </div>`;
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(); // Suppress console noise
        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.settings-tabs'));
        const scopeElement = document.getElementById('settings-modal');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button.settings-tab'));

        setActiveTab(tabsContainer, targetTab, scopeElement, '.settings-panel', 'data-tab', '#', '-settings-panel');

        expect(consoleErrorSpy).toHaveBeenCalledWith("setActiveTab: Clicked tab is missing the required data attribute:", "data-tab");
        consoleErrorSpy.mockRestore();
    });

    test('should log error if panel is not found', () => {
        document.body.innerHTML = `
            <div id="settings-modal">
                <div class="settings-tabs">
                    <button class="settings-tab" data-tab="nonexistent">Nonexistent</button>
                </div>
            </div>`;
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.settings-tabs'));
        const scopeElement = document.getElementById('settings-modal');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button[data-tab="nonexistent"]'));

        setActiveTab(tabsContainer, targetTab, scopeElement, '.settings-panel', 'data-tab', '#', '-settings-panel');

        expect(consoleErrorSpy).toHaveBeenCalledWith("setActiveTab: Could not find panel with selector:", "#nonexistent-settings-panel");
        consoleErrorSpy.mockRestore();
    });

});