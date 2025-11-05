// /public/event-handlers/_ledger.js
/**
 * @file Initializes all event listeners for the Transaction Ledger page.
 * @module event-handlers/_ledger
 */
import { handleResponse } from '../api/api-helpers.js';
import { refreshLedger } from '../api/transactions-api.js';
import { state } from '../state.js';
// --- MODIFIED: Import new renderer ---
import {
  renderLedgerPage,
  renderLedgerPLSummary,
} from '../ui/renderers/_ledger.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';

// --- ADDED: Function to fetch and render ranged P/L summary ---
/**
 * Fetches and renders the ranged P/L summary in the compact bar.
 * @async
 */
async function fetchAndRenderRangedPL() {
  const dateRangeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('date-range-select'));
  const startDateInput = /** @type {HTMLInputElement} */ (document.getElementById('start-date'));
  const endDateInput = /** @type {HTMLInputElement} */ (document.getElementById('end-date'));
  const pnlValueDisplay = document.getElementById('pnl-value-display');

  if (!dateRangeSelect || !startDateInput || !endDateInput || !pnlValueDisplay) {
    console.warn('Missing P/L summary bar elements.');
    return;
  }

  let startDate;
  let endDate;
  const today = new Date();
  const currentYear = today.getFullYear();

  switch (dateRangeSelect.value) {
    case '30d':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      break;
    case '90d':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 90);
      break;
    case 'ytd':
      startDate = new Date(currentYear, 0, 1); // January 1st of current year
      break;
    case 'all':
      startDate = null; // Or a very old date, depending on API
      endDate = null;
      break;
    case 'custom':
      startDate = startDateInput.value ? new Date(startDateInput.value) : null;
      endDate = endDateInput.value ? new Date(endDateInput.value) : null;
      break;
    default:
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
  }

  // Format dates to YYYY-MM-DD for the API
  const formatApiDate = (date) => date ? date.toISOString().split('T')[0] : null;
  const apiStartDate = formatApiDate(startDate);
  const apiEndDate = formatApiDate(endDate || today); // Default end date to today if not custom

  const holderId = state.selectedAccountHolderId;

  if (!holderId || holderId === 'all') {
    pnlValueDisplay.textContent = '--';
    pnlValueDisplay.className = 'pnl-value';
    return;
  }

  pnlValueDisplay.textContent = 'Loading...';
  pnlValueDisplay.className = 'pnl-value';

  try {
    const response = await fetch('/api/reporting/realized_pl/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: apiStartDate,
        endDate: apiEndDate,
        accountHolderId: holderId,
      }),
    });
    const plData = await handleResponse(response);
    renderLedgerPLSummary('ranged', plData);
  } catch (error) {
    console.error('Failed to fetch ranged P/L Summary:', error);
    // @ts-ignore
    showToast(`Error fetching ranged P/L: ${error.message}`, 'error');
    pnlValueDisplay.textContent = 'Error';
    pnlValueDisplay.className = 'pnl-value loss';
  }
}



// --- MODIFIED: Add P/L fetches to refreshLedger ---
/**
 * Fetches the latest transactions and P/L data, then re-renders the ledger page.
 * @async
 * @returns {Promise<void>}
 */
export async function refreshLedgerWithPL() {
  // Refresh the main transaction list
  await refreshLedger();
  // ALSO refresh the P/L summary tables
  await fetchAndRenderRangedPL(); // This will re-render based on current date inputs
}

/**
 * Initializes all event listeners for the Transaction Ledger page.
 * Handles filtering, sorting, and modal triggers for edit/delete.
 * @returns {void}
 */
export function initializeLedgerHandlers() {
  const ledgerTable = document.querySelector('#ledger-table');
  const ledgerFilterTicker = /** @type {HTMLInputElement} */ (
    document.getElementById('ledger-filter-ticker')
  );
  const ledgerFilterStart = /** @type {HTMLInputElement} */ (
    document.getElementById('ledger-filter-start')
  );
  const ledgerFilterEnd = /** @type {HTMLInputElement} */ (
    document.getElementById('ledger-filter-end')
  );
  const ledgerClearFiltersBtn = document.getElementById(
    'ledger-clear-filters-btn'
  );
  const editModal = document.getElementById('edit-modal');

  const dateRangeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('date-range-select'));
  const customDateRangeDiv = /** @type {HTMLDivElement} */ (document.getElementById('custom-date-range'));
  const startDateInput = /** @type {HTMLInputElement} */ (document.getElementById('start-date'));
  const endDateInput = /** @type {HTMLInputElement} */ (document.getElementById('end-date'));

  /**
   * Handles changes in the date filter dropdown or custom date inputs.
   */
  function handleDateRangeChange() {
    const selectedValue = dateRangeSelect.value;

    // Show or hide the custom date inputs
    customDateRangeDiv.style.display = (selectedValue === 'custom') ? 'flex' : 'none';

    // Fetch and display data based on the new selection
    fetchAndRenderRangedPL();
  }

  if (dateRangeSelect) dateRangeSelect.addEventListener('change', handleDateRangeChange);
  if (startDateInput) startDateInput.addEventListener('change', handleDateRangeChange);
  if (endDateInput) endDateInput.addEventListener('change', handleDateRangeChange);

  // Initial call to set up the date range display and fetch data
  handleDateRangeChange();

  /**
   * Applies the current filter values and re-renders the ledger.
   * @returns {void}
   */
  const applyLedgerFilters = () =>
    renderLedgerPage(state.transactions, state.ledgerSort);

  if (ledgerFilterTicker)
    ledgerFilterTicker.addEventListener('input', applyLedgerFilters);
  if (ledgerFilterStart)
    ledgerFilterStart.addEventListener('input', applyLedgerFilters);
  if (ledgerFilterEnd)
    ledgerFilterEnd.addEventListener('input', applyLedgerFilters);
  if (ledgerClearFiltersBtn) {
    ledgerClearFiltersBtn.addEventListener('click', () => {
      if (ledgerFilterTicker) ledgerFilterTicker.value = '';
      if (ledgerFilterStart) ledgerFilterStart.value = '';
      if (ledgerFilterEnd) ledgerFilterEnd.value = '';
      applyLedgerFilters();
    });
  }

  if (ledgerTable) {
    const thead = ledgerTable.querySelector('thead');
    if (thead) {
      thead.addEventListener('click', (e) => {
        const th = /** @type {HTMLElement} */ (
          /** @type {HTMLElement} */ (e.target).closest('th[data-sort]')
        );
        if (!th || !th.dataset.sort) return; // Added check for dataset.sort

        const newColumn = th.dataset.sort;
        let newDirection = 'asc'; // Default direction

        // Check current sort state and toggle direction
        if (
          state.ledgerSort.column === newColumn &&
          state.ledgerSort.direction === 'asc'
        ) {
          newDirection = 'desc';
        }

        state.ledgerSort = {
          column: newColumn,
          direction: /** @type {'asc' | 'desc'} */ (newDirection),
        };

        renderLedgerPage(state.transactions, state.ledgerSort);
      });
    }

    const tbody = ledgerTable.querySelector('tbody');
    if (tbody) {
      tbody.addEventListener('click', async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        // --- Delete Button Logic ---
        const deleteBtn = /** @type {HTMLElement} */ (
          target.closest('.delete-btn')
        );
        if (deleteBtn && deleteBtn.dataset.id) {
          // Added check for dataset.id
          const id = deleteBtn.dataset.id;
          showConfirmationModal(
            'Delete Transaction?',
            'This is permanent.',
            async () => {
              try {
                const res = await fetch(`/api/transactions/${id}`, {
                  method: 'DELETE',
                });
                // handleResponse will throw on error, extracting server message
                await handleResponse(res);
                showToast('Transaction deleted.', 'success');
                // --- MODIFIED: Call new refresh function ---
                await refreshLedgerWithPL(); // Refresh data after successful delete
              } catch (err) {
                // Display specific error message
                showToast(
                  `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
                  'error'
                );
              }
            }
          );
        }

        // --- Edit Button Logic ---
        const editBtn = /** @type {HTMLElement} */ (
          target.closest('.modify-btn')
        );
        if (editBtn && editBtn.dataset.id) {
          // Added check for dataset.id
          const id = editBtn.dataset.id;
          // Find the transaction data from the current state
          const tx = state.transactions.find((t) => String(t.id) === id); // Use string comparison

          if (tx && editModal) {
            // --- Populate Modal Fields ---
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-id')
            ).value = String(tx.id);
            /** @type {HTMLSelectElement} */ (
              document.getElementById('edit-account-holder')
            ).value = String(tx.account_holder_id);
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-date')
            ).value = tx.transaction_date;
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-ticker')
            ).value = tx.ticker;
            /** @type {HTMLSelectElement} */ (
              document.getElementById('edit-exchange')
            ).value = tx.exchange;
            /** @type {HTMLSelectElement} */ (
              document.getElementById('edit-type')
            ).value = tx.transaction_type;
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-quantity')
            ).value = String(tx.quantity);
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-price')
            ).value = String(tx.price);
            // Handle potential null values for limits/expirations
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-price-up')
            ).value = String(tx.limit_price_up ?? '');
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-up-expiration')
            ).value = tx.limit_up_expiration ?? '';
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-price-down')
            ).value = String(tx.limit_price_down ?? '');
            /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-down-expiration')
            ).value = tx.limit_down_expiration ?? '';

            // --- Show/Hide Sections & Set Title ---
            const coreFields = /** @type {HTMLElement | null} */ (
              document.getElementById('edit-core-fields')
            );
            const limitFields = /** @type {HTMLElement | null} */ (
              document.getElementById('edit-limit-fields')
            );
            const modalTitle = document.getElementById('edit-modal-title');
            if (modalTitle) modalTitle.textContent = 'Edit Transaction';
            if (coreFields) coreFields.style.display = 'block'; // Show core fields by default
            if (limitFields) limitFields.style.display = 'none'; // Hide limit fields initially

            // --- Ensure fields are editable (might have been disabled by Dashboard modal use) ---
            const editTickerInput = /** @type {HTMLInputElement | null} */ (
              document.getElementById('edit-ticker')
            );
            const editTypeSelect = /** @type {HTMLSelectElement | null} */ (
              document.getElementById('edit-type')
            );
            if (editTickerInput) editTickerInput.readOnly = false;
            if (editTypeSelect) editTypeSelect.disabled = false;

            editModal.classList.add('visible'); // Show the modal
          } else if (!tx) {
            console.warn(
              `Could not find transaction data in state for ID: ${id}`
            );
            showToast(
              'Could not load transaction details for editing.',
              'error'
            );
          }
        }
      });
    }
  }

  // Listen for global data updates and re-render the ledger
  window.addEventListener('dataUpdate', () => {
    if (state.currentView.type === 'ledger') { // Only re-render if ledger is the active view
      console.log('[Ledger Init] dataUpdate event received. Re-rendering ledger.');
      refreshLedgerWithPL();
    }
  });
}
