// public/event-handlers/_dashboard_init.js
/**
 * @file Initializes event handlers for the Dashboard page.
 * @module event-handlers/_dashboard_init
 */

import { state } from '../state.js';
// Import the main rendering orchestration function
import { renderDashboardPage } from '../ui/renderers/_dashboard_render.js';
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
// UPDATED: Import handleResponse for potential future batch fetch
import { fetchSalesForLot, updateAllPrices, handleResponse, fetchPositions } from '../api.js'; // Added fetchPositions
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
// Import modal population functions
import { populateEditModal, populateManagementModal } from './_dashboard_modals.js';


// --- NEW Reusable Function ---
/**
 * Fetches data and populates the Manage Position modal for a given position.
 * @param {string} ticker
 * @param {string} exchange
 * @param {string|number} accountHolderId
 */
async function openAndPopulateManageModal(ticker, exchange, accountHolderId) {
    const managePositionModal = document.getElementById('manage-position-modal');
    const tbody = document.getElementById('manage-position-tbody');

    if (!managePositionModal || !tbody) {
        showToast('Error: Cannot find Manage Position modal elements.', 'error');
        return;
    }
     if (!ticker || !exchange || !accountHolderId || accountHolderId === 'all') {
        showToast('Error: Missing required data (ticker, exchange, holder ID) to manage position.', 'error');
        return;
     }

    tbody.innerHTML = '<tr><td colspan="8">Refreshing details...</td></tr>'; // Show loading state
    managePositionModal.classList.add('visible'); // Ensure modal is visible

    try {
        // 1. Fetch all open lots for THIS specific ticker/exchange/holder again
        // Note: fetchPositions gets *all* lots for the day; we need to filter
        const today = getCurrentESTDateString(); // Assume we always manage based on 'today'
        const positionData = await fetchPositions(today, String(accountHolderId));
        const relevantBuyLots = (positionData?.endOfDayPositions || []).filter(
            lot => lot.ticker === ticker && lot.exchange === exchange
        );
        relevantBuyLots.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date)); // Sort

        if (relevantBuyLots.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No open lots found for this position.</td></tr>';
            // Update summary too if needed
            return; // Exit if no lots found (position might have been fully sold)
        }

        // 2. Fetch sales for these specific lots
        const salesByLotId = new Map();
        const lotIds = relevantBuyLots.map(lot => lot.id);

        // --- TODO: Replace loop with batch API call when available ---
        console.log("Fetching sales individually for refresh (Optimize later)...");
        const salesPromises = lotIds.map(id =>
            fetchSalesForLot(id, accountHolderId)
                .then(sales => ({ id, sales }))
                .catch(err => {
                     console.error(`Error fetching sales for lot ${id}:`, err);
                     return { id, sales: [], error: true };
                })
        );
        const salesResults = await Promise.all(salesPromises);
        salesResults.forEach(result => {
            salesByLotId.set(result.id, result.sales || []); // Ensure map has entry
        });
        // --- End of loop section ---

        // 3. Re-populate the modal
        populateManagementModal(ticker, exchange, relevantBuyLots, salesByLotId);

    } catch (error) {
        showToast(`Error refreshing position details: ${error.message}`, 'error');
        if(tbody) tbody.innerHTML = '<tr><td colspan="8">Error loading details.</td></tr>';
    }
}
// --- END NEW Reusable Function ---


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
            console.log("Sell button clicked (individual lot)"); // Debug log
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
            console.log("Selective Sell button clicked (aggregated)"); // Debug log
            const { ticker, exchange, totalQuantity, lots: encodedLots } = selectiveSellBtn.dataset;
            if (!ticker || !exchange || !totalQuantity || !encodedLots) { /* ... error handling ... */ return; }
            if (state.selectedAccountHolderId === 'all') { /* ... error handling ... */ return; }

            let underlyingLots = [];
            try {
                underlyingLots = JSON.parse(decodeURIComponent(encodedLots));
            } catch (err) { /* ... error handling ... */ return; }

            // --- Populate Modal ---
            document.getElementById('selective-sell-title').textContent = `Sell ${ticker} (${exchange})`;
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-ticker'))).value = ticker;
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-exchange'))).value = exchange;
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-account-holder-id'))).value = String(state.selectedAccountHolderId);
            document.getElementById('selective-sell-available-qty').textContent = formatQuantity(totalQuantity);
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-total-quantity'))).value = ''; // Clear previous total
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-total-quantity'))).max = totalQuantity; // Set max based on available
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-price'))).value = '';
            (/** @type {HTMLInputElement} */(document.getElementById('selective-sell-date'))).value = getCurrentESTDateString();
            document.getElementById('selective-sell-selected-total').textContent = '0'; // Reset selected total
            document.getElementById('selective-sell-validation-message').style.display = 'none'; // Hide validation

            // --- Populate Lots Table ---
            const lotsBody = document.getElementById('selective-sell-lots-body');
            lotsBody.innerHTML = ''; // Clear previous lots
            underlyingLots.forEach(lot => {
                const row = lotsBody.insertRow();
                row.dataset.lotId = lot.id; // Store lot ID
                row.innerHTML = `
                    <td>${lot.purchase_date}</td>
                    <td class="numeric">${formatAccounting(lot.cost_basis)}</td>
                    <td class="numeric">${formatQuantity(lot.quantity_remaining)}</td>
                    <td class="numeric">
                        <input type="number" class="selective-sell-lot-qty"
                               step="any" min="0" max="${lot.quantity_remaining}"
                               data-lot-id="${lot.id}" value="0"
                               style="width: 100px; text-align: right;">
                    </td>
                `;
            });

            // --- Add Input Listeners for Validation ---
            const totalQtyInput = /** @type {HTMLInputElement} */(document.getElementById('selective-sell-total-quantity'));
            const lotQtyInputs = /** @type {HTMLInputElement[]} */(Array.from(lotsBody.querySelectorAll('.selective-sell-lot-qty')));
            const selectedTotalSpan = document.getElementById('selective-sell-selected-total');
            const validationMessage = document.getElementById('selective-sell-validation-message');
            const submitButton = /** @type {HTMLButtonElement} */(document.getElementById('selective-sell-submit-btn'));

            const validateQuantities = () => {
                let selectedTotal = 0;
                lotQtyInputs.forEach(input => {
                    selectedTotal += parseFloat(input.value) || 0;
                });

                const targetTotal = parseFloat(totalQtyInput.value) || 0;
                selectedTotalSpan.textContent = formatQuantity(selectedTotal);

                // Basic validation: Check if total selected matches target total
                const totalsMatch = Math.abs(selectedTotal - targetTotal) < 0.00001 && targetTotal > 0;
                if (totalsMatch) {
                    validationMessage.style.display = 'none';
                    submitButton.disabled = false;
                } else {
                    if (targetTotal > 0) { // Only show message if a target is entered
                        validationMessage.style.display = 'block';
                    } else {
                        validationMessage.style.display = 'none';
                    }
                    submitButton.disabled = true;
                }
            };

            totalQtyInput.addEventListener('input', validateQuantities);
            lotQtyInputs.forEach(input => input.addEventListener('input', validateQuantities));

            validateQuantities(); // Initial validation check
            selectiveSellModal.classList.add('visible');
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
            const buyId = historyBtn.dataset.buyId; // Use data-buy-id
            if (!buyId) return;
            // Find lot data - could be from table row or single lot card
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === buyId);
            if (!lotData) { showToast('Could not find original purchase details.', 'error'); return; }
            if (state.selectedAccountHolderId === 'all') { showToast('Please select a specific account holder to view history.', 'error'); return; }

            // Populate static details
            document.getElementById('sales-history-title').textContent = `Sales History for ${lotData.ticker} Lot`; // Specific Lot Title
            document.getElementById('sales-history-ticker').textContent = lotData.ticker;
            document.getElementById('sales-history-buy-date').textContent = lotData.purchase_date;
            document.getElementById('sales-history-buy-qty').textContent = formatQuantity(lotData.original_quantity ?? lotData.quantity);
            document.getElementById('sales-history-buy-price').textContent = formatAccounting(lotData.cost_basis);

            const salesBody = document.getElementById('sales-history-body');
            salesBody.innerHTML = '<tr><td colspan="4">Loading sales history...</td></tr>';
            salesHistoryModal.classList.add('visible'); // Make visible BEFORE fetch

            try {
                // Fetch sales history for this SPECIFIC lot
                const sales = await fetchSalesForLot(buyId, state.selectedAccountHolderId);
                if (sales.length === 0) {
                    salesBody.innerHTML = '<tr><td colspan="4">No sales recorded for this lot.</td></tr>';
                } else {
                    salesBody.innerHTML = sales.map(sale => `
                        <tr>
                            <td>${sale.transaction_date}</td>
                            <td class="numeric">${formatQuantity(sale.quantity)}</td>
                            <td class="numeric">${formatAccounting(sale.price)}</td>
                            <td class="numeric ${sale.realizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(sale.realizedPL)}</td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                showToast(`Error fetching sales history: ${error.message}`, 'error');
                salesBody.innerHTML = '<tr><td colspan="4">Error loading sales history.</td></tr>';
            }
        }
        // --- UPDATED: Manage Position Button Logic ---
        else if (manageLotsBtn && managePositionModal) {
            const button = manageLotsBtn;
            const { ticker, exchange } = button.dataset; // Only need ticker/exchange now
             const accountHolderId = state.selectedAccountHolderId;

             if (!ticker || !exchange) {
                 showToast('Error: Missing data for position management view.', 'error');
                 return;
             }
             if (accountHolderId === 'all') {
                showToast('Please select a specific account holder to manage lots.', 'error');
                return;
            }

            // Call the reusable function to handle fetching and populating
            await openAndPopulateManageModal(ticker, exchange, accountHolderId);

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

// --- Export the function needed by _modals.js ---
export { openAndPopulateManageModal }; // Ensure this export exists