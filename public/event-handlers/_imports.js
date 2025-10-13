// public/event-handlers/_imports.js
import { showToast } from '../ui/helpers.js';
import { brokerageTemplates } from './importer-templates.js'; // Corrected from BROKERAGE_TEMPLATES
// Note: You will need to add PapaParse to your index.html via CDN
// <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>

function renderReconciliationUI(data) {
    const newTransactionsBody = document.getElementById('new-transactions-body');
    const conflictsBody = document.getElementById('conflicts-body');

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
    const importCsvBtn = document.getElementById('import-csv-btn');

    if (importCsvBtn) {
        importCsvBtn.addEventListener('click', async () => {
            const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('csv-file-input'));
            const accountHolderId = (/** @type {HTMLSelectElement} */ (document.getElementById('import-account-holder'))).value;
            const brokerage = (/** @type {HTMLSelectElement} */ (document.getElementById('brokerage-template-select'))).value;
            
            if (!fileInput.files || fileInput.files.length === 0) {
                 return showToast('Please select a file to upload.', 'error');
            }
            const file = fileInput.files[0];

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
                
                // Store session ID and render the UI for review
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
}