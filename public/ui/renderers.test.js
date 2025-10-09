/**
 * @jest-environment jsdom
 */

import { renderTabs } from './renderers.js';
import { getTradingDays, getActivePersistentDates } from './helpers.js';

// Mock the dependencies to isolate the renderTabs function
jest.mock('./helpers.js', () => ({
    getTradingDays: jest.fn(),
    getActivePersistentDates: jest.fn(),
}));

// Mock the app-main module to break the circular dependency
jest.mock('../app-main.js', () => ({
    state: {
        settings: { theme: 'light' },
        allAccountHolders: [],
        selectedAccountHolderId: 'all'
    },
}));

describe('renderTabs', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="tabs-container"></div>';
        getTradingDays.mockReturnValue(['2025-10-08', '2025-10-07']); // Mocking 2 date tabs
        getActivePersistentDates.mockReturnValue([]);
    });

    it('should render all static and dynamic tabs correctly', () => {
        const mockCurrentView = { type: 'date', value: '2025-10-08' };
        
        renderTabs(mockCurrentView);

        const tabsContainer = document.getElementById('tabs-container');
        const tabs = tabsContainer.querySelectorAll('.tab');

        // CORRECTED: We now expect 2 date tabs + 4 static tabs (Charts, Ledger, Snapshots, Imports) = 6 total
        expect(tabs.length).toBe(6);

        // Check for the static tabs by their text content
        expect(tabsContainer.textContent).toContain('Charts');
        expect(tabsContainer.textContent).toContain('Ledger');
        expect(tabsContainer.textContent).toContain('Snapshots');
        expect(tabsContainer.textContent).toContain('Imports'); // Added check for the new tab
    });

    it('should correctly apply the "active" class to the current view tab', () => {
        const mockCurrentView = { type: 'charts', value: null };

        renderTabs(mockCurrentView);

        const activeTab = document.querySelector('.tab.active');
        
        expect(activeTab).not.toBeNull();
        expect(activeTab.textContent).toBe('Charts');
    });
});

