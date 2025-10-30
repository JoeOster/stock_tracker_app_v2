/**
 * @file Initializes event handlers for the Journal page's filtering controls.
 * @module event-handlers/_journal_filters
 */

/**
 * Shows or hides a "No matching entries found" message row in a table body.
 * @param {HTMLTableSectionElement} tbody The table body.
 * @param {boolean} hasVisibleRows Whether any data rows are currently visible.
 * @param {number} colSpan The colspan for the message row.
 * @returns {void}
 */
 function handleNoResultsMessage(tbody, hasVisibleRows, colSpan) {
    const noResultsRowId = `${tbody.id}-no-results`;
    let noResultsRow = /** @type {HTMLTableRowElement | null} */(document.getElementById(noResultsRowId));

    if (!hasVisibleRows && !noResultsRow) {
        // Only add if there isn't already one and no rows are visible
        noResultsRow = tbody.insertRow(); // Insert at the end
        noResultsRow.id = noResultsRowId;
        const cell = noResultsRow.insertCell();
        cell.colSpan = colSpan;
        cell.textContent = 'No matching entries found.';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        cell.style.color = 'var(--text-muted-color)'; // Use theme color
    } else if (hasVisibleRows && noResultsRow) {
        // Remove the message row if data rows are now visible
        noResultsRow.remove();
    } else if (!hasVisibleRows && noResultsRow) {
        // Ensure colspan is correct if it changed (e.g., table structure updated)
         const cell = noResultsRow.cells[0];
         if (cell && cell.colSpan !== colSpan) {
             cell.colSpan = colSpan;
         }
    }
}

/**
 * Filters rows in a table based on ticker and optionally status.
 * @param {string} tbodySelector - CSS selector for the tbody element.
 * @param {string} tickerFilter - The ticker string to filter by (case-insensitive).
 * @param {string | null} statusFilter - The status string to filter by (exact match).
 * @returns {void}
 */
function filterTableRows(tbodySelector, tickerFilter, statusFilter) {
    const tbody = /** @type {HTMLTableSectionElement | null} */ (document.querySelector(tbodySelector));
    if (!tbody) return;

    const rows = tbody.getElementsByTagName('tr');
    let hasVisibleRows = false;
    let colSpan = 11; // Default colspan for open table
    if (tbodySelector === '#journal-closed-body') {
        colSpan = 10; // Colspan for closed table
    }


    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        if (cells.length === 0) continue; // Skip header rows or empty rows
        if (cells.length > 1) colSpan = cells.length; // Update colspan based on actual data row

        // Determine cell indices based on which table body we are filtering
        const tickerCellIndex = tbodySelector === '#journal-open-body' ? 1 : 2;
        const statusCellIndex = tbodySelector === '#journal-closed-body' ? 7 : -1; // Status only relevant for closed table

        const tickerCell = cells[tickerCellIndex];
        const statusCell = statusCellIndex !== -1 ? cells[statusCellIndex] : null;

        let tickerMatch = true;
        let statusMatch = true;

        // Check ticker match
        if (tickerCell) {
            const ticker = tickerCell.textContent?.toUpperCase() || '';
            tickerMatch = ticker.includes(tickerFilter);
        } else {
            tickerMatch = false; // Hide rows without a ticker cell (like loading/no results)
        }

        // Check status match (only for closed table)
        if (statusCell && statusFilter) {
             // Extract base status (e.g., "EXECUTED" from "EXECUTED (Tx #123)")
             const statusText = (statusCell.textContent || '').split(' ')[0];
             statusMatch = statusText === statusFilter;
        }

        // Apply visibility
        if (tickerMatch && statusMatch) {
            row.style.display = '';
            // Only count data rows as visible, exclude potential "no results" row
            if (!row.id.endsWith('-no-results')) {
                hasVisibleRows = true;
            }
        } else {
            // Don't hide the "no results" row itself
            if (!row.id.endsWith('-no-results')) {
                 row.style.display = 'none';
            }
        }
    }

     handleNoResultsMessage(tbody, hasVisibleRows, colSpan);
}


/**
 * Initializes the event listeners for the filter inputs on the Journal page.
 * @returns {void}
 */
export function initializeJournalFilterHandlers() {
    const openFilterInput = /** @type {HTMLInputElement | null} */ (document.getElementById('journal-open-filter-ticker'));
    const closedFilterInput = /** @type {HTMLInputElement | null} */ (document.getElementById('journal-closed-filter-ticker'));
    const closedStatusSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('journal-closed-filter-status'));

    const applyFilters = () => {
        const openTicker = openFilterInput ? openFilterInput.value.toUpperCase() : '';
        const closedTicker = closedFilterInput ? closedFilterInput.value.toUpperCase() : '';
        const closedStatus = closedStatusSelect ? closedStatusSelect.value : ''; // Empty string means "All Closed/Executed"

        filterTableRows('#journal-open-body', openTicker, null); // Status filter not applicable to open table
        filterTableRows('#journal-closed-body', closedTicker, closedStatus || null); // Pass null if 'All' is selected
    };

    if (openFilterInput) {
        openFilterInput.addEventListener('input', applyFilters);
    } else {
        console.warn("Could not find open journal filter input.");
    }
    if (closedFilterInput) {
        closedFilterInput.addEventListener('input', applyFilters);
    } else {
        console.warn("Could not find closed journal filter input.");
    }
    if (closedStatusSelect) {
        closedStatusSelect.addEventListener('change', applyFilters);
    } else {
        console.warn("Could not find closed journal status select.");
    }
}