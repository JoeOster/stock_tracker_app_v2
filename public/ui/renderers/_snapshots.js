// public/ui/renderers/_snapshots.js
import { state } from '../../app-main.js';
import { formatAccounting } from '../helpers.js';

export function renderSnapshotsPage() {
    const exchangeSelect = document.getElementById('snapshot-exchange');
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

    const tableBody = document.querySelector('#snapshots-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        if (state.allSnapshots.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No snapshots have been logged yet for this account holder.</td></tr>';
            return;
        }
        
        const sortedSnapshots = [...state.allSnapshots].sort((a, b) => {
            if (a.snapshot_date > b.snapshot_date) return -1;
            if (a.snapshot_date < b.snapshot_date) return 1;
            return a.exchange.localeCompare(b.exchange);
        });

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