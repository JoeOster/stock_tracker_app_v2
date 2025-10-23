// public/event-handlers/_dashboard.js
/**
 * @file Initializes event handlers for the Dashboard page.
 * @module event-handlers/_dashboard
 */

import { state } from '../state.js';
import { renderDashboardPage } from '../ui/renderers/_dashboard.js';
// ADDED: Import sortTableByColumn
import { showToast, showConfirmationModal, sortTableByColumn } from '../ui/helpers.js';
import { updateAllPrices } from '../api.js'; // Use the generic price update function
import { getCurrentESTDateString } from '../ui/datetime.js'; // Needed for Sell/Edit modals

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
    const handleActionClick = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        // Find the relevant button using closest()
        const sellBtn = target.closest('.sell-from-lot-btn');
        const limitBtn = target.closest('.set-limit-btn');
        const editBtn = target.closest('.edit-buy-btn');

        // Modals
        const sellModal = document.getElementById('sell-from-position-modal');
        const editModal = document.getElementById('edit-modal');

        // --- Sell Button Logic ---
        if (sellBtn && sellModal) { /* ... (sell logic remains the same) ... */ }
        // --- Limits Button Logic ---
        else if (limitBtn && editModal) { /* ... (limits logic remains the same) ... */ }
        // --- Edit Button Logic ---
        else if (editBtn && editModal) { /* ... (edit logic remains the same) ... */ }
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