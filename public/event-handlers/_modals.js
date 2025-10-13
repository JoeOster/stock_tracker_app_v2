// Portfolio Tracker V3.0.5
// public/event-handlers/_modals.js
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { state } from '../state.js'; 
import { refreshLedger } from '../api.js'; // FIX: Corrected import path
import { switchView } from './_navigation.js'; // This will be fixed in the next step
/**
 * Initializes all event listeners related to modal dialogs.
 * This includes generic closing behavior and specific form submission handlers
 * for the Edit Transaction, Sell From Position, and Confirm Fill modals.
 * @returns {void}
 */
export function initializeModalHandlers() {
    const editModal = document.getElementById('edit-modal');
    const editForm = /** @type {HTMLFormElement} */ (document.getElementById('edit-transaction-form'));
    const sellFromPositionForm = /** @type {HTMLFormElement} */ (document.getElementById('sell-from-position-form'));

    // --- Generic Modal Closing Listeners ---
    // Adds a click listener to all close buttons ('x') within modals.
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', e =>
            (/** @type {HTMLElement} */ (e.target)).closest('.modal').classList.remove('visible')
        )
    );

    // Adds a click listener to the window to close a modal when clicking on the background overlay.
    window.addEventListener('click', e => {
        if ((/** @type {HTMLElement} */ (e.target)).classList.contains('modal')) {
            (/** @type {HTMLElement} */ (e.target)).classList.remove('visible');
        }
    });

    // --- Sell From Position Modal ---
	if(sellFromPositionForm) {
		sellFromPositionForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const sellDetails = {
				account_holder_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value,
				parent_buy_id: (/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value,
				quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('sell-quantity'))).value),
				price: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('sell-price'))).value),
				transaction_date: (/** @type {HTMLInputElement} */(document.getElementById('sell-date'))).value,
				ticker: document.getElementById('sell-ticker-display').textContent,
				exchange: document.getElementById('sell-exchange-display').textContent,
				transaction_type: 'SELL',
			};
			const submitButton = /** @type {HTMLButtonElement} */ (sellFromPositionForm.querySelector('button[type="submit"]'));
			submitButton.disabled = true;
			try {
				const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sellDetails) });
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || 'Server returned an error.');
				}
				showToast('Sale logged successfully!', 'success');
				document.getElementById('sell-from-position-modal').classList.remove('visible');
				await switchView(state.currentView.type, state.currentView.value);
			} catch (error) {
				showToast(`Failed to log sale: ${error.message}`, 'error');
			} finally {
				submitButton.disabled = false;
			}
		});
	}

    // --- Edit Transaction Modal ---
    if(editForm) {
        // Handles the submission of changes to an existing transaction.
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
            const updatedTransaction = {
                account_holder_id: (/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value,
                ticker: (/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value.toUpperCase().trim(),
                exchange: (/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value,
                transaction_type: (/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value,
                quantity: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value),
                price: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value),
                transaction_date: (/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value,
                limit_price_up: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value) || null,
                limit_up_expiration: (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value || null,
                limit_price_down: parseFloat((/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value) || null,
                limit_down_expiration: (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value || null,
            };

            const lotData = state.activityMap.get(`lot-${id}`);
            if (lotData) {
                const costBasis = lotData.cost_basis;
                if (updatedTransaction.limit_price_up && updatedTransaction.limit_price_up <= costBasis) {
                    showToast('Take Profit price must be higher than the cost basis.', 'error');
                    return;
                }
                if (updatedTransaction.limit_price_down && updatedTransaction.limit_price_down >= costBasis) {
                    showToast('Stop Loss price must be lower than the cost basis.', 'error');
                    return;
                }
            }

            const submitButton = /** @type {HTMLButtonElement} */ (editForm.querySelector('button[type="submit"]'));
            submitButton.disabled = true;

            try {
                const response = await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTransaction) });
                if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message); }

                editModal.classList.remove('visible');
                showToast('Transaction updated!', 'success');

                // Refresh the appropriate view after the update.
                if (state.currentView.type === 'ledger') {
                    await refreshLedger();
                } else if (state.currentView.type === 'date') {
                     await switchView(state.currentView.type, state.currentView.value);
                }
            } catch (error) {
                showToast(`Error updating transaction: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
        
        const cancelEditBtn = document.getElementById('edit-modal-cancel-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                editModal.classList.remove('visible');
            });
        }
        
        // Handles the delete button within the edit modal.
        const deleteEditBtn = document.getElementById('edit-modal-delete-btn');
        if (deleteEditBtn) {
            deleteEditBtn.addEventListener('click', async () => {
                const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
                if (!id) return;
                showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                    try {
                        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });

                        if (!res.ok) {
                            // Reads the specific error message from the server response.
                            const errorData = await res.json();
                            throw new Error(errorData.message || 'Server error during deletion.');
                        }

                        editModal.classList.remove('visible');
                        showToast('Transaction deleted.', 'success');
                        await refreshLedger();

                    } catch (err) {
                        showToast(`Failed to delete: ${err.message}`, 'error');
                    }
                });
            });
        }
    }

    // --- Clear Limit Buttons in Edit Modal ---
    if(editModal) {
        editModal.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */(e.target);
            const clearBtn = target.closest('.clear-limit-btn');
            if (!clearBtn) return;
            const dataTarget = (/** @type {HTMLElement} */(clearBtn)).dataset.target;
            if (dataTarget === 'up') {
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = '';
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = '';
            } else if (dataTarget === 'down') {
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = '';
                (/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = '';
            }
        });
    }
}