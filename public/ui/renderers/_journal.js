// public/ui/renderers/_journal.js
/**
 * @file Renderer for the Journal page.
 * @module renderers/_journal
 */

import { state } from '../../state.js';
import { formatAccounting, formatQuantity } from '../formatters.js';

/**
 * Populates the advice source dropdown in the add journal entry form.
 */
function populateAdviceSourceDropdown() {
    const select = /** @type {HTMLSelectElement} */ (document.getElementById('journal-advice-source'));
    if (!select) return;

    // Preserve the current selection if possible
    const currentValue = select.value;
    select.innerHTML = '<option value="">(None/Manual Entry)</option>'; // Default option

    if (state.allAdviceSources && state.allAdviceSources.length > 0) {
        // Sort sources alphabetically by name
        const sortedSources = [...state.allAdviceSources].sort((a, b) => a.name.localeCompare(b.name));

        sortedSources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.id;
            // Display name and type for clarity
            option.textContent = `${source.name} (${source.type})`;
            select.appendChild(option);
        });
    }

    // Try to restore the previous selection
    select.value = currentValue;
}


/**
 * Renders the rows for the open journal entries table.
 * @param {HTMLTableSectionElement} tbody The table body element to populate.
 * @param {any[]} openEntries Array of open journal entry objects.
 */
function renderOpenEntriesTable(tbody, openEntries) {
    tbody.innerHTML = ''; // Clear existing rows

    if (!openEntries || openEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">No open journal entries found.</td></tr>';
        return;
    }

    openEntries.forEach(entry => {
        const row = tbody.insertRow();
        row.dataset.entryId = entry.id; // Add ID for event handling

        // Calculate potential gain/loss based on targets vs entry
        const potentialGain = entry.target_price ? (entry.target_price - entry.entry_price) * entry.quantity : null;
        const potentialLoss = entry.stop_loss_price ? (entry.stop_loss_price - entry.entry_price) * entry.quantity : null;
        const currentPnl = entry.current_pnl; // Comes pre-calculated from backend GET

        // Determine color class based on current P/L
        let pnlClass = '';
        if (currentPnl !== null && currentPnl !== undefined) {
            pnlClass = currentPnl >= 0 ? 'positive' : 'negative';
        }

        row.innerHTML = `
            <td>${entry.entry_date}</td>
            <td>${entry.ticker}</td>
            <td class="numeric">${formatAccounting(entry.entry_price)}</td>
            <td class="numeric">${formatQuantity(entry.quantity)}</td>
            <td class="numeric ${potentialGain !== null && potentialGain >= 0 ? 'positive' : 'negative'}">${entry.target_price ? formatAccounting(entry.target_price) : '--'}</td>
            <td class="numeric ${potentialLoss !== null && potentialLoss < 0 ? 'negative' : 'positive'}">${entry.stop_loss_price ? formatAccounting(entry.stop_loss_price) : '--'}</td>
            <td class="numeric">${entry.current_price ? formatAccounting(entry.current_price) : '--'}</td>
            <td class="numeric ${pnlClass}">${currentPnl !== null ? formatAccounting(currentPnl) : '--'}</td>
            <td>${entry.advice_source_name || entry.advice_source_details || '--'}</td>
            <td class="center-align actions-cell">
                <button class="journal-execute-btn" data-id="${entry.id}" title="Execute this idea as a real BUY transaction">Execute Buy</button>
                <button class="journal-close-btn" data-id="${entry.id}" title="Manually close this paper trade">Close Trade</button>
                <button class="journal-edit-btn" data-id="${entry.id}">Edit</button>
                <button class="journal-delete-btn delete-btn" data-id="${entry.id}">Delete</button>
            </td>
        `;
    });
}

/**
 * Renders the rows for the closed/executed journal entries table.
 * @param {HTMLTableSectionElement} tbody The table body element to populate.
 * @param {any[]} closedEntries Array of closed/executed journal entry objects.
 */
function renderClosedEntriesTable(tbody, closedEntries) {
    tbody.innerHTML = ''; // Clear existing rows

    if (!closedEntries || closedEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">No closed or executed journal entries found.</td></tr>';
        return;
    }

    closedEntries.forEach(entry => {
        const row = tbody.insertRow();
        row.dataset.entryId = entry.id;

        const pnlClass = entry.pnl >= 0 ? 'positive' : 'negative';
        let statusDisplay = entry.status;
        if (entry.status === 'EXECUTED' && entry.linked_trade_id) {
            // Optionally make this a link to the ledger entry later
            statusDisplay += ` (Tx #${entry.linked_trade_id})`;
        }


        row.innerHTML = `
            <td>${entry.entry_date}</td>
            <td>${entry.exit_date || '--'}</td>
            <td>${entry.ticker}</td>
            <td class="numeric">${formatAccounting(entry.entry_price)}</td>
            <td class="numeric">${entry.exit_price ? formatAccounting(entry.exit_price) : '--'}</td>
            <td class="numeric">${formatQuantity(entry.quantity)}</td>
            <td class="numeric ${pnlClass}">${entry.pnl !== null ? formatAccounting(entry.pnl) : '--'}</td>
            <td>${statusDisplay}</td>
            <td>${entry.advice_source_name || entry.advice_source_details || '--'}</td>
            <td class="center-align actions-cell">
                <button class="journal-edit-btn" data-id="${entry.id}">View/Edit</button>
                 <button class="journal-delete-btn delete-btn" data-id="${entry.id}">Delete</button>
                 </td>
        `;
    });
}

/**
 * Calculates and renders summary statistics for the journal page.
 * @param {any[]} openEntries Array of open journal entry objects.
 * @param {any[]} closedEntries Array of closed/executed journal entry objects.
 */
function renderJournalSummary(openEntries, closedEntries) {
    const openCountEl = document.getElementById('journal-open-count');
    const openPnlEl = document.getElementById('journal-open-pnl');
    const winRateEl = document.getElementById('journal-win-rate');
    const avgGainLossEl = document.getElementById('journal-avg-gain-loss');

    // Open Entries Summary
    const validOpenPnlEntries = openEntries.filter(e => e.current_pnl !== null && e.current_pnl !== undefined);
    const totalOpenPnl = validOpenPnlEntries.reduce((sum, entry) => sum + entry.current_pnl, 0);
    const avgOpenPnl = validOpenPnlEntries.length > 0 ? totalOpenPnl / validOpenPnlEntries.length : 0;

    if (openCountEl) openCountEl.textContent = openEntries.length.toString();
    if (openPnlEl) {
        openPnlEl.textContent = formatAccounting(avgOpenPnl);
        openPnlEl.className = avgOpenPnl >= 0 ? 'positive' : 'negative';
    }

    // Closed Entries Summary
    const closedForStats = closedEntries.filter(e => ['CLOSED', 'EXECUTED'].includes(e.status) && e.pnl !== null && e.pnl !== undefined);
    const winners = closedForStats.filter(e => e.pnl > 0);
    const losers = closedForStats.filter(e => e.pnl < 0); // Exclude break-even trades from win rate denominator if desired

    const winRate = closedForStats.length > 0 ? (winners.length / closedForStats.length) * 100 : 0;
    const totalGain = winners.reduce((sum, entry) => sum + entry.pnl, 0);
    const totalLoss = losers.reduce((sum, entry) => sum + entry.pnl, 0); // Loss is negative
    const avgGain = winners.length > 0 ? totalGain / winners.length : 0;
    const avgLoss = losers.length > 0 ? totalLoss / losers.length : 0; // Avg loss will be negative

    if (winRateEl) winRateEl.textContent = `${winRate.toFixed(1)}%`;
    if (avgGainLossEl) {
         avgGainLossEl.innerHTML = `
            <span class="positive">${formatAccounting(avgGain)}</span> / <span class="negative">${formatAccounting(avgLoss)}</span>
        `;
    }

}

/**
 * Main rendering function for the Journal page.
 * @param {object} journalData - Object containing arrays of journal entries.
 * @param {any[]} journalData.openEntries - Array of open journal entries.
 * @param {any[]} journalData.closedEntries - Array of closed/executed/cancelled entries.
 */
export function renderJournalPage(journalData) {
    const { openEntries = [], closedEntries = [] } = journalData || {};

    // Ensure elements exist
    const openTableBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('journal-open-body'));
    const closedTableBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('journal-closed-body'));
    const exchangeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('journal-exchange'));

    // Populate dropdowns that rely on global state
    populateAdviceSourceDropdown();

    // Populate exchange dropdown (using existing state if available)
    if (exchangeSelect && state.allExchanges) {
        const currentVal = exchangeSelect.value;
        exchangeSelect.innerHTML = '<option value="" disabled selected>Select Exchange</option>';
        const sortedExchanges = [...state.allExchanges].sort((a, b) => a.name.localeCompare(b.name));
        sortedExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            exchangeSelect.appendChild(option);
        });
        exchangeSelect.value = currentVal; // Restore previous or stay at default
    }


    // Render Tables
    if (openTableBody) {
        renderOpenEntriesTable(openTableBody, openEntries);
    } else {
        console.error("Could not find open journal table body.");
    }

    if (closedTableBody) {
        renderClosedEntriesTable(closedTableBody, closedEntries);
    } else {
        console.error("Could not find closed journal table body.");
    }

    // Render Summary
    renderJournalSummary(openEntries, closedEntries);

    // Set default entry date
    const entryDateInput = /** @type {HTMLInputElement} */ (document.getElementById('journal-entry-date'));
    if (entryDateInput && !entryDateInput.value) {
       // Requires datetime helper: import { getCurrentESTDateString } from '../ui/datetime.js';
       // entryDateInput.value = getCurrentESTDateString();
       entryDateInput.valueAsDate = new Date(); // Simple alternative using local time zone
    }

}