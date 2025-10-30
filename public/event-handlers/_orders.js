// /public/event-handlers/_orders.js
/**
 * @file Initializes all event handlers for the Orders page.
 * @module event-handlers/_orders
 */

import { state, updateState } from '../state.js';
import { fetchPendingOrders } from '../api.js';
import { showToast } from '../ui/helpers.js';
import { renderOpenOrders } from '../ui/renderers/_orders.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

// --- REFACFOR: Import new handler functions ---
import { initializeOrdersFormHandlers } from './_orders_form.js';
import { initializeOrdersTableHandlers } from './_orders_table.js';
import { initializeOrdersModalHandlers } from './_orders_modals.js';
// --- END REFACTOR ---

/**
 * Loads data for the orders page and triggers rendering.
 * Also handles pre-filling the "Log Executed Trade" form if state dictates.
 */
export async function loadOrdersPage() {
    console.log("[loadOrdersPage] Starting...");
    console.log("[loadOrdersPage] Accessing state inside function:", state ? 'Exists' : 'MISSING!');

    const tableBody = document.querySelector('#pending-orders-table tbody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7">Loading open orders...</td></tr>';

    // --- MODIFICATION: Wrap prefill logic in setTimeout ---
    setTimeout(() => {
        console.log("[loadOrdersPage - Delayed] Checking for prefill state:", state.prefillOrderFromSource);

        const adviceSourceSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('add-tx-advice-source'));
        const adviceSourceMsg = /** @type {HTMLElement | null} */(document.getElementById('add-tx-source-lock-msg'));
        const tickerInput = /** @type {HTMLInputElement | null} */(document.getElementById('ticker'));
        const priceInput = /** @type {HTMLInputElement | null} */(document.getElementById('price'));
        const accountSelect = /** @type {HTMLSelectElement | null} */(document.getElementById('add-tx-account-holder'));
        const dateInput = /** @type {HTMLInputElement | null} */(document.getElementById('transaction-date'));

        console.log("[loadOrdersPage - Delayed] Form elements found:", {
            adviceSourceSelect: !!adviceSourceSelect, // Should now be true
            adviceSourceMsg: !!adviceSourceMsg,     // Should now be true
            tickerInput: !!tickerInput,
            priceInput: !!priceInput,
            accountSelect: !!accountSelect,
            dateInput: !!dateInput
        });

        if (state.prefillOrderFromSource && adviceSourceSelect && adviceSourceMsg && tickerInput && priceInput && accountSelect && dateInput) {
            console.log("[loadOrdersPage - Delayed] Applying prefill data...");
            const { sourceId, sourceName, ticker, price } = state.prefillOrderFromSource;

            tickerInput.value = ticker;
            console.log(`[loadOrdersPage - Delayed] Set tickerInput.value to: ${tickerInput.value}`);
            priceInput.value = price;
            console.log(`[loadOrdersPage - Delayed] Set priceInput.value to: ${priceInput.value}`);
            adviceSourceSelect.value = sourceId;
            console.log(`[loadOrdersPage - Delayed] Set adviceSourceSelect.value to: ${adviceSourceSelect.value} (target was ${sourceId})`);
            accountSelect.value = String(state.selectedAccountHolderId);
            console.log(`[loadOrdersPage - Delayed] Set accountSelect.value to: ${accountSelect.value} (target was ${state.selectedAccountHolderId})`);
            dateInput.value = getCurrentESTDateString();
            console.log(`[loadOrdersPage - Delayed] Set dateInput.value to: ${dateInput.value}`);

            adviceSourceSelect.disabled = true;
            adviceSourceMsg.textContent = `Source locked: ${sourceName}`;
            adviceSourceMsg.style.display = 'block';
            console.log("[loadOrdersPage - Delayed] Locked source select and showed message.");
            priceInput.dispatchEvent(new Event('change'));
            console.log("[loadOrdersPage - Delayed] Dispatched 'change' event on priceInput.");
            document.getElementById('quantity')?.focus();
            console.log("[loadOrdersPage - Delayed] Focused quantity input.");

        } else if (adviceSourceSelect && adviceSourceMsg) {
            console.log("[loadOrdersPage - Delayed] No prefill state, ensuring form defaults.");
            adviceSourceSelect.disabled = false;
            adviceSourceSelect.value = '';
            adviceSourceMsg.style.display = 'none';
            if (dateInput) {
                dateInput.value = getCurrentESTDateString();
                 console.log("[loadOrdersPage - Delayed] Set default dateInput.value to: " + dateInput.value);
            }
        } else {
             console.warn("[loadOrdersPage - Delayed] Could not apply prefill/defaults because some form elements were missing.");
        }
    }, 0); // Use setTimeout with 0 delay to push execution to the end of the current event loop cycle
    // --- END MODIFICATION ---

    try {
        const holderId = (state.selectedAccountHolderId === 'all' || !state.selectedAccountHolderId)
            ? 'all'
            : String(state.selectedAccountHolderId);

        console.log(`[loadOrdersPage] Fetching orders for holder: ${holderId}`);

        if (holderId === 'all') {
             console.warn("[loadOrdersPage] 'All Accounts' selected, will not fetch pending orders.");
             renderOpenOrders([]);
             console.log("[loadOrdersPage] Finished (All Accounts).");
             return;
        }
        const orders = await fetchPendingOrders(holderId);
        console.log("[loadOrdersPage] Fetched orders:", orders);
        renderOpenOrders(orders);
        console.log("[loadOrdersPage] Finished successfully.");

    } catch (error) {
        console.error("[loadOrdersPage] Error during execution:", error);
        const err = /** @type {Error} */ (error);
        showToast(`Error loading orders page: ${err.message}`, 'error');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7">Error loading open orders.</td></tr>';
        }
        console.log("[loadOrdersPage] Finished with error.");
    }
}

/**
 * Initializes all event listeners for the Orders page.
 * @returns {void}
 */
export function initializeOrdersHandlers() {
    try {
        initializeOrdersFormHandlers();
        initializeOrdersTableHandlers();
        initializeOrdersModalHandlers();
    } catch (error) {
        console.error("[Orders Init] CRITICAL ERROR during initialization:", error);
    }
}