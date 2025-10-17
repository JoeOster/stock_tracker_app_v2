// /public/event-handlers/_snapshots.js
// Version 0.1.19
/**
 * @file Initializes all event handlers for the Snapshots page.
 * @module event-handlers/_snapshots
 */
import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { fetchSnapshots } from '../api.js';
import { renderSnapshots } from '../ui/renderers/_snapshots.js';
import { switchView } from './_navigation.js';

/**
 * Loads data for the snapshots page and triggers the renderer.
 */
export async function loadSnapshotsPage() {
    const tableBody = document.querySelector('#snapshots-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4">Loading snapshots...</td></tr>';
    }
    
    try {
        const snapshots = await fetchSnapshots(String(state.selectedAccountHolderId));
        state.allSnapshots = snapshots; // Ensure state is updated before rendering
        renderSnapshots(snapshots);
    } catch (error) {
        console.error(`Failed to load snapshots page:`, error);
        showToast(error.message, 'error');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4">Error loading snapshots.</td></tr>';
        }
    }
}

/**
 * Initializes all event listeners for the Snapshots page.
 */
export function initializeSnapshotsHandlers() {
    const addSnapshotForm = /** @type {HTMLFormElement} */ (document.getElementById('add-snapshot-form'));
    const snapshotsTable = document.getElementById('snapshots-table');

    if (addSnapshotForm) {
        addSnapshotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const snapshot = {
                account_holder_id: (/** @type {HTMLSelectElement} */(document.getElementById('snapshot-account-holder'))).value,
                snapshot_date: (/** @type {HTMLInputElement} */(document.getElementById('snapshot-date'))).value,
                exchange: (/** @type {HTMLSelectElement} */(document.getElementById('snapshot-exchange'))).value,
                value: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('snapshot-value'))).value)
            };
            try {
                if (!snapshot.account_holder_id) {
                    throw new Error("Please select an account holder.");
                }
                const res = await fetch('/api/utility/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                addSnapshotForm.reset();
                showToast('Snapshot saved!', 'success');
                await switchView('snapshots', null);
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    if (snapshotsTable) {
        snapshotsTable.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const deleteBtn = /** @type {HTMLElement} */ (target.closest('.delete-snapshot-btn'));
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                showConfirmationModal('Delete Snapshot?', 'This cannot be undone.', async () => {
                     try {
                        const res = await fetch(`/api/utility/snapshots/${id}`, { method: 'DELETE' });
                        if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                        showToast('Snapshot deleted.', 'success');
                        await switchView('snapshots', null);
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                    }
                });
            }
        });
    }
}