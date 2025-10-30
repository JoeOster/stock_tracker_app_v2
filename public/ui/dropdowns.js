// public/ui/dropdowns.js
/**
 * @file Manages populating various dropdowns across the UI.
 * @module ui/dropdowns
 */

import { state } from '../state.js';

/**
 * Populates all <select> elements with class 'advice-source-select'
 * with the sources from state.allAdviceSources.
 */
export function populateAllAdviceSourceDropdowns() {
    // Selects ALL elements with this class, including the one in _orders.html
    const selects = document.querySelectorAll('.advice-source-select');
    if (selects.length === 0) return;

    // ... (rest of the function remains the same) ...
}