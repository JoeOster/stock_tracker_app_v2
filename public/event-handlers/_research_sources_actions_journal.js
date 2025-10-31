// /public/event-handlers/_research_sources_actions_journal.js
/**
 * @file Contains action handlers for the Journal (Techniques) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_journal
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { addJournalEntry } from '../api/journal-api.js';

/**
 * Handles submission of the "Add Technique" (Journal Entry) form.
 * @param {Event} e - The form submission event.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {Promise<void>}
 */
export async function handleAddTechniqueSubmit(e, refreshDetailsCallback) {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.target.closest('form'));
    if (!form) return;
    const addButton = /** @type {HTMLButtonElement | null} */ (form.querySelector('.add-technique-button'));
    if (!addButton) return;

    const holderId = state.selectedAccountHolderId;
    const formSourceId = form.dataset.sourceId;

    // Get form values
    const entryDate = (/** @type {HTMLInputElement} */(form.querySelector('.tech-entry-date-input'))).value;
    const ticker = (/** @type {HTMLInputElement} */(form.querySelector('.tech-ticker-input'))).value.toUpperCase().trim();
    const entryReason = (/** @type {HTMLInputElement} */(form.querySelector('.tech-entry-reason-input'))).value.trim();
    const quantityStr = (/** @type {HTMLInputElement} */(form.querySelector('.tech-quantity-input'))).value;
    const entryPriceStr = (/** @type {HTMLInputElement} */(form.querySelector('.tech-entry-price-input'))).value;
    const targetPriceStr = (/** @type {HTMLInputElement} */(form.querySelector('.tech-tp1-input'))).value;
    const stopLossPriceStr = (/** @type {HTMLInputElement} */(form.querySelector('.tech-sl-input'))).value;
    const notes = (/** @type {HTMLTextAreaElement} */(form.querySelector('.tech-notes-input'))).value.trim();

    // --- Validation ---
    if (holderId === 'all' || !formSourceId) { return showToast('Error: Account or Source ID is missing.', 'error'); }
    if (!entryDate || !ticker || !entryReason || !quantityStr || !entryPriceStr) {
        return showToast('Date, Ticker, Technique/Reason, Quantity, and Entry Price are required.', 'error');
    }
    const quantity = parseFloat(quantityStr);
    const entryPrice = parseFloat(entryPriceStr);
    if (isNaN(quantity) || quantity <= 0) { return showToast('Quantity must be a valid positive number.', 'error'); }
    if (isNaN(entryPrice) || entryPrice <= 0) { return showToast('Entry Price must be a valid positive number.', 'error'); }

    const targetPrice = targetPriceStr ? parseFloat(targetPriceStr) : null;
    const stopLossPrice = stopLossPriceStr ? parseFloat(stopLossPriceStr) : null;
    if (targetPrice !== null && (isNaN(targetPrice) || targetPrice <= entryPrice)) { return showToast('Target Price must be greater than Entry Price.', 'error'); }
    if (stopLossPrice !== null && (isNaN(stopLossPrice) || stopLossPrice >= entryPrice)) { return showToast('Stop Loss must be less than Entry Price.', 'error'); }

    const entryData = {
        account_holder_id: holderId,
        advice_source_id: formSourceId,
        entry_date: entryDate,
        ticker: ticker,
        exchange: 'Paper', // Default for techniques
        direction: 'BUY',   // Default for techniques
        quantity: quantity,
        entry_price: entryPrice,
        target_price: targetPrice,
        target_price_2: null, // Not in this form
        stop_loss_price: stopLossPrice,
        entry_reason: entryReason,
        notes: notes || null,
        status: 'OPEN',
        linked_document_urls: []
    };

    addButton.disabled = true;
    try {
        await addJournalEntry(entryData);
        showToast('New technique added!', 'success');
        form.reset();
        // Reset date
        const dateInput = /** @type {HTMLInputElement} */(form.querySelector('.tech-entry-date-input'));
        if (dateInput) dateInput.value = new Date().toLocaleDateString('en-CA');
        
        // --- THIS IS THE FIX ---
        // Call the callback function passed in, instead of re-importing the modal
        await refreshDetailsCallback();
        // --- END FIX ---
    } catch (error) {
        console.error('Failed to add journal entry (technique):', error);
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        addButton.disabled = false;
    }
}