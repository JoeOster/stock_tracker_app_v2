// public/event-handlers/_importer.js

/* global Papa */ // Informs the type checker that Papa is a global variable.

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { brokerageTemplates } from '../importer-templates.js';
import { switchView } from './_navigation.js';

let parsedCsvData = [];
let existingTransactions = [];

/**
 * Validates a single parsed transaction row.
 * @param {object} row - The transaction object parsed from the CSV.
 * @returns {{isValid: boolean, error: string|null}} - The validation result.
 */
function validateRow(row) {
    if (!row.date || isNaN(new Date(row.date).getTime())) {
        return { isValid: false, error: 'Invalid or missing date.' };
    }
    if (!row.ticker || typeof row.ticker !== 'string' || row.ticker.trim().length === 0) {
        return { isValid: false, error: 'Invalid or missing ticker symbol.' };
    }
    if (isNaN(row.quantity) || row.quantity <= 0) {
        return { isValid: false, error: 'Invalid or zero quantity.' };
    }
    if (isNaN(row.price) || row.price <= 0) {
        return { isValid: false, error: 'Invalid or zero price.' };
    }
    return { isValid: true, error: null };
}


/**
 * Compares a parsed CSV row against existing transactions to find potential duplicates.
 * @param {object} parsedRow - The transaction parsed from the CSV.
 * @returns {{status: string, match: object|null}} - The status ('New' or 'Potential Duplicate') and the matched transaction if found.
 */
function findConflict(parsedRow) {
    const TOLERANCE = 0.02; // 2 cents tolerance for price matching

    for (const existingTx of existingTransactions) {
        const isSameDay = existingTx.transaction_date === parsedRow.date;
        const isSameTicker = existingTx.ticker.trim().toUpperCase() === parsedRow.ticker.trim().toUpperCase();
        const isSameAction = existingTx.transaction_type === parsedRow.action;
        const isSimilarPrice = Math.abs(existingTx.price - parsedRow.price) <= TOLERANCE;
        const isSameQuantity = existingTx.quantity === parsedRow.quantity;

        if (isSameDay && isSameTicker && isSameAction && isSimilarPrice && isSameQuantity) {
            return { status: 'Potential Duplicate', match: existingTx };
        }
    }
    return { status: 'New', match: null };
}


async function parseAndReview(file, template, accountHolderId) {
    try {
        const response = await fetch(`/api/transactions?holder=${accountHolderId}`);
        if (!response.ok) {
            throw new Error('Could not fetch existing transactions for comparison.');
        }
        existingTransactions = await response.json();

        Papa.parse(file, {
            header: true, // Let PapaParse handle the headers
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data;
                if (data.length < 1) { // Check if there's any data at all
                    showToast('CSV file appears to be empty or malformed.', 'error');
                    return;
                }

                parsedCsvData = data
                    .slice(template.dataStartRow - 1)
                    .filter(row => template.filter(row))
                    .map(row => template.transform(row))
                    .map(parsedRow => {
                        const { isValid, error } = validateRow(parsedRow);
                        if (!isValid) {
                            return { ...parsedRow, status: 'Invalid', error, resolution: null };
                        }

                        const { status, match } = findConflict(parsedRow);
                        return { ...parsedRow, status, matchedTx: match, resolution: null };
                    });

                if (parsedCsvData.length > 0) {
                    document.getElementById('import-step-1').style.display = 'none';
                    document.getElementById('import-step-2').style.display = 'block';
                    renderReconciliationTable(parsedCsvData);
                } else {
                    showToast('No valid buy or sell transactions found in the file based on the template rules.', 'info');
                }
            },
            error: (err) => {
                showToast(`CSV Parsing Error: ${err.message}`, 'error');
            }
        });
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function renderReconciliationTable(data) {
    const tableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#reconciliation-table tbody'));
    if (!tableBody) return;
    tableBody.innerHTML = '';

    data.forEach((row, index) => {
        const tableRow = tableBody.insertRow();
        let statusClass = '';
        let statusText = row.status;
        let actionsHtml = `<button class="ignore-btn delete-btn" data-index="${index}">Ignore</button>`;

        if (row.status === 'Potential Duplicate') {
            statusClass = 'status-duplicate';
            if (row.resolution) {
                statusClass = 'status-resolved';
                statusText = `Resolved: ${row.resolution}`;
                actionsHtml = `<button class="undo-btn" data-index="${index}">Undo</button>`;
            } else {
                actionsHtml = `
                    <button class="resolve-btn" data-index="${index}" data-action="link">Use Manual (Link)</button>
                    <button class="resolve-btn" data-index="${index}" data-action="replace">Replace with CSV</button>
                `;
            }
        } else if (row.status === 'Ignored') {
            statusClass = 'status-ignored';
             actionsHtml = `<button class="undo-btn" data-index="${index}">Undo</button>`;
        } else if (row.status === 'Invalid') {
            statusClass = 'status-invalid';
            statusText = `<span title="${row.error}">Invalid Data</span>`;
        }

        tableRow.innerHTML = `
            <td>${row.date}</td>
            <td>${row.ticker}</td>
            <td>${row.type}</td>
            <td class="numeric">${row.quantity}</td>
            <td class="numeric">${row.price ? row.price.toFixed(2) : 'N/A'}</td>
            <td class="${statusClass}">${statusText}</td>
            <td class="actions-cell">${actionsHtml}</td>
        `;
    });
}


export function initializeImporterHandlers() {
    const brokerageSelect = /** @type {HTMLSelectElement} */ (document.getElementById('brokerage-template-select'));
    const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('csv-file-input'));
    const reviewBtn = /** @type {HTMLButtonElement} */ (document.getElementById('review-csv-btn'));
    const backBtn = /** @type {HTMLButtonElement} */ (document.getElementById('import-back-btn'));
    const reconciliationTable = /** @type {HTMLTableElement} */ (document.getElementById('reconciliation-table'));
    const finalizeBtn = /** @type {HTMLButtonElement} */ (document.getElementById('finalize-import-btn'));
    const accountHolderSelect = /** @type {HTMLSelectElement} */ (document.getElementById('import-account-holder'));


    brokerageSelect.addEventListener('change', () => {
        fileInput.disabled = false;
    });

    fileInput.addEventListener('change', () => {
        reviewBtn.disabled = fileInput.files.length === 0;
    });

    reviewBtn.addEventListener('click', () => {
        const templateKey = brokerageSelect.value;
        const file = fileInput.files[0];
        const accountHolderId = accountHolderSelect.value;

        if (!templateKey || !file || !accountHolderId) {
            showToast('Please select an account, a brokerage template, and a file.', 'error');
            return;
        }

        const template = brokerageTemplates[templateKey];
        parseAndReview(file, template, accountHolderId);
    });

    backBtn.addEventListener('click', () => {
        document.getElementById('import-step-1').style.display = 'block';
        document.getElementById('import-step-2').style.display = 'none';
        fileInput.value = '';
        reviewBtn.disabled = true;
    });

    reconciliationTable.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.matches('.resolve-btn')) {
            const index = parseInt(target.dataset.index, 10);
            const action = target.dataset.action;
            if (action === 'link') {
                parsedCsvData[index].resolution = 'Kept Manual';
            } else if (action === 'replace') {
                parsedCsvData[index].resolution = 'Replaced with CSV';
            }
        } else if (target.matches('.ignore-btn')) {
            const index = parseInt(target.dataset.index, 10);
            parsedCsvData[index].status = 'Ignored';
        } else if (target.matches('.undo-btn')) {
            const index = parseInt(target.dataset.index, 10);
            const { status, match } = findConflict(parsedCsvData[index]);
            parsedCsvData[index].status = status;
            parsedCsvData[index].matchedTx = match;
            parsedCsvData[index].resolution = null;
        }
        renderReconciliationTable(parsedCsvData);
    });

    finalizeBtn.addEventListener('click', async () => {
        const accountHolderId = accountHolderSelect.value;
        const templateKey = brokerageSelect.value;
        const exchange = brokerageTemplates[templateKey].name;

        const payload = {
            toCreate: [],
            toDelete: [],
            accountHolderId: accountHolderId
        };

        for (const row of parsedCsvData) {
            if (row.status === 'Ignored' || row.status === 'Invalid' || row.resolution === 'Kept Manual') {
                continue;
            }

            if (row.resolution === 'Replaced with CSV') {
                payload.toDelete.push(row.matchedTx.id);
                payload.toCreate.push({ ...row, exchange });
            } else if (row.status === 'New') {
                payload.toCreate.push({ ...row, exchange });
            }
        }

        if (payload.toCreate.length === 0 && payload.toDelete.length === 0) {
            showToast('No changes to import.', 'info');
            return;
        }

        finalizeBtn.disabled = true;
        finalizeBtn.textContent = 'Importing...';

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

            const data = await response.json();
            showToast(data.message, 'success');
            await switchView('ledger', null);

        } catch (error) {
            showToast(`Import failed: ${error.message}`, 'error');
        } finally {
            finalizeBtn.disabled = false;
            finalizeBtn.textContent = 'Finalize Import';
        }
    });
}

// Export internal functions for testing purposes.
export const forTesting = {
    validateRow,
    findConflict,
    setExistingTransactionsForTesting: (transactions) => {
        existingTransactions = transactions;
    }
};