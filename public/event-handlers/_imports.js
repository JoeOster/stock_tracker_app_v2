// public/event-handlers/_imports.js

/* global Papa */ // Informs the type checker that Papa is a global variable.

import { showToast } from '../ui/helpers.js';
import { switchView } from './_navigation.js';

// This will be populated by fetching the templates from the server.
let brokerageTemplates = {};

function renderReconciliationUI(data) {
    const newTransactionsBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('new-transactions-body'));
    const conflictsBody = /** @type {HTMLTableSectionElement} */ (document.getElementById('conflicts-body'));

    if (!newTransactionsBody || !conflictsBody) return;

    newTransactionsBody.innerHTML = '';
    conflictsBody.innerHTML = '';

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

    document.getElementById('reconciliation-section').style.display = 'block';
}


export function initializeImportHandlers() {
    // Fetch the templates from the server once when the app initializes.
    fetch('/importer-templates.js')
        .then(response => {
            // Since the file is a JS file exporting a variable, we need to treat it as text
            // and then evaluate it to get the object. A cleaner way would be to serve it as JSON.
            // For now, let's assume it's served as a script that we can parse.
            // A better backend approach would be a dedicated endpoint that returns JSON.
            // But let's work with the current setup. We'll adjust server.js to serve this.
            return response.json();
        })
        .then(data => {
            brokerageTemplates = data.brokerageTemplates;
        }).catch(err => {
            console.error("Could not load importer templates:", err);
            showToast("Error: Could not load importer templates.", "error");
        });

    const importCsvBtn = /** @type {HTMLButtonElement} */ (document.getElementById('import-csv-btn'));
    const commitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('commit-import-btn'));
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('csv-file-input'));
    const accountHolderSelect = /** @type {HTMLSelectElement} */ (document.getElementById('import-account-holder'));
    const brokerageSelect = /** @type {HTMLSelectElement} */ (document.getElementById('brokerage-template-select'));

    if (importCsvBtn) {
        importCsvBtn.addEventListener('click', async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                 return showToast('Please select a file to upload.', 'error');
            }
            const file = fileInput.files[0];

            const accountHolderId = accountHolderSelect.value;
            const brokerage = brokerageSelect.value;

            if (!accountHolderId || !brokerage) {
                return showToast('Please select an account and a brokerage template.', 'error');
            }

            const formData = new FormData();
            formData.append('csvfile', file);
            formData.append('accountHolderId', accountHolderId);
            formData.append('brokerageTemplate', brokerage);

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
                    renderReconciliationUI(result.reconciliationData);
                }

            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
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
                showToast(result.message, 'success');
                await switchView('ledger', null);

            } catch (error) {
                showToast(`Import failed: ${error.message}`, 'error');
            } finally {
                commitBtn.disabled = false;
                commitBtn.textContent = "Commit Changes";
            }
        });
    }
}