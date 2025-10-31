// /public/event-handlers/_research_sources_actions_journal.js
/**
 * @file Contains action handlers for the Journal (Techniques) panel in the Source Details modal.
 * @module event-handlers/_research_sources_actions_journal
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { addJournalEntry } from '../api/journal-api.js';

/**
 * --- NEW FUNCTION ---
 * Initializes the submit handler for the new "Add Technique" modal.
 * @param {function(): Promise<void>} refreshDetailsCallback - Function to refresh the details view on success.
 * @returns {void}
 */
export function initializeAddTechniqueModalHandler(refreshDetailsCallback) {
    const addTechniqueModal = document.getElementById('add-technique-modal');
    const addTechniqueForm = /** @type {HTMLFormElement} */ (document.getElementById('add-technique-form'));

    if (addTechniqueForm && addTechniqueModal) {
        addTechniqueForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const addButton = /** @type {HTMLButtonElement} */ (document.getElementById('add-technique-submit-btn'));
            const holderId = state.selectedAccountHolderId;

            // Get context from hidden field
            const formSourceId = (/** @type {HTMLInputElement} */(document.getElementById('technique-form-source-id'))).value;

            // Get form values
            const entryDate = new Date().toLocaleDateString('en-CA'); // Get current date automatically
            const ticker = 'N/A'; // Set placeholder ticker
            const entryReason = (/** @type {HTMLInputElement} */(document.getElementById('technique-form-entry-reason'))).value.trim();
            const chartType = (/** @type {HTMLInputElement} */(document.getElementById('technique-form-chart-type'))).value.trim();
            const imagePath = (/** @type {HTMLInputElement} */(document.getElementById('technique-form-image-path'))).value.trim();
            const notes = (/** @type {HTMLTextAreaElement} */(document.getElementById('technique-form-notes'))).value.trim();

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
                image_path: imagePath || null,
                status: 'OPEN',
                linked_document_urls: []
            };

            addButton.disabled = true;
            try {
                await addJournalEntry(entryData);
                showToast('New technique added!', 'success');
                addTechniqueForm.reset();
                addTechniqueModal.classList.remove('visible');
                
                // Refresh the underlying source details modal
                await refreshDetailsCallback();
            } catch (error) {
                console.error('Failed to add journal entry (technique):', error);
                const err = /** @type {Error} */ (error);
                showToast(`Error: ${err.message}`, 'error');
            } finally {
                addButton.disabled = false;
            }
        });
    }
}


/**
 * --- NEW FUNCTION ---
 * Handles click on "Add Technique" button from the main Source profile (Book/etc).
 * Pre-fills and shows the new "Add Technique" modal.
 * @param {HTMLElement} target - The button element that was clicked.
 * @returns {Promise<void>}
 */
export async function handleOpenAddTechniqueModal(target) {
    const { sourceId, sourceName } = target.dataset;

    if (!sourceId || !sourceName) {
        return showToast('Error: Missing data from source button.', 'error');
    }

    // Find the new "Add Technique" modal
    const addTechniqueModal = document.getElementById('add-technique-modal');
    const addTechniqueForm = /** @type {HTMLFormElement} */ (document.getElementById('add-technique-form'));
    
    if (!addTechniqueModal || !addTechniqueForm) {
        return showToast('UI Error: Could not find the "Add Technique" modal.', 'error');
    }

    // Reset form
    addTechniqueForm.reset();

    // Set new context (linking to the source)
    (/** @type {HTMLInputElement} */(document.getElementById('technique-form-source-id'))).value = sourceId;
    
    // Set the link display text
    const linkDisplaySpan = document.querySelector('#technique-form-link-display span');
    if (linkDisplaySpan) {
        linkDisplaySpan.textContent = `Source: "${sourceName}"`;
    }
    
    // Show the modal
    addTechniqueModal.classList.add('visible');
    
    // Focus the first input
    (/** @type {HTMLInputElement} */(document.getElementById('technique-form-entry-reason'))).focus();
}

/**
 * @deprecated This function is no longer used as the form has been moved to a separate modal.
 */
export async function handleAddTechniqueSubmit(e, refreshDetailsCallback) {
    console.warn("DEPRECATED: handleAddTechniqueSubmit was called. Logic has moved to initializeAddTechniqueModalHandler.");
}