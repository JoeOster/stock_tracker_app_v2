/**
 * @file Initializes event handlers for the Journal page forms and table actions.
 * @module event-handlers/_journal
 */

import { state, updateState } from '../state.js';
import {
    fetchJournalEntries,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    executeJournalEntry,
    updatePricesForView,
    refreshLedger
} from '../api.js';
import { renderJournalPage } from '../ui/renderers/_journal.js';
// ADDED: Import sortTableByColumn
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
// Import initializers for tabs and filters
import { initializeJournalSubTabHandlers } from './_journal_tabs.js';
import { initializeJournalFilterHandlers } from './_journal_filters.js';

/**
 * Loads data for the journal page (both open and closed entries) and triggers rendering.
 * Fetches open and non-open entries separately for robustness.
 */
export async function loadJournalPage() {
    const openTableBody = document.querySelector('#journal-open-body');
    const closedTableBody = document.querySelector('#journal-closed-body');

    // Show loading states
    if (openTableBody) openTableBody.innerHTML = '<tr><td colspan="10">Loading open entries...</td></tr>';
    if (closedTableBody) closedTableBody.innerHTML = '<tr><td colspan="10">Loading closed entries...</td></tr>';

    let openEntries = [];
    let closedEntriesCombined = [];
    let fetchError = null;

    try {
        const holderId = (state.selectedAccountHolderId === 'all' || !state.selectedAccountHolderId)
            ? null
            : String(state.selectedAccountHolderId);

        if (holderId) {
            // Fetch open entries
            try {
                openEntries = await fetchJournalEntries(holderId, 'OPEN');
            } catch (error) {
                console.error("Failed to load OPEN journal entries:", error);
                showToast(`Error loading open entries: ${error.message}`, 'error');
                fetchError = error; // Store error but continue
                if (openTableBody) openTableBody.innerHTML = '<tr><td colspan="10">Error loading open entries.</td></tr>';
            }

            // Fetch non-open entries
            try {
                const results = await Promise.allSettled([
                    fetchJournalEntries(holderId, 'CLOSED'),
                    fetchJournalEntries(holderId, 'EXECUTED'),
                    fetchJournalEntries(holderId, 'CANCELLED')
                ]);

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        closedEntriesCombined.push(...result.value); // Add fetched entries
                    } else {
                        const status = ['CLOSED', 'EXECUTED', 'CANCELLED'][index];
                        console.error(`Failed to load ${status} journal entries:`, result.reason);
                        showToast(`Error loading ${status} entries: ${result.reason.message}`, 'error');
                        fetchError = fetchError || result.reason;
                    }
                });

                 // Sort combined closed entries by date after fetching all
                 closedEntriesCombined.sort((a, b) => (b.exit_date || b.entry_date).localeCompare(a.exit_date || a.entry_date));


            } catch (error) { // Catch errors related to Promise.allSettled itself
                 console.error("Error fetching non-open journal entries groups:", error);
                 if (closedTableBody) closedTableBody.innerHTML = '<tr><td colspan="10">Error loading closed/executed entries.</td></tr>';
                 fetchError = fetchError || error;
            }

        } else {
             // Handle 'all' or no selection state
             console.log("No specific account holder selected, showing empty journal.");
             if (openTableBody) openTableBody.innerHTML = '<tr><td colspan="10">Please select an account holder to view journal entries.</td></tr>';
             if (closedTableBody) closedTableBody.innerHTML = '<tr><td colspan="10">Please select an account holder to view journal entries.</td></tr>';
        }

        updateState({ journalEntries: { openEntries: openEntries, closedEntries: closedEntriesCombined } });
        renderJournalPage({ openEntries, closedEntries: closedEntriesCombined });

    } catch (error) {
        // Catch unexpected errors
        console.error("Unexpected error loading journal page:", error);
        showToast(`Unexpected error loading journal data: ${error.message}`, 'error');
        if (openTableBody) openTableBody.innerHTML = '<tr><td colspan="10">Unexpected error loading data.</td></tr>';
        if (closedTableBody) closedTableBody.innerHTML = '<tr><td colspan="10">Unexpected error loading data.</td></tr>';
        updateState({ journalEntries: null }); // Clear state
    }
}


/**
 * Initializes event listeners for the Journal page forms and table actions.
 * Sub-tab switching and filtering are handled in separate modules.
 */
// /public/event-handlers/_journal.js
// ... (imports and other functions like loadJournalPage) ...

/**
 * Initializes event listeners for the Journal page forms and table actions.
 * Sub-tab switching and filtering are handled in separate modules.
 */
export function initializeJournalHandlers() {
    // ... (Call initializers for sub-tabs and filters) ...
    initializeJournalSubTabHandlers();
    initializeJournalFilterHandlers();

    const journalPageContainer = document.getElementById('journal-page-container');
    const addJournalEntryForm = /** @type {HTMLFormElement | null} */ (document.getElementById('add-journal-entry-form'));
    const openTable = document.getElementById('journal-open-table');
    const closedTable = document.getElementById('journal-closed-table');

    // --- Add Entry Form Submission ---
    if (addJournalEntryForm) {
        addJournalEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const addButton = /** @type {HTMLButtonElement | null} */ (addJournalEntryForm.querySelector('#add-journal-entry-btn'));
            if (!addButton) return;

            // ... (Get existing form values: holderId, entryDate, ticker, etc.) ...
            const accountHolderId = state.selectedAccountHolderId === 'all' ? null : String(state.selectedAccountHolderId);
            const entryDate = (/** @type {HTMLInputElement} */(document.getElementById('journal-entry-date'))).value;
            const ticker = (/** @type {HTMLInputElement} */(document.getElementById('journal-ticker'))).value.toUpperCase().trim();
            const exchange = (/** @type {HTMLSelectElement} */(document.getElementById('journal-exchange'))).value;
            const direction = (/** @type {HTMLSelectElement} */(document.getElementById('journal-direction'))).value;
            const quantityStr = (/** @type {HTMLInputElement} */(document.getElementById('journal-quantity'))).value;
            const entryPriceStr = (/** @type {HTMLInputElement} */(document.getElementById('journal-entry-price'))).value;
            const targetPriceStr = (/** @type {HTMLInputElement} */(document.getElementById('journal-target-price'))).value;
            // *** GET NEW FIELD VALUE ***
            const targetPrice2Str = (/** @type {HTMLInputElement} */(document.getElementById('journal-target-price-2'))).value;
            const stopLossPriceStr = (/** @type {HTMLInputElement} */(document.getElementById('journal-stop-loss-price'))).value;

            // ... (Existing validation: holderId, required fields, quantity, entryPrice) ...
            if (!accountHolderId) { return showToast('Please select a specific account holder.', 'error'); }
            if (!entryDate || !ticker || !exchange || !direction) { return showToast('Please fill in all required fields (*).', 'error'); }
            const quantity = parseFloat(quantityStr);
            const entryPrice = parseFloat(entryPriceStr);
            if (isNaN(quantity) || quantity <= 0) { return showToast('Quantity must be a valid positive number.', 'error'); }
            if (isNaN(entryPrice) || entryPrice <= 0) { return showToast('Entry Price must be a valid positive number.', 'error'); }

            const targetPrice = targetPriceStr ? parseFloat(targetPriceStr) : null;
            if (targetPrice !== null && (isNaN(targetPrice) || targetPrice <= 0)) { return showToast('Target Price 1 must be a valid positive number if entered.', 'error'); }
            if (targetPrice !== null && targetPrice <= entryPrice && direction === 'BUY') { return showToast('Target Price 1 must be greater than Entry Price for a BUY.', 'error'); }

            // *** VALIDATE NEW FIELD ***
            const targetPrice2 = targetPrice2Str ? parseFloat(targetPrice2Str) : null;
            if (targetPrice2 !== null && (isNaN(targetPrice2) || targetPrice2 <= 0)) { return showToast('Target Price 2 must be a valid positive number if entered.', 'error'); }
            // Ensure T2 > T1 if both are set
            if (targetPrice !== null && targetPrice2 !== null && targetPrice2 <= targetPrice) { return showToast('Target Price 2 must be greater than Target Price 1.', 'error'); }
            // Ensure T2 > Entry if T1 is not set but T2 is
            if (targetPrice === null && targetPrice2 !== null && targetPrice2 <= entryPrice && direction === 'BUY') { return showToast('Target Price 2 must be greater than Entry Price for a BUY.', 'error'); }

            const stopLossPrice = stopLossPriceStr ? parseFloat(stopLossPriceStr) : null;
            if (stopLossPrice !== null && (isNaN(stopLossPrice) || stopLossPrice <= 0)) { return showToast('Stop Loss Price must be a valid positive number if entered.', 'error'); }
            if (stopLossPrice !== null && stopLossPrice >= entryPrice && direction === 'BUY') { return showToast('Stop Loss Price must be less than Entry Price for a BUY.', 'error'); }


            const entryData = {
                account_holder_id: accountHolderId,
                entry_date: entryDate, ticker: ticker, exchange: exchange, direction: direction, quantity: quantity, entry_price: entryPrice,
                target_price: targetPrice,
                target_price_2: targetPrice2, // *** ADD NEW FIELD TO DATA ***
                stop_loss_price: stopLossPrice,
                advice_source_id: (/** @type {HTMLSelectElement} */(document.getElementById('journal-advice-source'))).value || null,
                advice_source_details: (/** @type {HTMLInputElement} */(document.getElementById('journal-advice-details'))).value.trim() || null,
                entry_reason: (/** @type {HTMLInputElement} */(document.getElementById('journal-entry-reason'))).value.trim() || null,
                notes: (/** @type {HTMLTextAreaElement} */(document.getElementById('journal-notes'))).value.trim() || null,
            };

            addButton.disabled = true;
            try {
                // NOTE: addJournalEntry API call needs backend update to save target_price_2
                await addJournalEntry(entryData);
                showToast('Journal entry added!', 'success');
                addJournalEntryForm.reset();
                 const entryDateInput = /** @type {HTMLInputElement} */ (document.getElementById('journal-entry-date'));
                 if (entryDateInput) entryDateInput.valueAsDate = new Date(); // Reset date to today
                await loadJournalPage(); // Reload journal data and re-render
                 // Switch back to 'Open Ideas' tab after adding
                 const journalSubTabsContainer = journalPageContainer?.querySelector('.journal-sub-tabs');
                 const openTabButton = journalSubTabsContainer?.querySelector('[data-sub-tab="journal-open-panel"]');
                 if (openTabButton instanceof HTMLElement) openTabButton.click();
            } catch (error) {
                showToast(`Error adding entry: ${error.message}`, 'error');
            } finally {
                addButton.disabled = false;
            }
        });
    }

    // ... (Table Sorting and Action Button logic remain the same) ...
     // --- ADDED: Table Header Sorting Logic ---
    const addSortListener = (tableElement) => {
        if (!tableElement) return;
        const thead = tableElement.querySelector('thead');
        if (thead) {
            thead.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                const th = /** @type {HTMLTableCellElement} */ (target.closest('th[data-sort]'));
                if (th) {
                    const tbody = /** @type {HTMLTableSectionElement} */ (tableElement.querySelector('tbody'));
                    if (tbody) {
                        sortTableByColumn(th, tbody);
                    }
                }
            });
        }
    };
    addSortListener(openTable); // Add listener to the open table
    addSortListener(closedTable); // Add listener to the closed table
    // --- END ADDED ---


    // --- Table Actions (using event delegation on the parent container) ---
    if (journalPageContainer) {
        journalPageContainer.addEventListener('click', async (e) => {
             // Action button logic (delete, edit, execute, close) remains the same...
             const target = /** @type {HTMLElement} */ (e.target);
             const button = /** @type {HTMLButtonElement | null} */ (target.closest('button[data-id]'));
             if (!button) return;
             const journalId = button.dataset.id;
             if (!journalId) return;

             if (button.classList.contains('journal-delete-btn')) {
                showConfirmationModal('Delete Journal Entry?', 'This cannot be undone.', async () => {
                    try { await deleteJournalEntry(journalId); showToast('Journal entry deleted.', 'success'); await loadJournalPage(); }
                    catch (error) { showToast(`Error deleting entry: ${error.message}`, 'error'); }
                });
             }
             else if (button.classList.contains('journal-edit-btn')) { showToast(`Edit functionality for entry ID ${journalId} not yet implemented.`, 'info'); }
             else if (button.classList.contains('journal-execute-btn')) {
                 const entry = state.journalEntries?.openEntries.find(e => String(e.id) === journalId);
                 if (!entry) { return showToast('Could not find journal entry data.', 'error'); }
                 if (entry.direction !== 'BUY') { return showToast('Currently, only BUY ideas can be executed directly.', 'info'); }
                 if (state.selectedAccountHolderId === 'all') { return showToast('Please select a specific account holder before executing.', 'error'); }
                 showConfirmationModal(`Execute BUY for ${entry.ticker}?`, `This will create a real transaction record for ${formatQuantity(entry.quantity)} shares at the *current market price* (fetching now) and mark this journal entry as EXECUTED.`, async () => {
                     try {
                          await updatePricesForView(getCurrentESTDateString(), [entry.ticker]);
                          const currentPriceData = state.priceCache.get(entry.ticker);
                          const executionPrice = (currentPriceData && typeof currentPriceData.price === 'number') ? currentPriceData.price : null;
                          if (executionPrice === null || isNaN(executionPrice) || executionPrice <= 0) { throw new Error(`Could not fetch a valid current price for ${entry.ticker} to execute.`); }
                          const executionData = { execution_date: getCurrentESTDateString(), execution_price: executionPrice, account_holder_id: state.selectedAccountHolderId };
                          const result = await executeJournalEntry(journalId, executionData);
                          showToast(`Executed BUY for ${entry.ticker} at ${formatAccounting(executionPrice)}. Tx ID: ${result.transactionId}`, 'success', 10000);
                          await loadJournalPage(); await refreshLedger();
                     } catch (error) { showToast(`Error executing entry: ${error.message}`, 'error', 10000); }
                 });
             }
             else if (button.classList.contains('journal-close-btn')) {
                 const entry = state.journalEntries?.openEntries.find(e => String(e.id) === journalId);
                 if (!entry) { return showToast('Could not find journal entry data.', 'error'); }
                 const currentPriceGuess = (state.priceCache.get(entry.ticker)?.price) || entry.entry_price;
                 const exitPriceStr = prompt(`Enter the exit price to manually close the ${entry.ticker} trade:`, String(currentPriceGuess));
                 const exitPrice = parseFloat(exitPriceStr);
                 if (exitPriceStr === null) return;
                 if (isNaN(exitPrice) || exitPrice <= 0) { return showToast('Invalid exit price entered.', 'error'); }
                 showConfirmationModal(`Manually Close ${entry.ticker} Trade?`, `This will mark the trade as CLOSED with an exit price of ${formatAccounting(exitPrice)} on today's date.`, async () => {
                     const updateData = { status: 'CLOSED', exit_date: getCurrentESTDateString(), exit_price: exitPrice };
                     try { await updateJournalEntry(journalId, updateData); showToast('Journal entry closed manually.', 'success'); await loadJournalPage(); }
                     catch (error) { showToast(`Error closing entry: ${error.message}`, 'error'); }
                 });
             }
        });
    }
}