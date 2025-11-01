// /public/event-handlers/_journal_filters.js
/**
 * @file Initializes filter handlers for the Journal tables.
 * @module event-handlers/_journal_filters
 */

import { state } from '../state.js';
import { renderJournalPage } from '../ui/renderers/_journal.js';

/**
 * Filters the journal entries based on the current filter input values.
 * @param {boolean} [readOnly=false] - Whether to render in read-only mode.
 */
function applyJournalFilters(readOnly = false) {
    // --- MODIFIED: Find filters within the watchlist panel OR the journal page ---
    const openFilterInput = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-open-filter-ticker')
    );
    const closedFilterInput = /** @type {HTMLInputElement} */ (
        document.getElementById('journal-closed-filter-ticker')
    );
    const closedStatusSelect = /** @type {HTMLSelectElement} */ (
        document.getElementById('journal-closed-filter-status')
    );
    // --- END MODIFICATION ---

    const openFilter = openFilterInput ? openFilterInput.value.toUpperCase() : '';
    const closedFilter = closedFilterInput ? closedFilterInput.value.toUpperCase() : '';
    const statusFilter = closedStatusSelect ? closedStatusSelect.value : '';

    const { openEntries, closedEntries } = state.journalEntries || { openEntries: [], closedEntries: [] };

    // Filter Open Entries
    const filteredOpen = openEntries.filter(entry => 
        !openFilter || entry.ticker.toUpperCase().includes(openFilter)
    );

    // Filter Closed Entries
    const filteredClosed = closedEntries.filter(entry => {
        const tickerMatch = !closedFilter || entry.ticker.toUpperCase().includes(closedFilter);
        const statusMatch = !statusFilter || entry.status === statusFilter;
        return tickerMatch && statusMatch;
    });

    // --- MODIFIED: Pass the readOnly flag to the renderer ---
    renderJournalPage({ openEntries: filteredOpen, closedEntries: filteredClosed }, readOnly);
}

/**
* Initializes event listeners for the journal filter inputs.
*/
export function initializeJournalFilterHandlers() {
    // --- MODIFIED: Find filters within the watchlist panel OR the journal page ---
    const openFilterInput = document.getElementById('journal-open-filter-ticker');
    const closedFilterInput = document.getElementById('journal-closed-filter-ticker');
    const closedStatusSelect = document.getElementById('journal-closed-filter-status');
    // --- END MODIFICATION ---

    // Determine readOnly state by checking the container
    // This is a bit of a hack, but it works.
    const isReadOnly = !!openFilterInput?.closest('#watchlist-paper-panel');

    if (openFilterInput) {
        openFilterInput.addEventListener('input', () => applyJournalFilters(isReadOnly));
    }
    if (closedFilterInput) {
        closedFilterInput.addEventListener('input', () => applyJournalFilters(isReadOnly));
    }
    if (closedStatusSelect) {
        closedStatusSelect.addEventListener('change', () => applyJournalFilters(isReadOnly));
    }
}