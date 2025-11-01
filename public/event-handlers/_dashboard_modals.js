// public/event-handlers/_dashboard_modals.js
/**
 * @file Event handlers for Dashboard modal actions.
 * @module event-handlers/_dashboard_modals
 */

import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { fetchTransactionById, deleteTransaction } from '../api/transactions-api.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { populateEditModal } from './_modal_edit_transaction.js';
import { populateSellFromPositionModal } from './_modal_sell_from_position.js';
import { populateSelectiveSellModal } from './_modal_selective_sell.js';
// --- ADDED: Import the new modal populator ---
import { populateManagementModal } from './_modal_manage_position.js';

/**
 * Handles all delegated click events on the dashboard for modal actions.
 * @param {Event} e - The click event.
 * @returns {Promise<void>}
 */
async function handleActionClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const holderId = state.selectedAccountHolderId;

    if (holderId === 'all') {
        showToast('Please select a specific account holder to manage positions.', 'error');
        return;
    }

    // --- Action: Edit Transaction (from Table View) ---
    const editBtn = target.closest('.edit-transaction-btn');
    if (editBtn) {
        const transactionId = (/** @type {HTMLElement} */ (editBtn)).dataset.id;
        if (!transactionId) return;
        
        try {
            const transaction = await fetchTransactionById(transactionId, holderId);
            await populateAllAdviceSourceDropdowns(); // Ensure dropdowns are ready
            populateEditModal(transaction); // Pass the fetched data
        } catch (error) {
            console.error('Error fetching transaction for edit:', error);
            // @ts-ignore
            showToast(`Error: ${error.message}`, 'error');
        }
        return; // Stop further processing
    }

    // --- Action: Delete Transaction (from Table View) ---
    const deleteBtn = target.closest('.delete-transaction-btn');
    if (deleteBtn) {
        const transactionId = (/** @type {HTMLElement} */ (deleteBtn)).dataset.id;
        if (!transactionId) return;

        showConfirmationModal('Delete Transaction?', 'Are you sure you want to delete this BUY transaction? All associated SELL records will also be deleted. This cannot be undone.', async () => {
            try {
                const result = await deleteTransaction(transactionId, holderId);
                showToast(result.message, 'success');
                // Trigger a full dashboard refresh
                document.dispatchEvent(new CustomEvent('refreshDashboard'));
            } catch (error) {
                console.error('Error deleting transaction:', error);
                // @ts-ignore
                showToast(`Error: ${error.message}`, 'error');
            }
        });
        return; // Stop further processing
    }

    // --- Action: Open "Sell" Modal (from Card View) ---
    const sellBtn = target.closest('.sell-position-btn');
    if (sellBtn) {
        const card = /** @type {HTMLElement} */ (sellBtn.closest('.dashboard-card[data-transaction-id]'));
        if (!card) return;
        
        const transactionId = card.dataset.transactionId;
        const ticker = card.dataset.ticker;
        // @ts-ignore - 'positions' is a valid property on the state
        const lot = state.positions.find(p => String(p.id) === transactionId);
        
        if (lot && ticker) {
            populateSellFromPositionModal(lot);
        } else {
            showToast('Error: Could not find position data to sell.', 'error');
        }
        return; // Stop further processing
    }

    // --- Action: Open "Selective Sell" Modal (from Card View) ---
    const selectiveSellBtn = target.closest('.selective-sell-btn');
    if (selectiveSellBtn) {
        const card = /** @type {HTMLElement} */ (selectiveSellBtn.closest('.dashboard-card[data-ticker]'));
        if (!card) return;

        const ticker = card.dataset.ticker;
        const lotIds = card.dataset.lotIds; // This is a string: "1,5,10"
        
        if (ticker && lotIds) {
            // Find all matching lot objects from the state
            const lotIdArray = lotIds.split(',').map(id => parseInt(id, 10));
            // @ts-ignore - 'positions' is a valid property on the state
            const lots = state.positions.filter(p => lotIdArray.includes(p.id));
            populateSelectiveSellModal(ticker, lots);
        } else {
            showToast('Error: Could not find position data for selective sell.', 'error');
        }
        return; // Stop further processing
    }

    // --- ADDED: Action: Open "Manage Position" Modal (from Card View) ---
    const manageBtn = target.closest('.manage-position-btn');
    if (manageBtn) {
        console.log("Manage button clicked");
        const card = /** @type {HTMLElement} */ (manageBtn.closest('.dashboard-card[data-ticker]'));
        if (!card) return;

        const ticker = card.dataset.ticker;
        const exchange = card.dataset.exchange;
        const lotIds = card.dataset.lotIds; // String: "1,5,10"

        if (!ticker || !exchange || !lotIds) {
            return showToast('Error: Missing data on position card.', 'error');
        }

        const modal = document.getElementById('manage-position-modal');
        if (!modal) {
            return showToast('Error: Cannot find management modal.', 'error');
        }

        // Store data on the modal itself for the populator to use
        (/** @type {HTMLElement} */ (modal)).dataset.ticker = ticker;
        (/** @type {HTMLElement} */ (modal)).dataset.exchange = exchange;
        (/** @type {HTMLElement} */ (modal)).dataset.lotIds = lotIds;

        try {
            // Populate the modal with the lot data
            // We pass 'false' to skip fetching sales history for this chunk
            await populateManagementModal(false); 
            modal.classList.add('visible');
        } catch (error) {
            console.error("Error populating manage position modal:", error);
            // @ts-ignore
            showToast(`Error: ${error.message}`, 'error');
        }
        return; // Stop further processing
    }
    // --- END ADDED ---
}

/**
 * Initializes the main click listener for the dashboard's modal actions.
 * @param {HTMLElement} dashboardContainer - The main dashboard container element.
 */
export function initializeDashboardModalHandlers(dashboardContainer) {
    if (!dashboardContainer) {
        console.warn("Dashboard container not found, cannot initialize modal handlers.");
        return;
    }
    
    // Attach the single, powerful click handler
    dashboardContainer.addEventListener('click', handleActionClick);
    console.log("[Dashboard Modals] Main action click handler initialized.");
}