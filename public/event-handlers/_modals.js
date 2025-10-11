// public/event-handlers/_modals.js
import { showConfirmationModal } from '../ui/helpers.js';
import { refreshLedger } from '../../app-main.js';

export function initializeModalHandlers() {
    const editModal = document.getElementById('edit-modal');

    if(editModal) {
        const deleteEditBtn = document.getElementById('edit-modal-delete-btn');
        if (deleteEditBtn) {
            deleteEditBtn.addEventListener('click', async () => {
                const id = (/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value;
                if (!id) return;

                showConfirmationModal('Delete Transaction?', 'This is permanent.', async () => {
                    try {
                        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Server error during deletion.');
                        
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
}