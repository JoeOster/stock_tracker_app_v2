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
    
    // --- Generic Modal Closing Listeners ---
    
    // Top-right 'X' button
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        // --- MODIFIED: Made the event listener async ---
        btn.addEventListener('click', async (e) => {
            const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
            if (modal) {
                
                if (modal.id === 'settings-modal') {
                    // --- MODIFIED: Await the save function ---
                    await saveSettingsOnClose();
                }
                clearSourceDetailsModal(modal);
                // --- END MODIFICATION ---
                
                modal.classList.remove('visible'); // <-- This will now run
            }
        })
    );
    
    // Bottom 'Close' or 'Cancel' buttons (often have .cancel-btn)
     document.querySelectorAll('.modal .cancel-btn, .modal .close-modal-btn').forEach(btn => // Added .close-modal-btn
        btn.addEventListener('click', e => {
             const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
             if (modal) {
                // Do NOT save settings if 'Cancel' is clicked in the settings modal
                clearSourceDetailsModal(modal);
                modal.classList.remove('visible');
             }
        })
    );
    
    // Background click
    document.querySelectorAll('.modal').forEach(modal => {
         // --- MODIFIED: Made the event listener async ---
         modal.addEventListener('click', async (e) => {
            // Close if clicking on the background overlay
            if (e.target === modal) {
                
                if (modal.id === 'settings-modal') {
                    // --- MODIFIED: Await the save function ---
                    await saveSettingsOnClose();
                }
                clearSourceDetailsModal(modal);
                // --- END MODIFICATION ---
                
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

} // End of initializeModalHandlers function