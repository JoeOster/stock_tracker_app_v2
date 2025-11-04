import { renderImportsPage } from '../ui/renderers/_imports_render.js';
import { dispatchDataUpdate } from '../_events.js';
import { showToast } from '../ui/helpers.js';

export function loadImportsPage() {
  console.log('Loading imports page...');
  renderImportsPage();
  initializeImportsHandlers();
}

export function initializeImportsHandlers() {
  console.log('Initializing imports handlers...');

  // Placeholder for the 'Commit Changes' handler
  const commitChangesButton = document.getElementById('commit-changes-button'); // Assuming an ID for the button
  if (commitChangesButton) {
    commitChangesButton.addEventListener('click', () => {
      console.log('Commit Changes button clicked.');
      // FIX (Spaghetti Navigation): Removed switchView('ledger', null) and location.reload() calls.
      // FIX (Better Refresh): Add a call to dispatchDataUpdate() and show a success toast.
      dispatchDataUpdate();
      showToast('Changes committed successfully!', 'success');
    });
  }
}
