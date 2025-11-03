import { fetchPendingOrders } from '../api/orders-api.js';
// /public/event-handlers/_orders.js
/**
 * @file Initializes all event handlers for the Orders page.
 * @module event-handlers/_orders
 */

import { state } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { renderOpenOrders } from '../ui/renderers/_orders.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

// --- REFACFOR: Import new handler functions ---
import { initializeOrdersFormHandlers } from './_orders_form.js';
import { initializeOrdersTableHandlers } from './_orders_table.js';
// --- *** THIS IS THE FIX *** ---
import { initializeOrdersModalHandlers } from './_orders_modals.js';
// --- *** END FIX *** ---
// --- END REFACTOR ---

/**
 * Loads data for the orders page and triggers rendering.
 * Also handles pre-filling the "Log Executed Trade" form if state dictates.
 */
export async function loadOrdersPage() {
  console.log('[loadOrdersPage] Starting...');
  console.log(
    '[loadOrdersPage] Accessing state inside function:',
    state ? 'Exists' : 'MISSING!'
  );

  const tableBody = document.querySelector('#pending-orders-table tbody');
  if (tableBody)
    tableBody.innerHTML =
      '<tr><td colspan="7">Loading open orders...</td></tr>';

  // --- MODIFICATION: Wrap prefill logic in setTimeout ---
  setTimeout(() => {
    console.log(
      '[loadOrdersPage - Delayed] Checking for prefill state:',
      state.prefillOrderFromSource
    );

    // --- MODIFICATION: Get new/updated form elements ---
    const adviceSourceSelectGroup = /** @type {HTMLElement | null} */ (
      document.getElementById('add-tx-advice-source-group')
    ); // The div containing the dropdown
    const adviceSourceLockedDisplay = /** @type {HTMLElement | null} */ (
      document.getElementById('add-tx-source-locked-display')
    ); // The new <p> tag
    const lockedSourceNameSpan = /** @type {HTMLElement | null} */ (
      document.getElementById('locked-source-name')
    ); // Span inside the new <p> tag
    const tickerInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('ticker')
    );
    const priceInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('price')
    );
    const accountSelect = /** @type {HTMLSelectElement | null} */ (
      document.getElementById('add-tx-account-holder')
    );
    const dateInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('transaction-date')
    );
    const adviceSourceSelect = /** @type {HTMLSelectElement | null} */ (
      document.getElementById('add-tx-advice-source')
    ); // Still need the select itself

    // --- *** ADDED: Get new hidden input *** ---
    const linkedJournalIdInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('add-tx-linked-journal-id')
    );
    // --- *** END ADDED *** ---

    // --- ADDED: Get Limit Inputs ---
    const limitUpInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('add-limit-price-up')
    );
    const limitUp2Input = /** @type {HTMLInputElement | null} */ (
      document.getElementById('add-limit-price-up-2')
    );
    const limitDownInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('add-limit-price-down')
    );
    // --- END ADDED ---

    console.log('[loadOrdersPage - Delayed] Form elements found:', {
      adviceSourceSelectGroup: !!adviceSourceSelectGroup,
      adviceSourceLockedDisplay: !!adviceSourceLockedDisplay,
      lockedSourceNameSpan: !!lockedSourceNameSpan,
      tickerInput: !!tickerInput,
      priceInput: !!priceInput,
      accountSelect: !!accountSelect,
      dateInput: !!dateInput,
      adviceSourceSelect: !!adviceSourceSelect,
      linkedJournalIdInput: !!linkedJournalIdInput, // --- ADDED ---
      limitUpInput: !!limitUpInput,
      limitUp2Input: !!limitUp2Input,
      limitDownInput: !!limitDownInput,
    });

    // --- Check for all necessary elements ---
    if (
      !adviceSourceSelectGroup ||
      !adviceSourceLockedDisplay ||
      !lockedSourceNameSpan ||
      !tickerInput ||
      !priceInput ||
      !accountSelect ||
      !dateInput ||
      !adviceSourceSelect ||
      !linkedJournalIdInput || // --- ADDED ---
      !limitUpInput ||
      !limitUp2Input ||
      !limitDownInput
    ) {
      console.warn(
        '[loadOrdersPage - Delayed] Could not apply prefill/defaults because some form elements were missing.'
      );
      // Ensure dropdown group is visible if locked display is missing
      if (adviceSourceSelectGroup) adviceSourceSelectGroup.style.display = '';
      if (adviceSourceLockedDisplay)
        adviceSourceLockedDisplay.style.display = 'none';
      return;
    }
    // --- END MODIFICATION ---

    if (state.prefillOrderFromSource) {
      console.log('[loadOrdersPage - Delayed] Applying prefill data...');
      // --- MODIFIED: Destructure new fields ---
      const { sourceId, sourceName, ticker, price, tp1, tp2, sl, journalId } =
        state.prefillOrderFromSource;

      // --- Populate values ---
      tickerInput.value = ticker;
      priceInput.value = price;

      // --- ADDED: Populate limit fields ---
      if (tp1) limitUpInput.value = tp1;
      if (tp2) limitUp2Input.value = tp2;
      if (sl) limitDownInput.value = sl;
      // --- END ADDED ---

      adviceSourceSelect.value = sourceId; // Set hidden dropdown value
      accountSelect.value = String(state.selectedAccountHolderId);
      dateInput.value = getCurrentESTDateString();

      // --- *** ADDED: Set the new hidden input *** ---
      linkedJournalIdInput.value = journalId || '';
      // --- *** END ADDED *** ---

      // --- Lock fields ---
      tickerInput.readOnly = true;
      priceInput.readOnly = false; // Price field remains editable
      accountSelect.disabled = true;

      // --- MODIFICATION: Adjust visibility ---
      adviceSourceSelectGroup.style.display = 'none'; // Hide dropdown group
      lockedSourceNameSpan.textContent = sourceName; // Set name in dedicated display
      adviceSourceLockedDisplay.style.display = 'block'; // Show dedicated display
      // --- END MODIFICATION ---

      // Dispatch change event to trigger limit suggestions (if priceInput isn't readOnly, but good to keep)
      priceInput.dispatchEvent(new Event('change'));

      document.getElementById('quantity')?.focus();
    } else {
      console.log(
        '[loadOrdersPage - Delayed] No prefill state, ensuring form defaults.'
      );

      // --- Unlock fields ---
      tickerInput.readOnly = false;
      priceInput.readOnly = false;
      accountSelect.disabled = false;

      // --- MODIFICATION: Adjust visibility ---
      adviceSourceSelectGroup.style.display = ''; // Show dropdown group
      adviceSourceLockedDisplay.style.display = 'none'; // Hide dedicated display
      // --- END MODIFICATION ---

      // --- Reset values ---
      adviceSourceSelect.value = ''; // Reset dropdown
      // --- *** ADDED: Clear the hidden input *** ---
      linkedJournalIdInput.value = '';
      // --- *** END ADDED *** ---
      if (dateInput) {
        dateInput.value = getCurrentESTDateString();
      }
    }
  }, 0); // Use setTimeout with 0 delay
  // --- END MODIFICATION ---

  try {
    const holderId =
      state.selectedAccountHolderId === 'all' || !state.selectedAccountHolderId
        ? 'all'
        : String(state.selectedAccountHolderId);

    console.log(`[loadOrdersPage] Fetching orders for holder: ${holderId}`);

    if (holderId === 'all') {
      console.warn(
        "[loadOrdersPage] 'All Accounts' selected, will not fetch pending orders."
      );
      renderOpenOrders([]);
      console.log('[loadOrdersPage] Finished (All Accounts).');
      return;
    }
    const orders = await fetchPendingOrders(holderId);
    console.log('[loadOrdersPage] Fetched orders:', orders);
    renderOpenOrders(orders);
    console.log('[loadOrdersPage] Finished successfully.');
  } catch (error) {
    console.error('[loadOrdersPage] Error during execution:', error);
    const err = /** @type {Error} */ (error);
    showToast(`Error loading orders page: ${err.message}`, 'error');
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="7">Error loading open orders.</td></tr>';
    }
    console.log('[loadOrdersPage] Finished with error.');
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
    console.error('[Orders Init] CRITICAL ERROR during initialization:', error);
  }
}
