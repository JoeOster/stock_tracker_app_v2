// public/event-handlers/_modals.js
/**
 * @file Initializes all event listeners related to modal dialogs.
 * @module event-handlers/_modals
 */

import { initializeSelectiveSellModalHandler } from './_modal_selective_sell.js';
import { initializeSellFromPositionModalHandler } from './_modal_sell_from_position.js';
import { initializeEditTransactionModalHandler } from './_modal_edit_transaction.js';
import { initializeManagePositionModalHandler } from './_modal_manage_position.js';
import { initializeAddPaperTradeModalHandler } from './_modal_add_paper_trade.js';
// --- ADDED: Import the new subscription modal handler ---
import { initializeManageSubscriptionsModalHandler } from './_modal_manage_subscriptions.js';

// ... (saveSettingsOnClose and clearSourceDetailsModal functions remain the same) ...
/**
 * --- MODIFIED: Helper function to save settings on modal close ---
 * Dynamically imports and runs the saveSettings function.
 * Now async with proper error handling.
 */
async function saveSettingsOnClose() {
    try {
        // Dynamically import and run saveSettings
        const settingsModule = await import('../ui/settings.js');
        settingsModule.saveSettings();
        
        // Dynamically import and run showToast
        const helpersModule = await import('../ui/helpers.js');
        helpersModule.showToast('Settings saved!', 'success');
    } catch (err) {
        console.error("Error saving settings on close:", err);
        // Don't await this, just fire and forget
        import('../ui/helpers.js').then(helpersModule => {
            // @ts-ignore
            helpersModule.showToast(`Error saving settings: ${err.message}`, 'error');
        });
    }
}

/**
 * --- NEW: Helper function to clear source details modal ---
 * @param {HTMLElement} modal
 */
function clearSourceDetailsModal(modal) {
    if (modal.id === 'source-details-modal') {
        const contentArea = modal.querySelector('#source-details-modal-content');
        if (contentArea) contentArea.innerHTML = '<p><i>Loading details...</i></p>'; // Reset content
        const titleArea = modal.querySelector('#source-details-modal-title');
            if (titleArea) titleArea.textContent = 'Source Details: --'; // Reset title
    }
}


/**
 * Initializes all event listeners for modal dialogs.
 * This function handles generic "close" events and delegates
 * form-specific logic to imported initializers.
 * @returns {void}
 */
export function initializeModalHandlers() {
    
    // ... (Generic Modal Closing Listeners remain the same) ...
    // Top-right 'X' button
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', async (e) => {
            const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
            if (modal) {
                
                if (modal.id === 'settings-modal') {
                    await saveSettingsOnClose();
                }
                clearSourceDetailsModal(/** @type {HTMLElement} */ (modal));
                
                // --- ADDED: Clear zoomed chart if this is the one being closed ---
                if (modal.id === 'image-zoom-modal') {
                    const zoomImage = document.getElementById('zoomed-image-content');
                    if (zoomImage) (/** @type {HTMLImageElement} */ (zoomImage)).src = '';
                }
                // --- END ADDED ---
                
                modal.classList.remove('visible');
            }
        })
    );
    
    // Bottom 'Close' or 'Cancel' buttons
     document.querySelectorAll('.modal .cancel-btn, .modal .close-modal-btn').forEach(btn =>
        btn.addEventListener('click', e => {
             const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
             if (modal) {
                clearSourceDetailsModal(/** @type {HTMLElement} */ (modal));
                modal.classList.remove('visible');
             }
        })
    );
    
    // Background click
    document.querySelectorAll('.modal').forEach(modal => {
         modal.addEventListener('click', async (e) => {
            if (e.target === modal) {
                
                if (modal.id === 'settings-modal') {
                    await saveSettingsOnClose();
                }
                clearSourceDetailsModal(/** @type {HTMLElement} */ (modal));

                // --- ADDED: Clear zoomed chart if this is the one being closed ---
                if (modal.id === 'image-zoom-modal') {
                    const zoomImage = document.getElementById('zoomed-image-content');
                    if (zoomImage) (/** @type {HTMLImageElement} */ (zoomImage)).src = '';
                }
                // --- END ADDED ---
                
                modal.classList.remove('visible');
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

    try {
        initializeManagePositionModalHandler();
    } catch (e) { console.error("Error initializing ManagePositionModalHandler:", e); }

    try {
        initializeAddPaperTradeModalHandler();
    } catch (e) { console.error("Error initializing AddPaperTradeModalHandler:", e); }

    // --- ADDED: Initialize the new subscription modal handler ---
    try {
        initializeManageSubscriptionsModalHandler();
    } catch (e) { console.error("Error initializing ManageSubscriptionsModalHandler:", e); }
    // --- END ADDED ---

} // End of initializeModalHandlers function