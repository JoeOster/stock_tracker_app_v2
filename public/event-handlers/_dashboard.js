// public/event-handlers/_dashboard.js
/**
 * @file Initializes event handlers for the Dashboard page.
 * @module event-handlers/_dashboard
 */

import { state } from '../state.js';
import { renderDashboardPage } from '../ui/renderers/_dashboard.js';
// ADDED: Import sortTableByColumn
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js'; // Needed for Sell/Edit modals
// Add fetchSalesForLot to existing api import
import { fetchSalesForLot, updateAllPrices } from '../api.js';
// Add formatQuantity to existing formatters import
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
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
    // Ensure account holder ID is a string for comparison
    editAccountHolderSelect.value = String(lotData.account_holder_id);
    editDateInput.value = lotData.purchase_date; // Use purchase_date from lot data
    editTickerInput.value = lotData.ticker;
    editExchangeSelect.value = lotData.exchange;
    editTypeSelect.value = 'BUY'; // Edit modal only handles BUY lots from dashboard
    // Use original_quantity for editing the initial buy record
    editQuantityInput.value = String(lotData.original_quantity ?? lotData.quantity_remaining); // Fallback if original_quantity isn't present
    editPriceInput.value = String(lotData.cost_basis); // Use cost_basis
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

    // --- Disable fields that shouldn't change when editing from Dashboard ---
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
    const positionTable = document.getElementById('open-positions-table'); // Use table ID for delegation

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
        await updateAllPrices();
        await renderDashboardPage();
    });

    // --- Action Buttons (Event Delegation on Card Grid and Table Body) ---
const handleActionClick = async (e) => { // <<< Make async
        const target = /** @type {HTMLElement} */ (e.target);

        // Find the relevant button using closest()
        const sellBtn = target.closest('.sell-from-lot-btn');
        const limitBtn = target.closest('.set-limit-btn');
        const editBtn = target.closest('.edit-buy-btn');
        const historyBtn = target.closest('.sales-history-btn'); // <<< ADDED

        // Modals
        const sellModal = document.getElementById('sell-from-position-modal');
        const editModal = document.getElementById('edit-modal');
        const salesHistoryModal = document.getElementById('sales-history-modal'); // <<< ADDED

        // --- Sell Button Logic ---
        if (sellBtn && sellModal) {
            const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
            // Find lot data directly from state.dashboardOpenLots
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === buyId);
            if (!lotData) { return showToast('Error: Could not find original lot data.', 'error'); }

            const sellParentBuyIdInput = /** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'));
            const sellAccountHolderIdInput = /** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'));
            const sellTickerDisplay = document.getElementById('sell-ticker-display');
            const sellExchangeDisplay = document.getElementById('sell-exchange-display');
            const sellQuantityInput = /** @type {HTMLInputElement} */ (document.getElementById('sell-quantity'));
            const sellDateInput = /** @type {HTMLInputElement} */(document.getElementById('sell-date'));

             if (!sellParentBuyIdInput || !sellAccountHolderIdInput || !sellTickerDisplay || !sellExchangeDisplay || !sellQuantityInput || !sellDateInput) {
               console.error("[Dashboard Event] One or more elements missing inside sell modal.");
               showToast("UI Error: Cannot display sell details.", "error");
               return;
             }

            sellParentBuyIdInput.value = buyId;
            sellAccountHolderIdInput.value = String(lotData.account_holder_id);
            sellTickerDisplay.textContent = ticker;
            sellExchangeDisplay.textContent = exchange;
            sellQuantityInput.value = quantity; // Use remaining quantity from button dataset
            sellQuantityInput.max = quantity;
            sellDateInput.value = getCurrentESTDateString();

            sellModal.classList.add('visible');
        }
        // --- Limits Button Logic ---
        else if (limitBtn && editModal) {
            const lotId = limitBtn.dataset.id;
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === lotId);
            populateEditModal(lotData, true); // True for limitsOnly
        }
        // --- Edit Button Logic ---
        else if (editBtn && editModal) {
            const lotId = editBtn.dataset.id;
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === lotId);
            populateEditModal(lotData, false); // False for full edit
        }
        // --- Sales History Button Logic --- <<< ADDED BLOCK
        else if (historyBtn && salesHistoryModal) {
            const buyId = historyBtn.dataset.id; // <<< Make sure button has data-id="${lot.id}"
            if (!buyId) return;

            // Find the original BUY lot data from the state
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === buyId);
            if (!lotData) {
                showToast('Could not find original purchase details.', 'error');
                return;
            }
             if (state.selectedAccountHolderId === 'all') {
                showToast('Please select a specific account holder to view history.', 'error');
                return;
            }

            // Populate static lot details in the modal
            document.getElementById('sales-history-title').textContent = `Sales History for ${lotData.ticker} Lot`;
            document.getElementById('sales-history-ticker').textContent = lotData.ticker;
            document.getElementById('sales-history-buy-date').textContent = lotData.purchase_date;
            document.getElementById('sales-history-buy-qty').textContent = formatQuantity(lotData.original_quantity ?? lotData.quantity); // Use original if available
            document.getElementById('sales-history-buy-price').textContent = formatAccounting(lotData.cost_basis);

            const salesBody = document.getElementById('sales-history-body');
            salesBody.innerHTML = '<tr><td colspan="4">Loading sales history...</td></tr>';
            salesHistoryModal.classList.add('visible');

            try {
                // Fetch the sales data
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
    };

    // Attach listener to both potential containers
    cardGrid?.addEventListener('click', handleActionClick);
    positionTable?.querySelector('tbody')?.addEventListener('click', handleActionClick); // Delegate on tbody for actions

    // --- ADDED: Table Header Sorting (Event Delegation on Table Header) ---
    const thead = positionTable?.querySelector('thead');
    if (thead) {
        thead.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const th = /** @type {HTMLTableCellElement} */ (target.closest('th[data-sort]'));
            if (th) {
                const tbody = /** @type {HTMLTableSectionElement} */ (document.getElementById('open-positions-tbody')); // Get specific tbody
                if (tbody) {
                    sortTableByColumn(th, tbody);
                }
            }
        });
    }
    // --- END ADDED ---

    // --- Reconciliation Checkbox Logic (Placeholder) ---
    positionTable?.addEventListener('change', (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        if (target.classList.contains('reconciliation-checkbox')) {
            const lotId = target.closest('tr')?.dataset.lotId;
            console.log(`Checkbox for lot ID ${lotId} changed: ${target.checked}`);
            // Add reconciliation tracking logic here if needed
        }
    });

}