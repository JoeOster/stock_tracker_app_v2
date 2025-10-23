// public/event-handlers/_snapshots.js
// Version Updated (Added Client-Side Validation & Sorting)
/**
 * @file Initializes all event handlers for the Snapshots page.
 * @module event-handlers/_snapshots
 */
import { state } from '../state.js';
// ADDED: Import sortTableByColumn
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
import { fetchSnapshots } from '../api.js';
import { renderSnapshots } from '../ui/renderers/_snapshots.js';
import { switchView } from './_navigation.js';
import { handleResponse } from '../api.js';

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
        state.allSnapshots = snapshots;
        renderSnapshots(snapshots);
    } catch (error) {
        console.error(`Failed to load snapshots page:`, error);
        showToast(`Error loading snapshots: ${error.message}`, 'error');
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
            const submitButton = /** @type {HTMLButtonElement | null} */(addSnapshotForm.querySelector('button[type="submit"]'));
            if(!submitButton) return;

            // --- Get Form Values ---
            const accountHolderId = (/** @type {HTMLSelectElement} */(document.getElementById('snapshot-account-holder'))).value;
            const snapshotDate = (/** @type {HTMLInputElement} */(document.getElementById('snapshot-date'))).value;
            const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('snapshot-exchange'))).value;
            const valueStr = (/** @type {HTMLInputElement} */(document.getElementById('snapshot-value'))).value;
            const value = parseFloat(valueStr);

            // --- Client-Side Validation ---
            if (!accountHolderId) { return showToast('Please select an account holder.', 'error'); }
             if (!snapshotDate) { return showToast('Please select a snapshot date.', 'error'); }
             if (!exchange) { return showToast('Please select an exchange.', 'error'); }
            if (isNaN(value) || value < 0) { return showToast('Total Account Value must be a valid non-negative number.', 'error'); }
            // --- End Validation ---

            const snapshot = {
                account_holder_id: accountHolderId,
                snapshot_date: snapshotDate,
                exchange: exchange,
                value: value
            };

            submitButton.disabled = true;
            try {
                const res = await fetch('/api/utility/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
                await handleResponse(res);
                addSnapshotForm.reset();
                showToast('Snapshot saved!', 'success');
                await switchView('snapshots', null);
            } catch (error) {
                showToast(`Error saving snapshot: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (snapshotsTable) {
        // --- ADDED: Table Header Sorting ---
        const thead = snapshotsTable.querySelector('thead');
        if (thead) {
            thead.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                const th = /** @type {HTMLTableCellElement} */ (target.closest('th[data-sort]'));
                if (th) {
                    const tbody = /** @type {HTMLTableSectionElement} */ (snapshotsTable.querySelector('tbody'));
                    if (tbody) {
                        sortTableByColumn(th, tbody);
                    }
                }
            });
        }
        // --- END ADDED ---

        // --- Delete Button Clicks (Delegated to table) ---
        snapshotsTable.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const deleteBtn = /** @type {HTMLElement} */ (target.closest('.delete-snapshot-btn'));
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                if (!id) return;

                showConfirmationModal('Delete Snapshot?', 'This cannot be undone.', async () => {
                     try {
                        const res = await fetch(`/api/utility/snapshots/${id}`, { method: 'DELETE' });
                        await handleResponse(res);
                        showToast('Snapshot deleted.', 'success');
                        await switchView('snapshots', null);
                    } catch (error) {
                        showToast(`Error deleting snapshot: ${error.message}`, 'error');
                    }
                });
            }
        });
    }
}