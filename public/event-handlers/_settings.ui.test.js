// /public/event-handlers/_settings.ui.test.js
// ... (keep all existing mocks and setup from the previous version) ...

// --- Import the REAL functions under test ---
// We removed the jest.mock('./_settings.js') for initializeSettingsHandlers earlier
// Now import both initializeSettingsHandlers AND setActiveTab
const { initializeSettingsHandlers,  } = require('./_settings');
const { setActiveTab } = require('./_settings_modal.js');

// --- MOCK the functions CALLED BY initializeSettingsHandlers ---
// Keep this mock, but it no longer needs to mock initializeSettingsHandlers itself
/**
 * @jest-environment jsdom
 */

// ... (keep all existing mocks and setup from the previous version) ...

// --- Import the REAL functions under test ---

// --- MOCK the functions CALLED BY initializeSettingsHandlers ---
jest.mock('./_settings_modal.js', () => {
    const original = jest.requireActual('./_settings_modal.js');
    return {
        ...original,
        fetchAndRenderExchanges: jest.fn().mockResolvedValue(undefined),
        fetchAndPopulateAccountHolders: jest.fn().mockResolvedValue(undefined),
        fetchAndStoreAdviceSources: jest.fn().mockResolvedValue(undefined),
    };
});

// --- Re-import helpers after mocks ---
const { showToast, showConfirmationModal } = require('../ui/helpers.js');
const { state } = require('../state.js');

// --- Helper to provide Settings Modal HTML (Keep as before) ---
// const getSettingsModalHTML = () => { ... };

// --- Helper to flush microtask queue (Keep as before) ---
// const flushPromises = () => { ... };

// ===========================================
// DOM Structure Verification Tests (Keep as before)
// ===========================================
describe('Settings Modal DOM Structure', () => {
    // ... tests remain the same ...
});

// ===========================================
// Event Listener Attachment Tests (Keep as before)
// ===========================================
describe('Settings Handlers Initialization', () => {
    // ... tests remain the same ...
});

// ===========================================
// NEW: UI Logic Function Unit Tests (Isolated)
// ===========================================
describe('setActiveTab Helper Function', () => {

    test('should correctly switch main settings tabs and panels', () => {
        document.body.innerHTML = `
            <div id="settings-modal">
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="general">General</button>
                    <button class="settings-tab" data-tab="appearance">Appearance</button>
                </div>
                <div class="settings-content">
                    <div id="general-settings-panel" class="settings-panel active">General Content</div>
                    <div id="appearance-settings-panel" class="settings-panel">Appearance Content</div>
                </div>
            </div>`;

        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.settings-tabs')); // Cast container
        const scopeElement = document.getElementById('settings-modal');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button[data-tab="appearance"]')); // Cast target tab

        // FIX: Cast targetTab to HTMLElement
        setActiveTab(
            tabsContainer,
            /** @type {HTMLElement} */ (targetTab), // <-- Cast here (Line 72)
            scopeElement,
            '.settings-panel',
            'data-tab',
            '#',
            '-settings-panel'
        );

        // Assertions
        expect(document.querySelector('button[data-tab="general"]').classList.contains('active')).toBe(false);
        expect(targetTab.classList.contains('active')).toBe(true);
        expect(document.getElementById('general-settings-panel').classList.contains('active')).toBe(false);
        expect(document.getElementById('appearance-settings-panel').classList.contains('active')).toBe(true);
    });

    test('should correctly switch data management sub-tabs and panels', () => {
        document.body.innerHTML = `
           <div id="data-settings-panel">
               <div class="sub-tabs">
                   <button class="sub-tab active" data-sub-tab="exchanges-panel">Exchanges</button>
                   <button class="sub-tab" data-sub-tab="holders-panel">Holders</button>
               </div>
               <div class="sub-tab-content">
                   <div id="exchanges-panel" class="sub-tab-panel active">Exchanges Content</div>
                   <div id="holders-panel" class="sub-tab-panel">Holders Content</div>
               </div>
           </div>`;

        const subTabsContainer = /** @type {HTMLElement} */ (document.querySelector('.sub-tabs')); // Cast container
        const scopeElement = document.getElementById('data-settings-panel');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button[data-sub-tab="holders-panel"]')); // Cast target tab

        // FIX: Cast targetTab to HTMLElement
        setActiveTab(
            subTabsContainer,
            /** @type {HTMLElement} */ (targetTab), // <-- Cast here (Line 106)
            scopeElement,
            '.sub-tab-panel',
            'data-sub-tab',
            '#'
        );

        // Assertions
        expect(document.querySelector('button[data-sub-tab="exchanges-panel"]').classList.contains('active')).toBe(false);
        expect(targetTab.classList.contains('active')).toBe(true);
        expect(document.getElementById('exchanges-panel').classList.contains('active')).toBe(false);
        expect(document.getElementById('holders-panel').classList.contains('active')).toBe(true);
    });

     test('should log error if tab attribute is missing', () => {
        document.body.innerHTML = `
            <div id="settings-modal">
                <div class="settings-tabs">
                    <button class="settings-tab active">General</button> {/* Missing data-tab */}
                </div>
            </div>`;
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(); // Suppress console noise
        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.settings-tabs')); // Cast container
        const scopeElement = document.getElementById('settings-modal');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button.settings-tab')); // Cast target tab

        // FIX: Cast targetTab to HTMLElement
        setActiveTab(tabsContainer, /** @type {HTMLElement} */ (targetTab), scopeElement, '.settings-panel', 'data-tab', '#', '-settings-panel'); // <-- Cast here (Line 133)

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
        const tabsContainer = /** @type {HTMLElement} */ (document.querySelector('.settings-tabs')); // Cast container
        const scopeElement = document.getElementById('settings-modal');
        const targetTab = /** @type {HTMLElement} */ (document.querySelector('button[data-tab="nonexistent"]')); // Cast target tab

        // FIX: Cast targetTab to HTMLElement
        setActiveTab(tabsContainer, /** @type {HTMLElement} */ (targetTab), scopeElement, '.settings-panel', 'data-tab', '#', '-settings-panel'); // <-- Cast here (Line 151)

        expect(consoleErrorSpy).toHaveBeenCalledWith("setActiveTab: Could not find panel with selector:", "#nonexistent-settings-panel");
        consoleErrorSpy.mockRestore();
    });

});

// ==============================================================================
//  Skipped Suite (Keep skipped for now)
// ==============================================================================
describe.skip('Settings Handlers - Exchange Management', () => {
    // ... tests remain skipped ...
});