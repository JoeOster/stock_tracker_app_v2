// public/ui/dropdowns.js
/**
 * @file Manages populating various dropdowns across the UI.
 * @module ui/dropdowns
 */

import { state } from '../state.js';

/**
 * Populates all <select> elements with class 'advice-source-select'
 * with the sources from state.allAdviceSources.
 * @returns {void}
 */
export function populateAllAdviceSourceDropdowns() {
    // Selects ALL elements with this class, including the one in _orders.html
    // and the one in _journal.html (inside the research tab)
    const selects = document.querySelectorAll('.advice-source-select');
    if (selects.length === 0) {
        console.log("[Dropdowns] No '.advice-source-select' elements found to populate.");
        return;
    }

    console.log(`[Dropdowns] Populating ${selects.length} advice source dropdown(s).`);

    const sortedSources = Array.isArray(state.allAdviceSources)
        ? [...state.allAdviceSources].sort((a, b) => a.name.localeCompare(b.name))
        : [];

    selects.forEach(select => {
        const currentVal = (/** @type {HTMLSelectElement} */(select)).value;
        select.innerHTML = ''; // Clear existing

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "(None/Manual Entry)";
        select.appendChild(defaultOption);

        // Add sorted sources
        sortedSources.forEach(source => {
            const option = document.createElement('option');
            option.value = String(source.id);
            option.textContent = `${source.name} (${source.type})`;
            select.appendChild(option);
        });

        // Try to restore the previously selected value
        if (select.querySelector(`option[value="${currentVal}"]`)) {
            (/** @type {HTMLSelectElement} */(select)).value = currentVal;
        } else {
            (/** @type {HTMLSelectElement} */(select)).value = ""; // Default to 'None'
        }
    });
}