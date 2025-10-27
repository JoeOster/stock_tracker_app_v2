// public/event-handlers/_dashboard_modals.js
/**
 * @file Contains helper functions for populating dashboard-related modals.
 * @module event-handlers/_dashboard_modals
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';

/**
 * Populates the Edit/Limits modal with data from a specific lot.
 * @param {object | undefined} lotData - The data object for the selected open lot.
 * @param {boolean} [limitsOnly=false] - If true, only show the limit fields.
 */
export function populateEditModal(lotData, limitsOnly = false) {
    // ... (full code for populateEditModal function as it was in _dashboard.js) ...
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
    editDateInput.value = lotData.purchase_date; // Use purchase_date for BUY lots
    editTickerInput.value = lotData.ticker;
    editExchangeSelect.value = lotData.exchange;
    editTypeSelect.value = 'BUY'; // This modal is only for BUY transactions from dashboard
    // Use original_quantity if available (it should be on BUYs), otherwise fallback just in case
    editQuantityInput.value = String(lotData.original_quantity ?? lotData.quantity_remaining);
    editPriceInput.value = String(lotData.cost_basis); // Use cost_basis for BUY lots
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
        limitFields.style.display = 'none'; // Keep limits hidden when editing core details initially
    }

    // --- Disable fields that shouldn't be changed when editing from dashboard context ---
    editTickerInput.readOnly = true; // Cannot change ticker
    editTypeSelect.disabled = true; // Cannot change type from BUY
    // Consider if quantity/price should be editable if sales exist. For now, allow editing.
    // editQuantityInput.readOnly = (lotData.original_quantity !== lotData.quantity_remaining);
    // editPriceInput.readOnly = (lotData.original_quantity !== lotData.quantity_remaining);

    editModal.classList.add('visible');
}

/**
 * Populates the Manage Position modal with lot details and sales history.
 * @param {string} ticker - The ticker symbol.
 * @param {string} exchange - The exchange name.
 * @param {any[]} buyLots - Array of BUY lot objects for this position.
 * @param {Map<string | number, any[]>} salesByLotId - Map where keys are buyLot IDs and values are arrays of associated sales.
 */
export function populateManagementModal(ticker, exchange, buyLots, salesByLotId) {
    // ... (full code for populateManagementModal function as it was in _dashboard.js) ...
     const modal = document.getElementById('manage-position-modal');
    const titleEl = document.getElementById('manage-position-title');
    const tickerEl = document.getElementById('manage-position-ticker');
    const exchangeEl = document.getElementById('manage-position-exchange');
    const totalQtyEl = document.getElementById('manage-position-total-qty');
    const avgBasisEl = document.getElementById('manage-position-avg-basis');
    const currentValueEl = document.getElementById('manage-position-current-value');
    const overallPlEl = document.getElementById('manage-position-overall-pl');
    const tbody = document.getElementById('manage-position-tbody');

    if (!modal || !titleEl || !tickerEl || !exchangeEl || !totalQtyEl || !avgBasisEl || !currentValueEl || !overallPlEl || !tbody) {
        console.error("Manage Position Modal: Missing required elements.");
        showToast("UI Error: Cannot display position details.", "error");
        return;
    }

    // --- Calculate Summary ---
    let totalQuantityHeld = 0;
    let totalCostBasisValue = 0;
    let totalCurrentValue = 0;
    const priceData = state.priceCache.get(ticker);
    const currentPrice = (priceData && typeof priceData.price === 'number') ? priceData.price : null;

    buyLots.forEach(lot => {
        totalQuantityHeld += lot.quantity_remaining;
        totalCostBasisValue += lot.cost_basis * lot.quantity_remaining;
        if (currentPrice !== null) {
            totalCurrentValue += currentPrice * lot.quantity_remaining;
        } else {
            totalCurrentValue += lot.cost_basis * lot.quantity_remaining; // Fallback to cost basis
        }
    });

    const weightedAvgCostBasis = totalQuantityHeld > 0 ? totalCostBasisValue / totalQuantityHeld : 0;
    const overallUnrealizedPL = totalCurrentValue - totalCostBasisValue;
    const overallUnrealizedPercent = totalCostBasisValue !== 0 ? (overallUnrealizedPL / totalCostBasisValue) * 100 : 0;
    const plClass = overallUnrealizedPL >= 0 ? 'positive' : 'negative';

    // --- Populate Summary ---
    titleEl.textContent = `Manage Position: ${ticker}`;
    tickerEl.textContent = ticker;
    exchangeEl.textContent = exchange;
    totalQtyEl.textContent = formatQuantity(totalQuantityHeld);
    avgBasisEl.textContent = formatAccounting(weightedAvgCostBasis);
    currentValueEl.textContent = formatAccounting(totalCurrentValue);
    overallPlEl.innerHTML = `<span class="${plClass}">${formatAccounting(overallUnrealizedPL)} (${overallUnrealizedPercent.toFixed(2)}%)</span>`;


    // --- Populate Table ---
    tbody.innerHTML = ''; // Clear previous
    if (buyLots.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">No open lots found for this position.</td></tr>`;
        return;
    }

    buyLots.forEach(lot => {
        // --- Calculate Unrealized P/L for this lot ---
        let unrealizedPL = 0;
        let unrealizedPercent = 0;
        let unrealizedPLHtml = '--';
        if (currentPrice !== null && lot.quantity_remaining > 0) {
            const costOfRemaining = lot.cost_basis * lot.quantity_remaining;
            unrealizedPL = (currentPrice * lot.quantity_remaining) - costOfRemaining;
            unrealizedPercent = costOfRemaining !== 0 ? (unrealizedPL / costOfRemaining) * 100 : 0;
            const lotPlClass = unrealizedPL >= 0 ? 'positive' : 'negative';
            unrealizedPLHtml = `<span class="${lotPlClass}">${formatAccounting(unrealizedPL)} | ${unrealizedPercent.toFixed(2)}%</span>`;
        }

        // --- Create BUY Row ---
        const buyRow = tbody.insertRow();
        buyRow.classList.add('buy-lot-row'); // Add class for potential styling
        buyRow.dataset.lotId = lot.id;
        buyRow.innerHTML = `
            <td>${lot.purchase_date}</td>
            <td>BUY</td>
            <td class="numeric">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric">${formatQuantity(lot.original_quantity)}</td>
            <td class="numeric">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric">--</td>
            <td class="numeric">${unrealizedPLHtml}</td>
            <td class="center-align actions-cell">
                <button class="edit-buy-btn" data-id="${lot.id}" title="Edit this Buy Transaction">Edit</button>
                <button class="set-limit-btn" data-id="${lot.id}" title="Set Profit/Loss Limits">Limits</button>
                <button class="sell-from-lot-btn" data-buy-id="${lot.id}" data-ticker="${ticker}" data-exchange="${exchange}" data-quantity="${lot.quantity_remaining}" title="Sell from this Lot">Sell</button>
            </td>
        `;

        // --- Create SELL Rows for this Lot ---
        const sales = salesByLotId.get(lot.id) || [];
        sales.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date)); // Sort sales by date

        sales.forEach(sale => {
            const realizedPLPercent = lot.cost_basis !== 0 ? (sale.realizedPL / (lot.cost_basis * sale.quantity)) * 100 : 0;
            const salePlClass = sale.realizedPL >= 0 ? 'positive' : 'negative';
            const saleRow = tbody.insertRow();
            saleRow.classList.add('sell-row'); // Add class for potential styling
            saleRow.innerHTML = `
                <td>${sale.transaction_date}</td>
                <td>SELL</td>
                <td class="numeric">${formatAccounting(sale.price)}</td>
                <td class="numeric">${formatQuantity(sale.quantity)}</td>
                <td class="numeric">--</td>
                <td class="numeric"><span class="${salePlClass}">${formatAccounting(sale.realizedPL)} | ${realizedPLPercent.toFixed(2)}%</span></td>
                <td class="numeric">--</td>
                <td class="center-align actions-cell"></td>
            `;
        });
    });

    // --- Add Event Listeners (Delegation on tbody) ---
    // Remove previous listeners if any to prevent duplicates
    const oldTbody = document.getElementById('manage-position-tbody');
    // Check if oldTbody exists before attempting replacement
    if (oldTbody && oldTbody.parentNode) {
        const newTbody = oldTbody.cloneNode(true); // Clone to attach new listeners
        oldTbody.parentNode.replaceChild(newTbody, oldTbody);

        newTbody.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const editBtn = target.closest('.edit-buy-btn');
            const limitBtn = target.closest('.set-limit-btn');
            const sellBtn = target.closest('.sell-from-lot-btn');
            const sellModal = document.getElementById('sell-from-position-modal');
            const editModal = document.getElementById('edit-modal');


            const lotId = editBtn?.dataset.id || limitBtn?.dataset.id || sellBtn?.dataset.buyId;
            if (!lotId) return;

            // Find the full lot data from state (needed for modals)
            // Note: buyLots passed to populateManagementModal might not have all fields, get from state.dashboardOpenLots
            const lotData = state.dashboardOpenLots.find(lot => String(lot.id) === lotId);
            if (!lotData) {
                showToast('Error: Could not find original lot data in state.', 'error');
                return;
            }

            if (editBtn && editModal) {
                populateEditModal(lotData, false); // False for full edit
            } else if (limitBtn && editModal) {
                populateEditModal(lotData, true); // True for limits only
            } else if (sellBtn && sellModal) {
                 const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
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
        });
    } else if (!oldTbody) {
         console.error("Manage Position Modal: tbody element not found for attaching event listeners.");
    }


    modal.classList.add('visible'); // Show the modal
}