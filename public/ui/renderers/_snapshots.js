// Portfolio Tracker V3.0.5
// public/ui/renderers/_snapshots.js
import { state } from '../../state.js';
import { formatAccounting } from '../helpers.js';

/**
 * Renders the content of the Snapshots page from a given array of snapshot data.
 * This function no longer fetches its own data.
 * @param {any[]} snapshots - An array of snapshot objects to render.
 * @returns {void}
 */
export function renderSnapshotsPage(snapshots) {
    const exchangeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('snapshot-exchange'));
    
    // Update the global state with the new data.
    state.allSnapshots = snapshots;

    // Populate the exchange dropdown with the latest list of exchanges.
    if (exchangeSelect) {
        const currentVal = exchangeSelect.value;
        exchangeSelect.innerHTML = '<option value="" disabled selected>Select Exchange</option>';
        state.allExchanges.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.name;
            option.textContent = ex.name;
            exchangeSelect.appendChild(option);
        });
        exchangeSelect.value = currentVal;
    }

    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#snapshots-table tbody'));
    if (tableBody) {
        tableBody.innerHTML = ''; // Clear existing content
        if (snapshots.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No snapshots have been logged yet for this account holder.</td></tr>';
            return;
        }
        
        // Sort snapshots by date (newest first) and then by exchange name.
        const sortedSnapshots = [...snapshots].sort((a, b) => {
            if (a.snapshot_date > b.snapshot_date) return -1;
            if (a.snapshot_date < b.snapshot_date) return 1;
            return a.exchange.localeCompare(b.exchange);
        });

        // Build and append a row for each snapshot.
        sortedSnapshots.forEach(snap => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${snap.snapshot_date}</td>
                <td>${snap.exchange}</td>
                <td class="numeric">${formatAccounting(snap.value)}</td>
                <td class="actions-cell">
                    <button class="delete-snapshot-btn delete-btn" data-id="${snap.id}">Delete</button>
                </td>
            `;
        });
    }
}