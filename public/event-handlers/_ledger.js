// public/event-handlers/_ledger.js
import { state, refreshLedger, sortTableByColumn } from '../app-main.js';
import { renderLedger } from '../ui/renderers.js';
import { showToast, getCurrentESTDateString, showConfirmationModal } from '../ui/helpers.js';

export function initializeLedgerHandlers() {
    const transactionForm = /** @type {HTMLFormElement} */ (document.getElementById('add-transaction-form'));
    const ledgerTable = document.querySelector('#ledger-table');
    const ledgerFilterTicker = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-ticker'));
    const ledgerFilterStart = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-start'));
    const ledgerFilterEnd = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-end'));
    const ledgerClearFiltersBtn = document.getElementById('ledger-clear-filters-btn');
    const editModal = document.getElementById('edit-modal');

    // --- Add Transaction Form ---
    if (transactionForm) {
		const priceInput = /** @type {HTMLInputElement} */ (document.getElementById('price'));
		priceInput.addEventListener('change', () => {
			const price = parseFloat(priceInput.value);
			if (!price || isNaN(price)) return;

			const takeProfitPercent = state.settings.takeProfitPercent;
			const stopLossPercent = state.settings.stopLossPercent;

			const suggestedProfit = price * (1 + takeProfitPercent / 100);
			const suggestedLoss = price * (1 - stopLossPercent / 100);

			(/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-up'))).value = suggestedProfit.toFixed(2);
			(/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-down'))).value = suggestedLoss.toFixed(2);
		});

		transactionForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const isProfitLimitSet = (/** @type {HTMLInputElement} */(document.getElementById('set-profit-limit-checkbox'))).checked;
			const profitExpirationDate = (/** @type {HTMLInputElement} */(document.getElementById('add-limit-up-expiration'))).value;
			if (isProfitLimitSet && !profitExpirationDate) {
				return showToast('A Take Profit limit requires an expiration date.', 'error');
			}
			const isLossLimitSet = (/** @type {HTMLInputElement} */(document.getElementById('set-loss-limit-checkbox'))).checked;
			const lossExpirationDate = (/** @type {HTMLInputElement} */(document.getElementById('add-limit-down-expiration'))).value;
			if (isLossLimitSet && !lossExpirationDate) {
				return showToast('A Stop Loss limit requires an expiration date.', 'error');
			}
			const transaction = {
				account_holder_id: (/** @type {HTMLSelectElement} */(document.getElementById('add-tx-account-holder'))).value,
				transaction_date: (/** @type {HTMLInputElement} */(document.getElementById('transaction-date'))).value,
				ticker: (/** @type {HTMLInputElement} */(document.getElementById('ticker'))).value.toUpperCase().trim(),
				exchange: (/** @type {HTMLSelectElement} */(document.getElementById('exchange'))).value,
				transaction_type: (/** @type {HTMLSelectElement} */(document.getElementById('transaction-type'))).value,
				quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('quantity'))).value),
				price: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('price'))).value),
				limit_price_up: isProfitLimitSet ? parseFloat((/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-up'))).value) : null,
				limit_up_expiration: isProfitLimitSet ? profitExpirationDate : null,
				limit_price_down: isLossLimitSet ? parseFloat((/** @type {HTMLInputElement} */(document.getElementById('add-limit-price-down'))).value) : null,
				limit_down_expiration: isLossLimitSet ? lossExpirationDate : null
			};
			const submitButton = /** @type {HTMLButtonElement} */ (transactionForm.querySelector('button[type="submit"]'));
			submitButton.disabled = true;
			try {
				const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transaction) });
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Server responded with an error.');
				}
				showToast('Transaction logged successfully!', 'success');
				transactionForm.reset();
				(/** @type {HTMLInputElement} */(document.getElementById('transaction-date'))).value = getCurrentESTDateString();
				await refreshLedger();
			} catch (error) {
				showToast(`Failed to log transaction: ${error.message}`, 'error');
			} finally {
				submitButton.disabled = false;
			}
		});
	}

    // --- Ledger Filter Listeners ---
    const applyLedgerFilters = () => renderLedger(state.allTransactions, state.ledgerSort);
    if(ledgerFilterTicker) ledgerFilterTicker.addEventListener('input', applyLedgerFilters);
    if(ledgerFilterStart) ledgerFilterStart.addEventListener('input', applyLedgerFilters);
    if(ledgerFilterEnd) ledgerFilterEnd.addEventListener('input', applyLedgerFilters);
    if(ledgerClearFiltersBtn) {
        ledgerClearFiltersBtn.addEventListener('click', () => {
            ledgerFilterTicker.value = '';
            ledgerFilterStart.value = '';
            ledgerFilterEnd.value = '';
            applyLedgerFilters();
        });
    }

    // --- Ledger Table Listeners (Sorting, Edit, Delete) ---
    if(ledgerTable) {
        ledgerTable.querySelector('thead').addEventListener('click', (e) => {
            const th = /** @type {HTMLElement} */ (e.target).closest('th[data-sort]');
            if (!th) return;
            const newColumn = th.dataset.sort;
            let newDirection = 'asc';
            if (state.ledgerSort.column === newColumn && state.ledgerSort.direction === 'asc') { newDirection = 'desc'; }
            state.ledgerSort = { column: newColumn, direction: newDirection };
            renderLedger(state.allTransactions, state.ledgerSort);
        });

        ledgerTable.querySelector('tbody').addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const deleteBtn = /** @type {HTMLElement} */ (target.closest('.delete-btn'));
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                    try {
                        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Server error');
                        showToast('Transaction deleted.', 'success');
                        await refreshLedger();
                    } catch (err) { showToast('Failed to delete.', 'error'); }
                });
            }
            const editBtn = /** @type {HTMLElement} */ (target.closest('.modify-btn'));
            if (editBtn) {
                const id = editBtn.dataset.id;
                const tx = state.allTransactions.find(t => t.id == id);
                if (tx) {
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value = String(tx.id);
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value = String(tx.account_holder_id);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value = tx.transaction_date;
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value = tx.ticker;
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value = tx.exchange;
                    (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value = tx.transaction_type;
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value = String(tx.quantity);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value = String(tx.price);
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = String(tx.limit_price_up || '');
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = tx.limit_up_expiration || '';
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = String(tx.limit_price_down || '');
                    (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = tx.limit_down_expiration || '';
                    const coreFields = /** @type {HTMLElement} */ (document.getElementById('edit-core-fields'));
                    const limitFields = /** @type {HTMLElement} */ (document.getElementById('edit-limit-fields'));
                    const modalTitle = document.getElementById('edit-modal-title');
                    modalTitle.textContent = 'Edit Transaction';
                    coreFields.style.display = 'block';
                    limitFields.style.display = 'none';
                    editModal.classList.add('visible');
                }
            }
        });
    }
}