// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/public/event-handlers/_imports.js
import { showToast } from '../ui/helpers.js';
import { switchView } from './_navigation.js';

let brokerageTemplates = {}; // This will be populated by fetching the templates.

function renderReconciliationUI(data, summary) {
    const newTransactionsBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('new-transactions-body'));
    const conflictsBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('conflicts-body'));
    const summaryContainer = document.getElementById('import-summary-container');

    if (!newTransactionsBody || !conflictsBody || !summaryContainer) return;

    summaryContainer.innerHTML = `
        <div class="summary-item"><strong>Buys Found:</strong> ${summary.buys}</div>
        <div class="summary-item"><strong>Sells Found:</strong> ${summary.sells}</div>
        <div class="summary-item"><strong>Conflicts Found:</strong> ${summary.conflicts}</div>
        <div class="summary-item"><strong>Other Rows Ignored:</strong> ${summary.other}</div>
    `;

    newTransactionsBody.innerHTML = '';
    conflictsBody.innerHTML = '';

    if (data.newTransactions.length === 0) {
        newTransactionsBody.innerHTML = '<tr><td colspan="5">No new transactions to import.</td></tr>';
    } else {
        data.newTransactions.forEach(item => {
            const row = newTransactionsBody.insertRow();
            row.innerHTML = `
                <td>${item.date}</td>
                <td>${item.ticker}</td>
                <td>${item.type}</td>
                <td class="numeric">${item.quantity}</td>
                <td class="numeric">${item.price.toFixed(2)}</td>
            `;
        });
    }

    if (data.conflicts.length === 0) {
        conflictsBody.innerHTML = '<tr><td colspan="11">No conflicts detected.</td></tr>';
    } else {
        data.conflicts.forEach(item => {
            const row = conflictsBody.insertRow();
            row.innerHTML = `
                <td>${item.csvData.date}</td>
                <td>${item.csvData.ticker}</td>
                <td>${item.csvData.type}</td>
                <td class="numeric">${item.csvData.quantity}</td>
                <td class="numeric">${item.csvData.price.toFixed(2)}</td>
                <td>--></td>
                <td>${item.manualTransaction.transaction_date}</td>
                <td>${item.manualTransaction.ticker}</td>
                <td class="numeric">${item.manualTransaction.quantity}</td>
                <td class="numeric">${item.manualTransaction.price.toFixed(2)}</td>
                <td>
                    <select class="conflict-resolution" data-manual-id="${item.manualTransaction.id}" data-csv-index="${item.csvRowIndex}">
                        <option value="KEEP">Keep Manual</option>
                        <option value="REPLACE" selected>Replace with CSV</option>
                    </select>
                </td>
            `;
        });
    }

    document.getElementById('reconciliation-section').style.display = 'block';
}


export function initializeImportHandlers() {
    // Fetch the templates from the new API endpoint.
    fetch('/api/utility/importer-templates')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            brokerageTemplates = data.brokerageTemplates;
        }).catch(err => {
            console.error("Could not load importer templates:", err);
            showToast("Error: Could not load importer templates.", "error", 10000);
        });

    const importCsvBtn = /** @type {HTMLButtonElement} */ (document.getElementById('import-csv-btn'));
    const commitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('commit-import-btn'));
    const cancelBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cancel-import-btn'));
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('csv-file-input'));
    const accountHolderSelect = /** @type {HTMLSelectElement} */ (document.getElementById('import-account-holder'));
    const brokerageSelect = /** @type {HTMLSelectElement} */ (document.getElementById('brokerage-template-select'));

    if (importCsvBtn) {
        importCsvBtn.addEventListener('click', async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                 return showToast('Please select a file to upload.', 'error');
            }
            const file = fileInput.files[0];

            if (!accountHolderSelect.value || !brokerageSelect.value) {
                return showToast('Please select an account and a brokerage template.', 'error');
            }

            const formData = new FormData();
            formData.append('csvfile', file);
            formData.append('accountHolderId', accountHolderSelect.value);
            formData.append('brokerageTemplate', brokerageSelect.value);

            try {
                const response = await fetch('/api/importer/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Upload failed');
                }

                const result = await response.json();
                
                const reconSection = document.getElementById('reconciliation-section');
                if (reconSection) {
                    reconSection.dataset.sessionId = result.importSessionId;
                    renderReconciliationUI(result.reconciliationData, result.summary);
                }

            } catch (error) {
                showToast(`Error: ${error.message}`, 'error', 10000);
            }
        });
    }
    
    if (commitBtn) {
        commitBtn.addEventListener('click', async () => {
            const reconSection = document.getElementById('reconciliation-section');
            const sessionId = reconSection.dataset.sessionId;
            const resolutions = Array.from(document.querySelectorAll('.conflict-resolution')).map(select => ({
                manualId: (/** @type {HTMLSelectElement} */(select)).dataset.manualId,
                csvIndex: (/** @type {HTMLSelectElement} */(select)).dataset.csvIndex,
                resolution: (/** @type {HTMLSelectElement} */(select)).value,
            }));
            
            const payload = { sessionId, resolutions };

            commitBtn.disabled = true;
            commitBtn.textContent = "Importing...";

            try {
                const response = await fetch('/api/transactions/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Server returned an error.');
                }

                const result = await response.json();
                showToast(result.message, 'success', 10000);
                await switchView('ledger', null);

            } catch (error) {
                showToast(`Import failed: ${error.message}`, 'error', 10000);
            } finally {
                commitBtn.disabled = false;
                commitBtn.textContent = "Commit Changes";
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('reconciliation-section').style.display = 'none';
            fileInput.value = '';
            accountHolderSelect.value = '';
            brokerageSelect.value = '';
        });
    }
}