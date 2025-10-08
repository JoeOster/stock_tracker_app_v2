import { switchView, refreshLedger, saveSettings, state, sortTableByColumn, showConfirmationModal, renderExchangeManagementList } from './app-main.js';
import { updateAllPrices } from './api.js';
import { showToast, getCurrentESTDateString, formatAccounting, formatQuantity } from './ui/helpers.js';
import { renderLedger, renderSnapshotsPage } from './ui/renderers.js';

export function initializeEventListeners() {
    const dailyReportContainer = document.getElementById('daily-report-container');
    const transactionForm = document.getElementById('add-transaction-form');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-transaction-form');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-button');
    const csvFileInput = document.getElementById('csv-file-input');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const tabsContainer = document.getElementById('tabs-container');
    const sellFromPositionModal = document.getElementById('sell-from-position-modal');
    const sellFromPositionForm = document.getElementById('sell-from-position-form');
    const exchangeList = document.getElementById('exchange-list');
    const addExchangeBtn = document.getElementById('add-exchange-btn');
    const newExchangeNameInput = document.getElementById('new-exchange-name');

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('master-tab')) {
            const viewType = e.target.dataset.viewType;
            const viewValue = e.target.dataset.viewValue;
            if (viewType) {
                switchView(viewType, viewValue || null);
            }
        }
    });

    document.getElementById('custom-date-picker').addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        if (selectedDate) {
            let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
            const newDate = { date: selectedDate, added: Date.now() };
            persistentDates = persistentDates.filter(d => d.date !== selectedDate);
            persistentDates.push(newDate);
            localStorage.setItem('persistentDates', JSON.stringify(persistentDates));
            switchView('date', selectedDate);
        }
    });

    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const transaction = {
            transaction_date: document.getElementById('transaction-date').value,
            ticker: document.getElementById('ticker').value.toUpperCase().trim(),
            exchange: document.getElementById('exchange').value,
            transaction_type: document.getElementById('transaction-type').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            price: parseFloat(document.getElementById('price').value),
            limit_price_up: parseFloat(document.getElementById('limit-price-up').value) || null,
            limit_up_expiration: document.getElementById('limit-up-expiration').value || null,
            limit_price_down: parseFloat(document.getElementById('limit-price-down').value) || null,
            limit_down_expiration: document.getElementById('limit-down-expiration').value || null,
        };
        const submitButton = transactionForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transaction) });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Server responded with an error.');
            }
            showToast('Transaction logged successfully!', 'success');
            transactionForm.reset();
            document.getElementById('transaction-date').value = getCurrentESTDateString();
            await refreshLedger();
        } catch (error) {
            showToast(`Failed to log transaction: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    saveSettingsBtn.addEventListener('click', () => {
        saveSettings();
        settingsModal.classList.remove('visible');
    });

    const themeSelector = document.getElementById('theme-selector');
    if(themeSelector) {
        themeSelector.addEventListener('change', () => {
            saveSettings();
            if(state.currentView.type === 'charts') {
                switchView('charts');
            }
        });
    }

    importCsvBtn.addEventListener('click', () => {
        const file = csvFileInput.files[0];
        if (!file) { return showToast('Please select a CSV file.', 'error'); }
        const reader = new FileReader();
        reader.onload = async (event) => {
            const transactions = [];
            const lines = event.target.result.split(/\r\n|\n/);
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                const values = lines[i].split(',');
                if (values.length !== 6) { return showToast(`Error on line ${i + 1}: Invalid column count.`, 'error'); }
                transactions.push({
                    transaction_date: values[0].trim(),
                    ticker: values[1].trim().toUpperCase(),
                    exchange: values[2].trim(),
                    transaction_type: values[3].trim().toUpperCase(),
                    quantity: parseFloat(values[4]),
                    price: parseFloat(values[5])
                });
            }
            if (transactions.length > 0) {
                try {
                    const response = await fetch('/api/transactions/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transactions) });
                    if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
                    showToast(`${transactions.length} transactions imported!`, 'success');
                    csvFileInput.value = '';
                    await refreshLedger();
                } catch (error) { showToast(`Import failed: ${error.message}`, 'error'); }
            } else { showToast('No valid transactions found.', 'info'); }
        };
        reader.readAsText(file);
    });

    settingsBtn.addEventListener('click', () => {
        renderExchangeManagementList();
        settingsModal.classList.add('visible');
    });
    
    document.querySelector('#ledger-table thead').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        const newColumn = th.dataset.sort;
        let newDirection = 'asc';
        if (state.ledgerSort.column === newColumn && state.ledgerSort.direction === 'asc') { newDirection = 'desc'; }
        state.ledgerSort = { column: newColumn, direction: newDirection };
        renderLedger(state.allTransactions, state.ledgerSort);
    });
    
    dailyReportContainer.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const thead = th.closest('thead');
            let tbody = thead.nextElementSibling;
            while (tbody && tbody.tagName !== 'TBODY') { tbody = tbody.nextElementSibling; }
            if (tbody) { sortTableByColumn(th, tbody); }
            return;
        }

        const sellBtn = e.target.closest('.sell-from-lot-btn');
        if (sellBtn) {
            const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
            document.getElementById('sell-parent-buy-id').value = buyId;
            document.getElementById('sell-ticker-display').textContent = ticker;
            document.getElementById('sell-exchange-display').textContent = exchange;
            const quantityInput = document.getElementById('sell-quantity');
            quantityInput.value = quantity;
            quantityInput.max = quantity;
            document.getElementById('sell-date').value = getCurrentESTDateString();
            sellFromPositionModal.classList.add('visible');
            return;
        }
        
        const setLimitBtn = e.target.closest('.set-limit-btn');
        const editBuyBtn = e.target.closest('.edit-buy-btn');
        if (setLimitBtn || editBuyBtn) {
            const id = (setLimitBtn || editBuyBtn).dataset.id;
            const lotData = state.activityMap.get(`lot-${id}`);
            if (lotData) {
                document.getElementById('edit-id').value = lotData.id;
                document.getElementById('edit-date').value = lotData.purchase_date;
                document.getElementById('edit-ticker').value = lotData.ticker;
                document.getElementById('edit-exchange').value = lotData.exchange;
                document.getElementById('edit-type').value = 'BUY';
                document.getElementById('edit-quantity').value = lotData.original_quantity;
                document.getElementById('edit-price').value = lotData.cost_basis;
                document.getElementById('edit-limit-price-up').value = lotData.limit_price_up || '';
                document.getElementById('edit-limit-up-expiration').value = lotData.limit_up_expiration || '';
                document.getElementById('edit-limit-price-down').value = lotData.limit_price_down || '';
                document.getElementById('edit-limit-down-expiration').value = lotData.limit_down_expiration || '';

                const coreFields = document.getElementById('edit-core-fields');
                const limitFields = document.getElementById('edit-limit-fields');
                const modalTitle = document.getElementById('edit-modal-title');

                if (setLimitBtn) {
                    modalTitle.textContent = `Set Limits for ${lotData.ticker}`;
                    coreFields.style.display = 'none';
                    limitFields.style.display = 'block';
                } else { 
                    modalTitle.textContent = 'Edit Buy Transaction';
                    coreFields.style.display = 'block';
                    limitFields.style.display = 'none';
                }
                editModal.classList.add('visible');
            }
        }
    });
    
    document.querySelector('#ledger-table tbody').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
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
        const editBtn = e.target.closest('.modify-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const tx = state.allTransactions.find(t => t.id == id);
            if (tx) {
                document.getElementById('edit-id').value = tx.id;
                document.getElementById('edit-date').value = tx.transaction_date;
                document.getElementById('edit-ticker').value = tx.ticker;
                document.getElementById('edit-exchange').value = tx.exchange;
                document.getElementById('edit-type').value = tx.transaction_type;
                document.getElementById('edit-quantity').value = tx.quantity;
                document.getElementById('edit-price').value = tx.price;
                document.getElementById('edit-limit-price-up').value = tx.limit_price_up || '';
                document.getElementById('edit-limit-up-expiration').value = tx.limit_up_expiration || '';
                document.getElementById('edit-limit-price-down').value = tx.limit_price_down || '';
                document.getElementById('edit-limit-down-expiration').value = tx.limit_down_expiration || '';

                const coreFields = document.getElementById('edit-core-fields');
                const limitFields = document.getElementById('edit-limit-fields');
                const modalTitle = document.getElementById('edit-modal-title');

                modalTitle.textContent = 'Edit Transaction';
                coreFields.style.display = 'block';
                limitFields.style.display = 'none';

                editModal.classList.add('visible');
            }
        }
    });

    sellFromPositionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sellDetails = {
            parent_buy_id: document.getElementById('sell-parent-buy-id').value,
            quantity: parseFloat(document.getElementById('sell-quantity').value),
            price: parseFloat(document.getElementById('sell-price').value),
            transaction_date: document.getElementById('sell-date').value,
            ticker: document.getElementById('sell-ticker-display').textContent,
            exchange: document.getElementById('sell-exchange-display').textContent,
            transaction_type: 'SELL'
        };
        const submitButton = sellFromPositionForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sellDetails) });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Server returned an error.');
            }
            showToast('Sale logged successfully!', 'success');
            sellFromPositionModal.classList.remove('visible');
            await switchView(state.currentView.type, state.currentView.value);
        } catch (error) {
            showToast(`Failed to log sale: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const updatedTransaction = {
            ticker: document.getElementById('edit-ticker').value.toUpperCase().trim(),
            exchange: document.getElementById('edit-exchange').value,
            transaction_type: document.getElementById('edit-type').value,
            quantity: parseFloat(document.getElementById('edit-quantity').value),
            price: parseFloat(document.getElementById('edit-price').value),
            transaction_date: document.getElementById('edit-date').value,
            limit_price_up: parseFloat(document.getElementById('edit-limit-price-up').value) || null,
            limit_up_expiration: document.getElementById('limit-up-expiration').value || null,
            limit_price_down: parseFloat(document.getElementById('limit-price-down').value) || null,
            limit_down_expiration: document.getElementById('limit-down-expiration').value || null,
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

        const submitButton = editForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const response = await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedTransaction) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message); }

            editModal.classList.remove('visible');
            showToast('Transaction updated!', 'success');

            if (state.currentView.type === 'ledger') {
                await refreshLedger();
            } else if (state.currentView.type === 'date' && lotData) {
                const freshDataRes = await fetch(`/api/transaction/${id}`);
                if (freshDataRes.ok) {
                    const freshTx = await freshDataRes.json();
                    lotData.cost_basis = freshTx.price;
                    lotData.original_quantity = freshTx.original_quantity;
                    lotData.quantity_remaining = freshTx.quantity_remaining;
                    lotData.limit_price_up = freshTx.limit_price_up;
                    lotData.limit_up_expiration = freshTx.limit_up_expiration;
                    lotData.limit_price_down = freshTx.limit_price_down;
                    lotData.limit_down_expiration = freshTx.limit_down_expiration;
                    
                    const rowToUpdate = document.querySelector(`tr[data-key="lot-${id}"]`);
                    if(rowToUpdate) {
                        let limitUpText = lotData.limit_price_up ? formatAccounting(lotData.limit_price_up) : '--';
                        if (lotData.limit_price_up && lotData.limit_up_expiration) { limitUpText += ` on ${lotData.limit_up_expiration}`; }
                        let limitDownText = lotData.limit_price_down ? formatAccounting(lotData.limit_price_down) : '--';
                        if (lotData.limit_price_down && lotData.limit_down_expiration) { limitDownText += ` on ${lotData.limit_down_expiration}`; }

                        rowToUpdate.querySelector('td:nth-child(4)').innerHTML = formatAccounting(lotData.cost_basis);
                        rowToUpdate.querySelector('td:nth-child(5)').innerHTML = formatQuantity(lotData.quantity_remaining);
                        rowToUpdate.querySelector('td:nth-child(9)').innerHTML = limitUpText;
                        rowToUpdate.querySelector('td:nth-child(10)').innerHTML = limitDownText;
                    }
                }
            }
        } catch (error) {
            showToast(`Error updating transaction: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    editModal.addEventListener('click', (e) => {
        const clearBtn = e.target.closest('.clear-limit-btn');
        if (!clearBtn) return;
        const target = clearBtn.dataset.target;
        if (target === 'up') {
            document.getElementById('edit-limit-price-up').value = '';
            document.getElementById('edit-limit-up-expiration').value = '';
        } else if (target === 'down') {
            document.getElementById('edit-limit-price-down').value = '';
            document.getElementById('edit-limit-down-expiration').value = '';
        }
    });

    addExchangeBtn.addEventListener('click', async () => {
        const name = newExchangeNameInput.value.trim();
        if (!name) return showToast('Exchange name cannot be empty.', 'error');
        try {
            const res = await fetch('/api/exchanges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
            const newExchange = await res.json();
            state.allExchanges.push(newExchange);
            state.allExchanges.sort((a, b) => a.name.localeCompare(b.name));
            newExchangeNameInput.value = '';
            renderExchangeManagementList();
            
            // We need to re-populate all dropdowns after an add
            const freshExchanges = await fetch('/api/exchanges');
            state.allExchanges = await freshExchanges.json();
            const event = new CustomEvent('exchangesUpdated');
            document.dispatchEvent(event);

            showToast('Exchange added!', 'success');
        } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
    });

    exchangeList.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const id = li.dataset.id;
        const nameSpan = li.querySelector('.exchange-name');
        const nameInput = li.querySelector('.edit-exchange-input');
        const editBtn = li.querySelector('.edit-exchange-btn');
        const saveBtn = li.querySelector('.save-exchange-btn');

        if (e.target.matches('.edit-exchange-btn')) {
            nameSpan.style.display = 'none';
            editBtn.style.display = 'none';
            nameInput.style.display = 'inline-block';
            saveBtn.style.display = 'inline-block';
            nameInput.focus();
        } else if (e.target.matches('.save-exchange-btn')) {
            const newName = nameInput.value.trim();
            if (!newName) return showToast('Exchange name cannot be empty.', 'error');
            try {
                const res = await fetch(`/api/exchanges/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                
                // We need to re-populate all dropdowns after an edit
                const freshExchanges = await fetch('/api/exchanges');
                state.allExchanges = await freshExchanges.json();
                const event = new CustomEvent('exchangesUpdated');
                document.dispatchEvent(event);

                await refreshLedger();
                renderExchangeManagementList();
                showToast('Exchange updated!', 'success');
            } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
        } else if (e.target.matches('.delete-exchange-btn')) {
            showConfirmationModal('Delete Exchange?', 'This cannot be undone.', async () => {
                try {
                    const res = await fetch(`/api/exchanges/${id}`, { method: 'DELETE' });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                    
                    // We need to re-populate all dropdowns after a delete
                    const freshExchanges = await fetch('/api/exchanges');
                    state.allExchanges = await freshExchanges.json();
                    const event = new CustomEvent('exchangesUpdated');
                    document.dispatchEvent(event);
                    
                    renderExchangeManagementList();
                    showToast('Exchange deleted.', 'success');
                } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
            });
        }
    });

    const addSnapshotForm = document.getElementById('add-snapshot-form');
    if (addSnapshotForm) {
        addSnapshotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const snapshot = {
                snapshot_date: document.getElementById('snapshot-date').value,
                exchange: document.getElementById('snapshot-exchange').value,
                value: parseFloat(document.getElementById('snapshot-value').value)
            };
            try {
                const res = await fetch('/api/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                
                const freshSnapshots = await fetch('/api/snapshots');
                state.allSnapshots = await freshSnapshots.json();
                renderSnapshotsPage(state);
                
                addSnapshotForm.reset();
                showToast('Snapshot saved!', 'success');
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    const snapshotsTable = document.getElementById('snapshots-table');
    if (snapshotsTable) {
        snapshotsTable.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-snapshot-btn');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                showConfirmationModal('Delete Snapshot?', 'This cannot be undone.', async () => {
                     try {
                        const res = await fetch(`/api/snapshots/${id}`, { method: 'DELETE' });
                        if (!res.ok) { const err = await res.json(); throw new Error(err.message); }

                        state.allSnapshots = state.allSnapshots.filter(s => s.id != id);
                        renderSnapshotsPage(state);

                        showToast('Snapshot deleted.', 'success');
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                    }
                });
            }
        });
    }

    document.querySelectorAll('.modal .close-button').forEach(btn => 
        btn.addEventListener('click', e => 
            e.target.closest('.modal').classList.remove('visible')
        )
    );

    window.addEventListener('click', e => { 
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('visible');
        }
    });

    document.getElementById('refresh-prices-btn').addEventListener('click', () => 
        updateAllPrices(state.activityMap, state.priceCache)
    );
}

