# fix_missing_journal_action.ps1
# This script fixes the "Unexpected reserved word" (SyntaxError) by:
# 1. Creating the missing 'public/event-handlers/_research_sources_actions_journal.js' file.
# 2. Extracting the 'initializeJournalForm' logic from '_research_sources_handlers.js'
#    and moving it into the new file, satisfying the broken import.

$ErrorActionPreference = "Stop"

try {
    # Get the base directory paths
    $baseDir = Get-Location
    $handlerDir = Join-Path $baseDir "public\event-handlers"

    Write-Host -ForegroundColor Cyan "Starting fix for missing journal action file..."

    # 1. CREATE the NEW missing file: _research_sources_actions_journal.js
    $journalActionPath = Join-Path $handlerDir "_research_sources_actions_journal.js"
    $journalActionContent = @'
// /public/event-handlers/_research_sources_actions_journal.js
/**
 * @file Contains action handlers for the Journal (Techniques) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_journal
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { addJournalEntry } from '../api/journal-api.js';

/**
 * Initializes the "Add Technique" (Journal Entry) form.
 * @param {HTMLFormElement} form - The form element.
 * @param {object} source - The advice source object.
 */
export function initializeJournalForm(form, source) {
    // Populate strategy dropdown (assuming strategies are in state, which they should be)
    const strategySelect = /** @type {HTMLSelectElement} */(document.getElementById('source-journal-strategy'));
    if (strategySelect && state.allStrategies && state.allStrategies.length > 0) {
        strategySelect.innerHTML = '<option value="">-- Select Strategy --</option>'; // Clear
        state.allStrategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = String(strategy.id);
            option.textContent = strategy.name;
            strategySelect.appendChild(option);
        });
    } else if (strategySelect) {
        strategySelect.innerHTML = '<option value="">-- No Strategies Found --</option>';
    }

    // Attach submit listener
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateInput = /** @type {HTMLInputElement} */(document.getElementById('source-journal-date'));
        const tickerInput = /** @type {HTMLInputElement} */(document.getElementById('source-journal-ticker'));
        const strategyInput = /** @type {HTMLSelectElement} */(document.getElementById('source-journal-strategy'));
        const entryInput = /** @type {HTMLInputElement} */(document.getElementById('source-journal-entry'));
        const qtyInput = /** @type {HTMLInputElement} */(document.getElementById('source-journal-qty'));
        const tp1Input = /** @type {HTMLInputElement} */(document.getElementById('source-journal-tp1'));
        const slInput = /** @type {HTMLInputElement} */(document.getElementById('source-journal-sl'));

        const entryData = {
            account_holder_id: state.selectedAccountHolderId,
            advice_source_id: source.id, // Link to the source
            ticker: tickerInput.value.toUpperCase(),
            strategy_id: strategyInput.value,
            entry_date: dateInput.value,
            entry_price: parseFloat(entryInput.value),
            quantity: parseFloat(qtyInput.value),
            target_price: tp1Input.value ? parseFloat(tp1Input.value) : null,
            stop_loss: slInput.value ? parseFloat(slInput.value) : null,
            status: 'OPEN',
            linked_document_urls: [] // Not supported by this quick-form
        };

        if (!entryData.entry_date || !entryData.ticker || !entryData.strategy_id || !entryData.entry_price || !entryData.quantity) {
            showToast('Date, Ticker, Strategy, Entry Price, and Quantity are required.', 'error');
            return;
        }

        try {
            await addJournalEntry(entryData);
            showToast('New technique added!', 'success');
            form.reset();
            // Refresh the modal to show the new item
            const { openSourceDetailsModal } = await import('./_research_sources_modal.js');
            await openSourceDetailsModal(source.id);
        } catch (error) {
            console.error('Failed to add journal entry:', error);
            // @ts-ignore
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}
'@
    Write-Host "Creating: $journalActionPath"
    $journalActionContent | Out-File -FilePath $journalActionPath -Encoding utf8

    # 2. OVERWRITE _research_sources_handlers.js to remove the logic
    $handlersPath = Join-Path $handlerDir "_research_sources_handlers.js"
    $handlersContent = @'
// /public/event-handlers/_research_sources_handlers.js
/**
 * @file This file is now primarily for handling actions that
 * require opening OTHER modals from the Source Details modal,
 * such as the 'Edit Transaction' modal.
 * @module event-handlers/_research_sources_handlers
 */

import { state } from '../state.js';
// The logic for initializeJournalForm has been moved to
// _research_sources_actions_journal.js

/**
 * Populates the 'Edit Transaction' modal with data from a transaction row.
 * @param {string} transactionId - The ID of the transaction to edit.
 */
function populateAndShowEditModal(transactionId) {
    const tx = state.transactions.find(t => String(t.id) === transactionId);
    const editModal = document.getElementById('edit-modal');
    if (!tx || !editModal) {
        console.error(`Transaction not found in state with ID: ${transactionId}`);
        return;
    }

    // --- Populate Modal Fields ---
    (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value = String(tx.id);
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value = String(tx.account_holder_id);
    (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value = tx.transaction_date;
    (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value = tx.ticker;
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value = tx.exchange;
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value = tx.transaction_type;
    (/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value = String(tx.quantity);
    (/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value = String(tx.price);
    
    // Limits
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = String(tx.limit_price_up ?? '');
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = tx.limit_up_expiration ?? '';
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = String(tx.limit_price_down ?? '');
    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = tx.limit_down_expiration ?? '';
    
    // Advice Source
    (/** @type {HTMLSelectElement} */(document.getElementById('edit-advice-source'))).value = String(tx.advice_source_id ?? '');

    // --- Show/Hide Sections & Set Title ---
    const coreFields = /** @type {HTMLElement | null} */ (document.getElementById('edit-core-fields'));
    const limitFields = /** @type {HTMLElement | null} */ (document.getElementById('edit-limit-fields'));
    const modalTitle = document.getElementById('edit-modal-title');
    
    if (modalTitle) modalTitle.textContent = 'Edit Transaction';
    if (coreFields) coreFields.style.display = 'block';
    // Hide limit fields; this modal is for basic edits.
    // Full limit editing is on the Dashboard/Ledger.
    if (limitFields) limitFields.style.display = 'none';

    // --- Disable fields that shouldn't be edited from this context ---
    const editTickerInput = /** @type {HTMLInputElement | null} */(document.getElementById('edit-ticker'));
    const editTypeSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('edit-type'));
    if (editTickerInput) editTickerInput.readOnly = true; // Don't allow changing ticker
    if (editTypeSelect) editTypeSelect.disabled = true; // Don't allow changing type

    editModal.classList.add('visible'); // Show the modal
}


/**
 * Initializes click handlers for the Source Details modal that
 * need to open OTHER modals (e.g., Edit Transaction).
 * @param {HTMLElement} contentArea - The content area of the modal.
 */
export function initializeSourceModalSubHandlers(contentArea) {
    contentArea.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        
        // --- Edit Transaction Button ---
        const editTxBtn = target.closest('.edit-transaction-btn');
        if (editTxBtn) {
            const transactionId = editTxBtn.dataset.id;
            if (transactionId) {
                populateAndShowEditModal(transactionId);
            }
            return;
        }

        // --- Add/Edit Journal Entry ---
        // This logic is now handled in _research_sources_actions_journal.js
        // and attached in _research_sources_listeners.js
    });
}
'@
    Write-Host "Overwriting: $handlersPath"
    $handlersContent | Out-File -FilePath $handlersPath -Encoding utf8

    Write-Host -ForegroundColor Green "---"
    Write-Host -ForegroundColor Green "Bugfix complete!"
    Write-Host -ForegroundColor Green "Created _research_sources_actions_journal.js and moved logic."
    Write-Host -ForegroundColor Yellow "The SyntaxError should now be resolved. Please hard-refresh (Ctrl+Shift+R) and check."

} catch {
    Write-Host -ForegroundColor Red "An error occurred:"
    Write-Host -ForegroundColor Red $_
}