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
    const entryDate = new Date().toLocaleDateString('en-CA'); // Get current date automatically
    const ticker = 'N/A'; // Set placeholder ticker
    const entryReason = (/** @type {HTMLInputElement} */(form.querySelector('.tech-entry-reason-input'))).value.trim();
    
    const chartType = (/** @type {HTMLInputElement} */(form.querySelector('.tech-chart-type-input'))).value.trim();
    const imagePath = (/** @type {HTMLInputElement} */(form.querySelector('.tech-image-path-input'))).value.trim(); // --- ADDED ---
    const notes = (/** @type {HTMLTextAreaElement} */(form.querySelector('.tech-notes-input'))).value.trim();

    // --- Validation ---
    if (holderId === 'all' || !formSourceId) { return showToast('Error: Account or Source ID is missing.', 'error'); }
    if (!entryReason) {
        return showToast('Description is required.', 'error');
    }
    
    // --- SET Default Values ---
    const quantity = 0;
    const entryPrice = 0;
    const targetPrice = null;
    const stopLossPrice = null;
    
    // Combine Chart Type and Notes
    const combinedNotes = chartType ? `Chart Type: ${chartType}\n\n${notes}` : (notes || null);

    const entryData = {
        account_holder_id: holderId,
        advice_source_id: formSourceId,
        entry_date: entryDate,
        ticker: ticker,
        exchange: 'Paper', // Default for techniques
        direction: 'BUY',   // Default for techniques
        quantity: quantity, // Use default
        entry_price: entryPrice, // Use default
        target_price: targetPrice, // Use default
        target_price_2: null, // Not in this form
        stop_loss_price: stopLossPrice, // Use default
        entry_reason: entryReason,
        notes: combinedNotes, // Use combined notes
        image_path: imagePath || null, // --- ADDED ---
        status: 'OPEN',
        linked_document_urls: []
    };

    addButton.disabled = true;
    try {
        await addJournalEntry(entryData);
        showToast('New technique added!', 'success');
        form.reset();
        
        await refreshDetailsCallback();
    } catch (error) {
        console.error('Failed to add journal entry (technique):', error);
        const err = /** @type {Error} */ (error);
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        addButton.disabled = false;
    }
}