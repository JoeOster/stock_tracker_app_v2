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

/**
 * Populates all account holder dropdowns with current account holders from the state.
 * @returns {void}
 */
export function populateAllAccountHolderDropdowns() {
  const holderSelects = document.querySelectorAll('.account-holder-select');
  holderSelects.forEach(
    /** @param {HTMLSelectElement} select */ (select) => {
      const currentVal = select.value;
      select.innerHTML = '';

      if (select.id === 'global-account-holder-filter') {
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Accounts';
        select.appendChild(allOption);
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Holder';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
      }

      const sortedHolders = Array.isArray(state.allAccountHolders)
        ? [...state.allAccountHolders].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        : [];

      sortedHolders.forEach((holder) => {
        const option = document.createElement('option');
        option.value = String(holder.id);
        option.textContent = holder.name;
        select.appendChild(option);
      });

      if (select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
      } else if (select.id === 'global-account-holder-filter') {
        select.value = 'all';
      } else {
        select.selectedIndex = select.options[0]?.disabled ? 0 : 1;
      }
    }
  );
}

/**
 * Populates all exchange dropdowns with current exchanges from the state.
 * @returns {void}
 */
export function populateAllExchangeDropdowns() {
  const exchangeSelects = document.querySelectorAll(
    'select[id*="exchange"], select#snapshot-exchange'
  );
  exchangeSelects.forEach(
    /** @param {HTMLSelectElement} select */ (select) => {
      const currentVal = select.value; // Store current value before clearing
      select.innerHTML = ''; // Clear existing options
      if (select.id.includes('filter')) {
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Exchanges';
        select.appendChild(allOption);
      } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Exchange';
        defaultOption.disabled = true;
        select.appendChild(defaultOption);
      }
      let otherOption = null;
      const sortedExchanges = Array.isArray(state.allExchanges)
        ? [...state.allExchanges]
            .filter(
              /** @param {any} ex */ (ex) => {
                if (ex.name.toLowerCase() === 'other') {
                  otherOption = ex;
                  return false;
                }
                return true;
              }
            )
            .sort((/** @type {any} */ a, /** @type {any} */ b) =>
              a.name.localeCompare(b.name)
            )
        : [];
      sortedExchanges.forEach((ex) => {
        const option = document.createElement('option');
        // @ts-ignore
        option.value = ex.name;
        // @ts-ignore
        option.textContent = ex.name;
        select.appendChild(option);
      });
      if (otherOption) {
        const option = document.createElement('option');
        // @ts-ignore
        option.value = otherOption.name;
        // @ts-ignore
        option.textContent = otherOption.name;
        select.appendChild(option);
      }
      if (select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
      } else {
        select.selectedIndex = 0;
      }
    }
  );
}
