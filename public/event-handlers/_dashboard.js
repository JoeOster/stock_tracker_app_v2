import { fetchSalesForLot } from '../api/transactions-api.js';
import { updateAllPrices } from '../api/price-api.js';
import { fetchSalesForLot } from '../api/transactions-api.js';
import { updateAllPrices } from '../api/price-api.js';
// public/event-handlers/_dashboard.js
// Version Updated (Added Selective Sell Modal Trigger + Manage Lots redirect)
/**
 * @file Initializes event handlers for the Dashboard page.
 * @module event-handlers/_dashboard
 */

import { state } from '../state.js';
import { renderDashboardPage } from '../ui/renderers/_dashboard.js';
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
import { fetchSalesForLot, updateAllPrices } from '../api.js'; // Ensure fetchSalesForLot is imported
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
// Import switchView if needed for navigation actions (like the Manage Lots redirect)
import { switchView } from './_navigation.js';

/**
 * Helper function to populate the Edit/Limits modal with data from a specific lot.
 * @param {object | undefined} lotData - The data object for the selected open lot.
 * @param {boolean} [limitsOnly=false] - If true, only show the limit fields.
 */
function populateEditModal(lotData, limitsOnly = false) {
    const editModal = document.getElementById('edit-modal');
    if (!lotData || !editModal) {
        showToast('Could not find lot data or modal element.', 'error');
        return;
    }

    // --- Get all modal elements ---
    const editIdInput = /** @type {HTMLInputElement} */(document.getElementById('edit-id'));
    const editAccountHolderSelect = /** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'));
    const editDateInput = /** @type {HTMLInputElement} */(document.getElementById('edit-date'));
    const editTickerInput = /** @type {HTMLInputElement} */(document.getElementById('edit-ticker'));
    const editExchangeSelect = /** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'));
    const editTypeSelect = /** @type {HTMLSelectElement} */(document.getElementById('edit-type'));
    const editQuantityInput = /** @type {HTMLInputElement} */(document.getElementById('edit-quantity'));
    const editPriceInput = /** @type {HTMLInputElement} */(document.getElementById('edit-price'));
    const editLimitPriceUpInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'));
    const editLimitUpExpirationInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'));
    const editLimitPriceDownInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'));
    const editLimitDownExpirationInput = /** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'));
    const coreFields = /** @type {HTMLElement} */ (document.getElementById('edit-core-fields'));
    const limitFields = /** @type {HTMLElement} */ (document.getElementById('edit-limit-fields'));
    const modalTitle = document.getElementById('edit-modal-title');

    // --- Check if all elements exist ---
    if (!editIdInput || !editAccountHolderSelect || !editDateInput || !editTickerInput || !editExchangeSelect || !editTypeSelect || !editQuantityInput || !editPriceInput || !editLimitPriceUpInput || !editLimitUpExpirationInput || !editLimitPriceDownInput || !editLimitDownExpirationInput || !coreFields || !limitFields || !modalTitle) {
         console.error("[Dashboard Event] One or more elements missing inside edit modal.");
         showToast("UI Error: Cannot display edit/limit details.", "error");
         return;
    }

    // --- Populate fields ---
    editIdInput.value = String(lotData.id);
    editAccountHolderSelect.value = String(lotData.account_holder_id);
    editDateInput.value = lotData.purchase_date;
    editTickerInput.value = lotData.ticker;
    editExchangeSelect.value = lotData.exchange;
    editTypeSelect.value = 'BUY';
    editQuantityInput.value = String(lotData.original_quantity ?? lotData.quantity_remaining);
    editPriceInput.value = String(lotData.cost_basis);
    editLimitPriceUpInput.value = String(lotData.limit_price_up || '');
    editLimitUpExpirationInput.value = lotData.limit_up_expiration || '';
    editLimitPriceDownInput.value = String(lotData.limit_price_down || '');
    editLimitDownExpirationInput.value = lotData.limit_down_expiration || '';

    // --- Show/Hide sections ---
    if (limitsOnly) {
        modalTitle.textContent = `Set Limits for ${lotData.ticker}`;
        coreFields.style.display = 'none';
        limitFields.style.display = 'block';
    } else {
        modalTitle.textContent = 'Edit Buy Transaction';
        coreFields.style.display = 'block';
        limitFields.style.display = 'none';
    }

    // --- Disable fields ---
    editTickerInput.readOnly = true;
    editTypeSelect.disabled = true;

    editModal.classList.add('visible');
}

/**
 * Loads data for the dashboard page (which triggers the renderer).
 */
export async function loadDashboardPage() {
    await renderDashboardPage();
}

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
    // This is the complete function with the added logic for .view-lots-management-btn
    const handleActionClick = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        // Find the relevant button using closest()
        const sellBtn = target.closest('.sell-from-lot-btn'); // Individual Lot Sell (Single Lot Card or Table Row)
        const selectiveSellBtn = target.closest('.selective-sell-btn'); // Aggregated Card Sell
        const limitBtn = target.closest('.set-limit-btn'); // Single Lot Card or Table Row
        const editBtn = target.closest('.edit-buy-btn'); // Single Lot Card or Table Row
        const historyBtn = target.closest('.sales-history-btn'); // Single Lot Card or Table Row History
        const manageLotsBtn = target.closest('.view-lots-management-btn'); // Aggregated Card Manage Lots/History

        // Modals
        const sellModal = document.getElementById('sell-from-position-modal');
        const selectiveSellModal = document.getElementById('selective-sell-modal');
        const editModal = document.getElementById('edit-modal');
        const salesHistoryModal = document.getElementById('sales-history-modal');

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
            const { ticker, exchange, totalQuantity, lots: encodedLots } = selectiveSellBtn.dataset;
            if (!ticker || !exchange || !totalQuantity || !encodedLots) {
                showToast('Error: Missing data for selective sell.', 'error');
                return;
            }
             if (state.selectedAccountHolderId === 'all') {
                showToast('Please select a specific account holder before selling.', 'error');
                return;
            }

            let underlyingLots = [];
            try {
                underlyingLots = JSON.parse(decodeURIComponent(encodedLots));
            } catch (err) {
                console.error("Error decoding lots for selective sell:", err);
                showToast('Error: Could not load lot details for selling.', 'error');
                return;
            }

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
        // --- MODIFIED: Manage Lots Button Logic (Aggregated Card) ---
        else if (manageLotsBtn && salesHistoryModal) { // Reuse sales history modal for now
            const button = manageLotsBtn; // Already have the button from closest()
            const { ticker, exchange, lots: encodedLots } = button.dataset;
            if (!ticker || !exchange || !encodedLots) {
                showToast('Error: Missing data for lot management view.', 'error');
                return;
            }
            if (state.selectedAccountHolderId === 'all') {
                showToast('Please select a specific account holder to manage lots.', 'error');
                return;
            }

            let underlyingLots = [];
            try {
                underlyingLots = JSON.parse(decodeURIComponent(encodedLots));
                if (underlyingLots.length === 0) throw new Error("No underlying lot data found.");
            } catch (err) {
                console.error("Error decoding lots for management view:", err);
                showToast('Error: Could not load lot details for management.', 'error');
                return;
            }

            // --- Populate using the FIRST lot for header details ---
            const firstLot = underlyingLots[0];
            document.getElementById('sales-history-title').textContent = `Manage Lots for ${ticker} (${exchange})`; // Change title
            document.getElementById('sales-history-ticker').textContent = ticker;
            document.getElementById('sales-history-buy-date').textContent = firstLot.purchase_date; // Using first lot's date
            document.getElementById('sales-history-buy-qty').textContent = formatQuantity(firstLot.original_quantity ?? firstLot.quantity); // Using first lot's original qty
            document.getElementById('sales-history-buy-price').textContent = formatAccounting(firstLot.cost_basis); // Using first lot's basis

            const salesBody = document.getElementById('sales-history-body');
            salesBody.innerHTML = '<tr><td colspan="4">Loading combined sales history...</td></tr>'; // Indicate loading combined history
            salesHistoryModal.classList.add('visible'); // Make visible BEFORE fetch

            // --- Fetch COMBINED Sales History (Requires Backend Change Later) ---
            try {
                const allSales = [];
                // Ideally, replace this loop with a single batch API call in the future
                for (const lot of underlyingLots) {
                    const sales = await fetchSalesForLot(lot.id, state.selectedAccountHolderId);
                    allSales.push(...sales);
                }
                // Sort combined sales by date
                allSales.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

                if (allSales.length === 0) {
                    salesBody.innerHTML = '<tr><td colspan="4">No sales recorded for any of these lots.</td></tr>';
                } else {
                    salesBody.innerHTML = allSales.map(sale => `
                        <tr>
                            <td>${sale.transaction_date}</td>
                            <td class="numeric">${formatQuantity(sale.quantity)}</td>
                            <td class="numeric">${formatAccounting(sale.price)}</td>
                            <td class="numeric ${sale.realizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(sale.realizedPL)}</td>
                        </tr>
                    `).join('');
                     // Placeholder message indicating future enhancements
                     salesBody.insertAdjacentHTML('beforebegin', '<tr><td colspan="4" style="font-weight:bold; background-color: var(--info-panel-bg);">Combined Sales History (Management options coming soon)</td></tr>');
                }
                 // TODO: Add sections/buttons here later for managing individual lots from underlyingLots
                 // Example: Iterate underlyingLots and add rows/buttons to a separate section in the modal.

            } catch (error) {
                showToast(`Error fetching combined sales history: ${error.message}`, 'error');
                salesBody.innerHTML = '<tr><td colspan="4">Error loading sales history.</td></tr>';
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

