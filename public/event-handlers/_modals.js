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
// --- MODIFIED: Import the correct handler name ---
import { initializeSubscriptionPanelHandlers } from './_modal_manage_subscriptions.js';
// --- ADDED: Static imports to resolve TS/linting errors ---
import { saveSettings } from '../ui/settings.js';
import { showToast } from '../ui/helpers.js';

/**
 * --- MODIFIED: Helper function to save settings on modal close ---
 * Now async and awaits the async saveSettings() function.
 * @returns {Promise<void>}
 */
async function saveSettingsOnClose() {
    try {
        // Use the statically imported functions
        // saveSettings() will show its own toast on success
        await saveSettings();
    } catch (err) {
        console.error("Error saving settings on close:", err);
        // showToast(`Error saving settings: ${err.message}`, 'error'); // Error already shown by saveSettings
    }
}

/**
 * --- NEW: Helper function to clear source details modal ---
 * @param {HTMLElement} modal
 * @returns {void}
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
    
    // Top-right 'X' button
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', async (e) => { // Made async
            const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
            if (modal) {
                
                if (modal.id === 'settings-modal') {
                    try {
                        await saveSettingsOnClose(); // Added await
                    } catch (saveError) {
                        console.log("[Modal Close] saveSettings failed, preventing modal close.");
                        return; // Do not close modal if save fails
                    }
                }
                clearSourceDetailsModal(/** @type {HTMLElement} */ (modal));
                
                if (modal.id === 'image-zoom-modal') {
                    const zoomImage = document.getElementById('zoomed-image-content');
                    if (zoomImage) (/** @type {HTMLImageElement} */ (zoomImage)).src = '';
                }
                
                modal.classList.remove('visible');
            }
        })
    );
    
    // Bottom 'Close' or 'Cancel' buttons
     document.querySelectorAll('.modal .cancel-btn, .modal .close-modal-btn').forEach(btn =>
        btn.addEventListener('click', e => {
             const modal = (/** @type {HTMLElement} */ (e.target)).closest('.modal');
             if (modal) {
                // --- FIX: Don't close modal if this is an inline cancel button ---
                if (btn.classList.contains('cancel-holder-btn') || btn.classList.contains('cancel-exchange-btn')) {
                    return;
                }
                // --- END FIX ---
                 
                clearSourceDetailsModal(/** @type {HTMLElement} */ (modal));
                modal.classList.remove('visible');
             }
        })
    );
    
    // Background click
    document.querySelectorAll('.modal').forEach(modal => {
         modal.addEventListener('click', async (e) => { // Made async
            if (e.target === modal) {
                
                if (modal.id === 'settings-modal') {
                     try {
                        await saveSettingsOnClose(); // Added await
                    } catch (saveError) {
                        console.log("[Modal Close] saveSettings failed, preventing modal close.");
                        return; // Do not close modal if save fails
                    }
                }
                clearSourceDetailsModal(/** @type {HTMLElement} */ (modal));

                if (modal.id === 'image-zoom-modal') {
                    const zoomImage = document.getElementById('zoomed-image-content');
                    if (zoomImage) (/** @type {HTMLImageElement} */ (zoomImage)).src = '';
                }
                
                modal.classList.remove('visible');
            }
        });
    });

    // --- ADDED: Global Escape Key Handler (Task UX.4) ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Find all visible modals
            const visibleModals = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.modal.visible'));
            if (visibleModals.length === 0) return; // No modals open

            // Find the top-most modal
            let topModal = visibleModals[0];
            let maxZ = parseInt(window.getComputedStyle(topModal).zIndex || '0', 10);

            visibleModals.forEach(modal => {
                const z = parseInt(window.getComputedStyle(modal).zIndex || '0', 10);
                if (z > maxZ) {
                    topModal = modal;
                    maxZ = z;
                }
            });

            // Trigger its close button
            const closeButton = /** @type {HTMLElement | null} */ (topModal.querySelector('.close-button'));
            if (closeButton) {
                closeButton.click(); // This will trigger the async saveSettingsOnClose if it's the settings modal
            } else {
                // Fallback if no 'X' button (shouldn't happen)
                topModal.classList.remove('visible');
            }
        }
    });
    // --- END ADDED ---

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

    // --- MODIFIED: Call correct function name ---
    try {
        initializeSubscriptionPanelHandlers(); 
    } catch (e) { console.error("Error initializing ManageSubscriptionsModalHandler:", e); }
    // --- END MODIFIED ---

} // End of initializeModalHandlers function