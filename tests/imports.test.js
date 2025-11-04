import {
  loadImportsPage,
  initializeImportsHandlers,
} from '../public/event-handlers/imports.js';
import { renderImportsPage } from '../public/ui/renderers/_imports_render.js';
import { dispatchDataUpdate } from '../public/_events.js';
import { showToast } from '../public/ui/helpers.js';

// Mock dependencies
jest.mock('../public/ui/renderers/_imports_render.js');
jest.mock('../public/_events.js');
jest.mock('../public/ui/helpers.js');

describe('Imports Module', () => {
  let commitChangesButton;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock DOM elements
    document.body.innerHTML = `
            <div id="imports-page-container"></div>
            <button id="commit-changes-button"></button>
        `;
    commitChangesButton = document.getElementById('commit-changes-button');
  });

  describe('loadImportsPage', () => {
    it('should call renderImportsPage and initializeImportsHandlers', () => {
      loadImportsPage();
      expect(renderImportsPage).toHaveBeenCalledTimes(1);
      // initializeImportsHandlers is called internally, so we check its effects
      // For now, we'll just ensure it doesn't throw an error.
      // More specific checks for initializeImportsHandlers are in its own describe block.
    });
  });

  describe('initializeImportsHandlers', () => {
    it('should attach a click event listener to the commit changes button', () => {
      const addEventListenerSpy = jest.spyOn(
        commitChangesButton,
        'addEventListener'
      );
      initializeImportsHandlers();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
      addEventListenerSpy.mockRestore();
    });

    it('should call dispatchDataUpdate and showToast when commit changes button is clicked', () => {
      initializeImportsHandlers();
      commitChangesButton.click();
      expect(dispatchDataUpdate).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(
        'Changes committed successfully!',
        'success'
      );
    });
  });

  describe('renderImportsPage', () => {
    it('should log a message to the console', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      renderImportsPage();
      expect(consoleSpy).toHaveBeenCalledWith('Rendering imports page...');
      consoleSpy.mockRestore();
    });
  });
});
