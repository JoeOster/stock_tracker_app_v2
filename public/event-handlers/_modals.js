// public/event-handlers/_modals.js
/**
 * @file Initializes all event listeners related to modal dialogs.
 * @module event-handlers/_modals
 */

// Import the new, specialized modal handlers
import { initializeSelectiveSellModalHandler } from './_modal_selective_sell.js';
import { initializeSellFromPositionModalHandler } from './_modal_sell_from_position.js';
import { initializeEditTransactionModalHandler } from './_modal_edit_transaction.js';

/**
 * Initializes all event listeners for modal dialogs.
 * This function handles generic "close" events and delegates
 * form-specific logic to imported initializers.
 * @returns {void}
 */
export function initializeModalHandlers() {
    
    // --- Generic Modal Closing Listeners ---
    
    // Top-right 'X' button
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', e => {
            const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
            if (modal) {
                modal.classList.remove('visible');
                // Clear content of source details modal when closed via 'X'
                if (modal.id === 'source-details-modal') {
                    const contentArea = modal.querySelector('#source-details-modal-content');
                    if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
                    const titleArea = modal.querySelector('#source-details-modal-title');
                     if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
                }
            }
        })
    );
    
    // Bottom 'Close' or 'Cancel' buttons (often have .cancel-btn)
     document.querySelectorAll('.modal .cancel-btn, .modal .close-modal-btn').forEach(btn => // Added .close-modal-btn
        btn.addEventListener('click', e => {
             const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
             if (modal) {
                 modal.classList.remove('visible');
                 // Clear content of source details modal when closed via bottom button
                if (modal.id === 'source-details-modal') {
                    const contentArea = modal.querySelector('#source-details-modal-content');
                    if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
                    const titleArea = modal.querySelector('#source-details-modal-title');
                     if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
                }
             }
        })
    );
    
    // Background click
    document.querySelectorAll('.modal').forEach(modal => {
         modal.addEventListener('click', e => {
            // Close if clicking on the background overlay
            if (e.target === modal) {
                modal.classList.remove('visible');
                 // Clear content of source details modal when closed via background click
                if (modal.id === 'source-details-modal') {
                    const contentArea = modal.querySelector('#source-details-modal-content');
                    if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
                     const titleArea = modal.querySelector('#source-details-modal-title');
                     if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
                }
            }
        });
    });

    // --- Initialize Form-Specific Modal Handlers ---
    try {
        initializeSelectiveSellModalHandler();
    } catch (e) { console.error("Error initializing SelectiveSellModalHandler:", e); }

    try {
        initializeSellFromPositionModalHandler();
    } catch (e) { console.error("Error initializing SellFromPositionModalHandler:", e); }

    try {
        initializeEditTransactionModalHandler();
    } catch (e) { console.error("Error initializing EditTransactionModalHandler:", e); }

} // End of initializeModalHandlers function
