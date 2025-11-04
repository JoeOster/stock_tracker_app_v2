import { renderImportsPage } from '../ui/renderers/_imports_render.js';
import { initializeImportsHandlers } from './_imports.js';

/**
 * Initializes the imports page by rendering it and setting up event handlers.
 * @returns {void}
 */
export function loadImportsPage() {
  renderImportsPage();
  initializeImportsHandlers();
}
