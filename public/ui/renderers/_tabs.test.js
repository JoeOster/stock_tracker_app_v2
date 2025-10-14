/**
 * @jest-environment jsdom
 */

// FIX: Import the staticTabs array from the module we are testing.
import { renderTabs, staticTabs } from './_tabs.js';

// Mock the helpers module with the correct path
jest.mock('../helpers.js', () => ({
    getTradingDays: jest.fn(),
    getActivePersistentDates: jest.fn(),
}));

const { getTradingDays, getActivePersistentDates } = require('../helpers.js');

describe('renderTabs', () => {
    
    beforeEach(() => {
        document.body.innerHTML = '<div id="tabs-container"></div>';
        // Use unique mock dates to prevent de-duplication
        /** @type {jest.Mock} */(getTradingDays).mockReturnValue(['2025-10-01', '2025-10-02']); 
        /** @type {jest.Mock} */(getActivePersistentDates).mockReturnValue([]);
    });

    it('should render all static and dynamic tabs correctly', () => {
        const mockCurrentView = { type: 'date', value: '2025-10-08' };
        const MOCK_DATE_TABS_COUNT = 2;
        // FIX: Dynamically calculate the expected total based on the imported array.
        const TOTAL_TABS_EXPECTED = MOCK_DATE_TABS_COUNT + staticTabs.length;
        
        renderTabs(mockCurrentView);
        
        const tabsContainer = document.getElementById('tabs-container');
        const tabs = tabsContainer.querySelectorAll('.tab');

        expect(tabs.length).toBe(TOTAL_TABS_EXPECTED);

        // FIX: Check that each tab defined in the source file is actually rendered.
        staticTabs.forEach(tabInfo => {
            expect(tabsContainer.textContent).toContain(tabInfo.textContent);
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