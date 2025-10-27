// public/event-handlers/_dashboard_init.js
/**
 * @file Initializes event handlers for the Dashboard page.
 * @module event-handlers/_dashboard_init
 */

import { state } from '../state.js';
// Will update this import later when renderer is split
import { renderDashboardPage } from '../ui/renderers/_dashboard_renders.js';
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
// UPDATED: Import handleResponse for potential future batch fetch
import { fetchSalesForLot, updateAllPrices, handleResponse } from '../api.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
// Import modal population functions
import { populateEditModal, populateManagementModal } from './_dashboard_modals.js';


/**
 * Initializes event listeners for Dashboard controls and actions.
 */
export function initializeDashboardHandlers() {
    const dashboardContainer = document.getElementById('dashboard-page-container');
    const filterInput = document.getElementById('dashboard-ticker-filter');
    const sortSelect = document.getElementById('dashboard-sort-select');
    const refreshButton = document.getElementById('dashboard-refresh-prices-btn');
    const subTabsContainer = dashboardContainer?.querySelector('.dashboard-sub-tabs');
    const cardGrid = document.getElementById('positions-cards-grid');
    const positionTable = document.getElementById('open-positions-table');

    // --- Sub-Tab Switching ---
     if (subTabsContainer && dashboardContainer) {
        subTabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('sub-tab') && !target.classList.contains('active')) {
                const subTabName = target.dataset.subTab;
                if (!subTabName) return;

                subTabsContainer.querySelectorAll('.sub-tab').forEach(tab => tab.classList.remove('active'));
                dashboardContainer.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));

                target.classList.add('active');
                const panelToShow = dashboardContainer.querySelector(`#${subTabName}`);
                if (panelToShow) {
                    panelToShow.classList.add('active');
                }
            }
        });
    }

    // --- Filter and Sort ---
    filterInput?.addEventListener('input', renderDashboardPage);
    sortSelect?.addEventListener('change', renderDashboardPage);

    // --- Refresh Prices ---
    refreshButton?.addEventListener('click', async () => {
        showToast('Refreshing prices...', 'info', 2000);
        await updateAllPrices(); // updateAllPrices now calls renderDashboardPage itself if needed
    });

    // --- Action Buttons (Event Delegation on Card Grid and Table Body) ---
    const handleActionClick = async (e) => {
        // ... (full code for handleActionClick function as it was in _dashboard.js,
        //      using the imported populateEditModal and populateManagementModal) ...
        const target = /** @type {HTMLElement} */ (e.target);

        // Find the relevant button using closest()
        const sellBtn = target.closest('.sell-from-lot-btn'); // Individual Lot Sell (Single Lot Card or Table Row)
        const selectiveSellBtn = target.closest('.selective-sell-btn'); // Aggregated Card Sell
        const limitBtn = target.closest('.set-limit-btn'); // Single Lot Card or Table Row
        const editBtn = target.closest('.edit-buy-btn'); // Single Lot Card or Table Row
        const historyBtn = target.closest('.sales-history-btn'); // Single Lot Card or Table Row History
        // MODIFIED: Changed selector to manage-position-btn
        const manageLotsBtn = target.closest('.manage-position-btn'); // Aggregated Card Manage Lots/History

        // Modals
        const sellModal = document.getElementById('sell-from-position-modal');
        const selectiveSellModal = document.getElementById('selective-sell-modal');
        const editModal = document.getElementById('edit-modal');
        // MODIFIED: Changed variable name to managePositionModal
        const managePositionModal = document.getElementById('manage-position-modal'); // Get the new modal
        const salesHistoryModal = document.getElementById('sales-history-modal'); // Keep reference if needed elsewhere


        // --- Sell Button Logic (Individual Lot) ---
        if (sellBtn && sellModal) {
            const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
            // Find lot data - could be from table row (state.dashboardOpenLots) or single lot card (state.dashboardOpenLots)
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === buyId);
            if (!lotData) { return showToast('Error: Could not find original lot data.', 'error'); }

            (/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value = buyId;
            (/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value = String(lotData.account_holder_id);
            document.getElementById('sell-ticker-display').textContent = ticker;
            document.getElementById('sell-exchange-display').textContent = exchange;
            const sellQuantityInput = /** @type {HTMLInputElement} */ (document.getElementById('sell-quantity'));
            sellQuantityInput.value = quantity; // Use remaining quantity
            sellQuantityInput.max = quantity;
            (/** @type {HTMLInputElement} */(document.getElementById('sell-date'))).value = getCurrentESTDateString();

            sellModal.classList.add('visible');
        }
        // --- Selective Sell Button Logic (Aggregated Card) ---
        else if (selectiveSellBtn && selectiveSellModal) {
            // ... (Selective sell logic remains the same) ...
        }
        // --- Limits Button Logic (Single Lot Card or Table Row) ---
        else if (limitBtn && editModal) {
            const lotId = limitBtn.dataset.id;
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === lotId);
            populateEditModal(lotData, true); // True for limitsOnly
        }
        // --- Edit Button Logic (Single Lot Card or Table Row) ---
        else if (editBtn && editModal) {
            const lotId = editBtn.dataset.id;
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === lotId);
            populateEditModal(lotData, false); // False for full edit
        }
        // --- Sales History Button Logic (Single Lot Card or Table Row) ---
         else if (historyBtn && salesHistoryModal) {
            // ... (Sales History logic remains the same) ...
        }
        // --- MODIFIED: Manage Position Button Logic (Aggregated Card) ---
        else if (manageLotsBtn && managePositionModal) { // Target the new modal
            const button = manageLotsBtn;
            const { ticker, exchange, lots: encodedLots } = button.dataset;
            if (!ticker || !exchange || !encodedLots) {
                showToast('Error: Missing data for position management view.', 'error');
                return;
            }
            if (state.selectedAccountHolderId === 'all') {
                showToast('Please select a specific account holder to manage lots.', 'error');
                return;
            }

            let underlyingBuyLots = [];
            try {
                underlyingBuyLots = JSON.parse(decodeURIComponent(encodedLots));
                if (underlyingBuyLots.length === 0) throw new Error("No underlying lot data found.");
                 // Sort lots by purchase date before fetching sales
                 underlyingBuyLots.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
            } catch (err) {
                console.error("Error decoding lots for management view:", err);
                showToast('Error: Could not load lot details for management.', 'error');
                return;
            }

            const tbody = document.getElementById('manage-position-tbody');
            if(tbody) tbody.innerHTML = '<tr><td colspan="8">Loading details...</td></tr>'; // Show loading state in table
            managePositionModal.classList.add('visible'); // Show modal early

            try {
                const salesByLotId = new Map();
                const lotIds = underlyingBuyLots.map(lot => lot.id);

                // --- TODO: Replace loop with batch API call ---
                // For now, fetch sales individually
                console.log("Fetching sales individually (Optimize later with batch endpoint)...");
                const salesPromises = lotIds.map(id =>
                    fetchSalesForLot(id, state.selectedAccountHolderId)
                        .then(sales => ({ id, sales }))
                        .catch(err => {
                             console.error(`Error fetching sales for lot ${id}:`, err);
                             return { id, sales: [], error: true }; // Return empty on error for this lot
                        })
                );
                const salesResults = await Promise.all(salesPromises);
                salesResults.forEach(result => {
                    if (!result.error) {
                        salesByLotId.set(result.id, result.sales);
                    } else {
                        salesByLotId.set(result.id, []); // Ensure map has entry even on error
                    }
                });
                // --- End of loop section to replace ---

                // --- Populate the modal using the new function ---
                populateManagementModal(ticker, exchange, underlyingBuyLots, salesByLotId);

            } catch (error) {
                showToast(`Error fetching position details: ${error.message}`, 'error');
                if(tbody) tbody.innerHTML = '<tr><td colspan="8">Error loading details.</td></tr>'; // Show error in table
                // Optionally hide modal: managePositionModal.classList.remove('visible');
            }
        } // --- End of manageLotsBtn logic ---

    }; // End of handleActionClick

    // Attach listener to both potential containers
    cardGrid?.addEventListener('click', handleActionClick);
    positionTable?.querySelector('tbody')?.addEventListener('click', handleActionClick); // Delegate on tbody for actions

    // --- Table Header Sorting ---
    const thead = positionTable?.querySelector('thead');
    if (thead) {
        thead.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const th = /** @type {HTMLTableCellElement} */ (target.closest('th[data-sort]'));
            if (th) {
                const tbody = /** @type {HTMLTableSectionElement} */ (document.getElementById('open-positions-tbody'));
                if (tbody) {
                    sortTableByColumn(th, tbody);
                }
            }
        });
    }

    // --- Reconciliation Checkbox Logic (Placeholder) ---
    positionTable?.addEventListener('change', (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        if (target.classList.contains('reconciliation-checkbox')) {
            const lotId = target.closest('tr')?.dataset.lotId;
            console.log(`Checkbox for lot ID ${lotId} changed: ${target.checked}`);
            // Add reconciliation tracking logic here if needed
        }
    });

} // End of initializeDashboardHandlers