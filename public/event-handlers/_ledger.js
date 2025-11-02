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
 * Fetches and renders the ranged P/L summary table.
 * @async
 */
async function fetchAndRenderRangedPL() {
  const startDateEl = /** @type {HTMLInputElement} */ (
    document.getElementById('pl-start-date')
  );
  const endDateEl = /** @type {HTMLInputElement} */ (
    document.getElementById('pl-end-date')
  );
  const tableBody = /** @type {HTMLTableSectionElement} */ (
    document.getElementById('pl-summary-ranged-tbody')
  );
  const totalCell = document.getElementById('pl-summary-ranged-total');

  if (!startDateEl || !endDateEl || !tableBody || !totalCell) {
    console.warn('Missing ranged P/L elements.');
    return;
  }

  const startDate = startDateEl.value;
  const endDate = endDateEl.value;
  const holderId = state.selectedAccountHolderId;

  if (!startDate || !endDate || !holderId || holderId === 'all') {
    tableBody.innerHTML = '<tr><td colspan="2">Select dates...</td></tr>';
    totalCell.textContent = '--';
    totalCell.className = 'numeric';
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';
  try {
    const response = await fetch('/api/reporting/realized_pl/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: startDate,
        endDate: endDate,
        accountHolderId: holderId,
      }),
    });
    const plData = await handleResponse(response);
    renderLedgerPLSummary('ranged', plData);
  } catch (error) {
    console.error('Failed to render ranged P/L Summary:', error);
    // @ts-ignore
    showToast(`Error fetching ranged P/L: ${error.message}`, 'error');
    tableBody.innerHTML = '<tr><td colspan="2">Error loading.</td></tr>';
  }
}

// --- ADDED: Function to fetch and render lifetime P/L summary ---
/**
 * Fetches and renders the lifetime P/L summary table.
 * @async
 */
async function fetchAndRenderLifetimePL() {
  const holderId = state.selectedAccountHolderId;
  if (!holderId || holderId === 'all') {
    renderLedgerPLSummary('lifetime', { byExchange: [], total: 0 });
    return;
  }
  try {
    const response = await fetch(
      `/api/reporting/realized_pl/summary?holder=${holderId}`
    );
    const plData = await handleResponse(response);
    renderLedgerPLSummary('lifetime', plData);
  } catch (error) {
    console.error('Failed to render lifetime P/L Summary:', error);
    // @ts-ignore
    showToast(`Error fetching lifetime P/L: ${error.message}`, 'error');
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
  await fetchAndRenderLifetimePL();
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

  // --- ADDED: P/L Date Pickers ---
  const plStartDate = /** @type {HTMLInputElement} */ (
    document.getElementById('pl-start-date')
  );
  const plEndDate = /** @type {HTMLInputElement} */ (
    document.getElementById('pl-end-date')
  );

  if (plStartDate)
    plStartDate.addEventListener('change', fetchAndRenderRangedPL);
  if (plEndDate) plEndDate.addEventListener('change', fetchAndRenderRangedPL);
  // --- END ADDED ---

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
}
