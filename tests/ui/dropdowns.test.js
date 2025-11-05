import {
  populateAllAdviceSourceDropdowns,
  populateAllAccountHolderDropdowns,
  populateAllExchangeDropdowns,
  getSourceNameFromId,
} from '../../public/ui/dropdowns.js';
import { state } from '../../public/state.js';

describe('dropdowns.js', () => {
  // Mock the state object
  beforeEach(() => {
    state.allAdviceSources = [
      { id: 1, name: 'Source A' },
      { id: 2, name: 'Source B' },
    ];
    state.allAccountHolders = [
      { id: 1, name: 'Holder 1' },
      { id: 2, name: 'Holder 2' },
    ];
    state.allExchanges = [
      { id: 1, name: 'Exchange X' },
      { id: 2, name: 'Exchange Y' },
    ];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('populateAllAdviceSourceDropdowns', () => {
    test('should populate advice source dropdowns', () => {
      const mockSelect = document.createElement('select');
      mockSelect.className = 'advice-source-select';
      document.body.appendChild(mockSelect);

      jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockSelect]);

      populateAllAdviceSourceDropdowns();

      expect(mockSelect.options.length).toBe(3); // Default + 2 sources
      expect(mockSelect.options[1].textContent).toBe('Source A');
      expect(mockSelect.options[2].textContent).toBe('Source B');

      document.body.removeChild(mockSelect);
    });
  });

  describe('populateAllAccountHolderDropdowns', () => {
    test('should populate account holder dropdowns', () => {
      const mockSelect = document.createElement('select');
      mockSelect.className = 'account-holder-select';
      document.body.appendChild(mockSelect);

      jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockSelect]);

      populateAllAccountHolderDropdowns();

      expect(mockSelect.options.length).toBe(3); // Default + 2 holders
      expect(mockSelect.options[1].textContent).toBe('Holder 1');
      expect(mockSelect.options[2].textContent).toBe('Holder 2');

      document.body.removeChild(mockSelect);
    });
  });

  describe('populateAllExchangeDropdowns', () => {
    test('should populate exchange dropdowns', () => {
      const mockSelect = document.createElement('select');
      mockSelect.id = 'some-exchange-select';
      document.body.appendChild(mockSelect);

      jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockSelect]);

      populateAllExchangeDropdowns();

      expect(mockSelect.options.length).toBe(3); // Default + 2 exchanges
      expect(mockSelect.options[1].textContent).toBe('Exchange X');
      expect(mockSelect.options[2].textContent).toBe('Exchange Y');

      document.body.removeChild(mockSelect);
    });
  });

  describe('getSourceNameFromId', () => {
    test('should return the correct source name for a given ID', () => {
      expect(getSourceNameFromId(1)).toBe('Source A');
      expect(getSourceNameFromId(2)).toBe('Source B');
    });

    test('should return null if source ID is not found', () => {
      expect(getSourceNameFromId(99)).toBeNull();
    });

    test('should return null if state.allAdviceSources is null or empty', () => {
      state.allAdviceSources = null;
      expect(getSourceNameFromId(1)).toBeNull();
      state.allAdviceSources = [];
      expect(getSourceNameFromId(1)).toBeNull();
    });
  });
});