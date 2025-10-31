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
 * --- NEW: Helper function to save settings on modal close ---
 * Dynamically imports and runs the saveSettings function.
 */
function saveSettingsOnClose() {
    try {
        // Dynamically import and run saveSettings
        import('../ui/settings.js').then(settingsModule => {
            settingsModule.saveSettings();
            // Dynamically import and run showToast
            import('../ui/helpers.js').then(helpersModule => {
                helpersModule.showToast('Settings saved!', 'success');
            });
        });
    } catch (err) {
        console.error("Error saving settings on close:", err);
        import('../ui/helpers.js').then(helpersModule => {
            helpersModule.showToast('Error saving settings.', 'error');
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
        btn.addEventListener('click', e => {
            const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
            if (modal) {
                // --- MODIFIED: Handle modal-specific close actions ---
                if (modal.id === 'settings-modal') {
                    saveSettingsOnClose();
                }
                clearSourceDetailsModal(modal);
                // --- END MODIFICATION ---
                
                modal.classList.remove('visible');
            }
        })
    );
    
    // Bottom 'Close' or 'Cancel' buttons (often have .cancel-btn)
     document.querySelectorAll('.modal .cancel-btn, .modal .close-modal-btn').forEach(btn => // Added .close-modal-btn
        btn.addEventListener('click', e => {
             const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
             if (modal) {
                // --- MODIFIED: Handle modal-specific close actions ---
                // Do NOT save settings if 'Cancel' is clicked in the settings modal
                clearSourceDetailsModal(modal);
                // --- END MODIFICATION ---

                 modal.classList.remove('visible');
             }
        })
    );
    
    // Background click
    document.querySelectorAll('.modal').forEach(modal => {
         modal.addEventListener('click', e => {
            // Close if clicking on the background overlay
            if (e.target === modal) {
                // --- MODIFIED: Handle modal-specific close actions ---
                if (modal.id === 'settings-modal') {
                    saveSettingsOnClose();
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