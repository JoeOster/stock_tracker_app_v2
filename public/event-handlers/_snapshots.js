// public/event-handlers/_snapshots.js
import { state, refreshSnapshots } from '../app-main.js';
import { renderSnapshotsPage } from '../ui/renderers.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';

/**
 * Initializes all event listeners for the Snapshots page.
 * This includes handling the form for adding new snapshots and the
 * click listener for deleting existing snapshots from the table.
 * @returns {void}
 */
export function initializeSnapshotsHandlers() {
    const addSnapshotForm = /** @type {HTMLFormElement} */ (document.getElementById('add-snapshot-form'));
    const snapshotsTable = document.getElementById('snapshots-table');

    // --- Add Snapshot Form Handler ---
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
                const res = await fetch('/api/utility/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                await refreshSnapshots();
                renderSnapshotsPage();
                addSnapshotForm.reset();
                showToast('Snapshot saved!', 'success');
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    // --- Snapshots Table Action Handler (Delete) ---
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
                        // Remove the snapshot from the local state to avoid a full re-fetch.
                        state.allSnapshots = state.allSnapshots.filter(s => s.id != id);
                        renderSnapshotsPage();
                        showToast('Snapshot deleted.', 'success');
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                    }
                });
            }
        });
    }
}