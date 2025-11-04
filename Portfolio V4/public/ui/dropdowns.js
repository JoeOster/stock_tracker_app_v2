// /public/ui/dropdowns.js
/**
 * @file Manages population of dropdowns across the application.
 * @module ui/dropdowns
 */

import { state } from '../state.js';

/**
 * Populates a single <select> element with the current list of advice sources.
 * @param {HTMLSelectElement} selectElement - The <select> element to populate.
 * @param {string} [selectedId] - The ID to pre-select (optional).
 */
function populateAdviceSourceDropdown(selectElement, selectedId) {
  if (!selectElement) return;

  // Preserve the first option (e.g., "(None)")
  console.log();
  const firstOption = selectElement.options[0];
  selectElement.innerHTML = ''; // Clear existing options
  if (firstOption) {
    selectElement.appendChild(firstOption);
  }

  if (state.allAdviceSources && state.allAdviceSources.length > 0) {
    state.allAdviceSources.forEach((source) => {
      const option = document.createElement('option');
      option.value = String(source.id);
      option.textContent = source.name;
      if (selectedId && String(source.id) === String(selectedId)) {
        option.selected = true;
      }
      selectElement.appendChild(option);
    });
  }
}

/**
 * Gets the name of an advice source by its ID.
 * @param {string|number} sourceId - The ID of the source.
 * @returns {string | null} The name of the source, or null if not found.
 */
export function getSourceNameFromId(sourceId) {
  if (!sourceId || !state.allAdviceSources) return null;
  const source = state.allAdviceSources.find(
    (s) => String(s.id) === String(sourceId)
  );
  return source ? source.name : null;
}

/**
 * Finds and populates all <select> elements with the class 'advice-source-select'.
 * @param {string} [selectedId] - The ID to pre-select (optional).
 * @returns {void}
 */
export function populateAllAdviceSourceDropdowns(selectedId) {
  // --- THIS IS THE FIX ---
  const dropdowns = document.querySelectorAll('select.advice-source-select');
  // --- END FIX ---
  dropdowns.forEach((dropdown) => {
    populateAdviceSourceDropdown(
      /** @type {HTMLSelectElement} */ (dropdown),
      selectedId
    );
  });
}
