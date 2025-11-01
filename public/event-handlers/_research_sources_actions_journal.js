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
