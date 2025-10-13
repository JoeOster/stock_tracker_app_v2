/**
 * @jest-environment jsdom
 */

import { renderTabs } from './_tabs.js';

// Mock the helpers module with the correct path
jest.mock('../helpers.js', () => ({
    getTradingDays: jest.fn(),
    getActivePersistentDates: jest.fn(),
}));

const { getTradingDays, getActivePersistentDates } = require('../helpers.js');

describe('renderTabs', () => {
    const STATIC_TABS = ['Charts', 'Ledger', 'New Orders', 'Alerts', 'Snapshots'];

    beforeEach(() => {
        document.body.innerHTML = '<div id="tabs-container"></div>';
        // Use unique mock dates to prevent de-duplication
        /** @type {jest.Mock} */(getTradingDays).mockReturnValue(['2025-10-01', '2025-10-02']); 
        /** @type {jest.Mock} */(getActivePersistentDates).mockReturnValue([]);
    });

    it('should render all static and dynamic tabs correctly', () => {
        const mockCurrentView = { type: 'date', value: '2025-10-08' };
        const MOCK_DATE_TABS_COUNT = 2;
        const TOTAL_TABS_EXPECTED = MOCK_DATE_TABS_COUNT + STATIC_TABS.length;
        
        renderTabs(mockCurrentView);
        
        const tabsContainer = document.getElementById('tabs-container');
        const tabs = tabsContainer.querySelectorAll('.tab');

        expect(tabs.length).toBe(TOTAL_TABS_EXPECTED);

        STATIC_TABS.forEach(tabName => {
            expect(tabsContainer.textContent).toContain(tabName);
        });
    });

    it('should correctly apply the "active" class to the current view tab', () => {
        const mockCurrentView = { type: 'charts', value: null };
        renderTabs(mockCurrentView);
        const activeTab = document.querySelector('.tab.active');
        expect(activeTab).not.toBeNull();
        expect(activeTab.textContent).toBe('Charts');
    });
});