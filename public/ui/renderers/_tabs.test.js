/**
 * @jest-environment jsdom
 */

import { renderTabs, staticTabs } from './_tabs.js';

// Mock the datetime.js module
jest.mock('../datetime.js', () => ({
  getTradingDays: jest.fn(),
  getActivePersistentDates: jest.fn(),
}));

// Import the mocked functions to control them
const { getTradingDays, getActivePersistentDates } = require('../datetime.js');

describe('renderTabs', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tabs-container"></div>';
    // Ensure mocks are reset and have clear return values for each test
    /** @type {jest.Mock} */ (getTradingDays).mockClear();
    /** @type {jest.Mock} */ (getActivePersistentDates).mockClear();

    /** @type {jest.Mock} */ (getTradingDays).mockReturnValue([
      '2025-10-01',
      '2025-10-02',
    ]);
    /** @type {jest.Mock} */ (getActivePersistentDates).mockReturnValue([]);
  });

  it('should render all static and dynamic tabs correctly', () => {
    const mockCurrentView = { type: 'date', value: '2025-10-08' }; // A date not in the dynamic list
    const MOCK_DATE_TABS_COUNT = 2; // From getTradingDays mock
    const TOTAL_TABS_EXPECTED = MOCK_DATE_TABS_COUNT + staticTabs.length;

    renderTabs(mockCurrentView);

    const tabsContainer = document.getElementById('tabs-container');
    // @ts-ignore
    const tabs = tabsContainer.querySelectorAll('.tab');

    expect(tabs.length).toBe(TOTAL_TABS_EXPECTED);

    // Check that all static tab text is present
    staticTabs.forEach((tabInfo) => {
      // @ts-ignore
      expect(tabsContainer.textContent).toContain(tabInfo.textContent);
    });

    // --- THIS IS THE FIX ---
    // Check that "Sources" is present
    // @ts-ignore
    expect(tabsContainer.textContent).toContain('Sources'); // Changed from 'Research'
    // --- END FIX ---

    // @ts-ignore
    expect(tabsContainer.textContent).not.toContain('Journal');
  });

  it('should correctly apply the "active" class to the current view tab', () => {
    const mockCurrentView = { type: 'dashboard', value: null };
    renderTabs(mockCurrentView);
    const activeTab = document.querySelector('.tab.active');
    expect(activeTab).not.toBeNull();
    // @ts-ignore
    expect(activeTab.textContent).toBe('Dashboard');
  });

  it('should correctly apply "active" to a dynamic date tab', () => {
    /** @type {jest.Mock} */ (getTradingDays).mockReturnValue(['2025-10-01']);
    /** @type {jest.Mock} */ (getActivePersistentDates).mockReturnValue([
      '2025-10-03',
    ]);

    const mockCurrentView = { type: 'date', value: '2025-10-03' };
    renderTabs(mockCurrentView);

    const activeTab = document.querySelector('.tab.active');
    expect(activeTab).not.toBeNull();
    // @ts-ignore
    expect(activeTab.dataset.viewType).toBe('date');
    // @ts-ignore
    expect(activeTab.dataset.viewValue).toBe('2025-10-03');
    // @ts-ignore
    expect(activeTab.textContent).toBe('10/03'); // Check formatted date text
  });
});
