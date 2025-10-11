// public/event-listeners.js - v2.16 (Complete with Cancel Button Fixes)
import { switchView, refreshLedger, saveSettings, state, sortTableByColumn, fetchAndRenderExchanges, renderExchangeManagementList, fetchAndPopulateAccountHolders, renderAccountHolderManagementList } from './app-main.js';
import { updateAllPrices } from './api.js';
import { showToast, getCurrentESTDateString, showConfirmationModal, formatAccounting } from './ui/helpers.js';
import { renderLedger, renderSnapshotsPage, renderOrdersPage  } from './ui/renderers.js';

export function initializeEventListeners() {
    // --- Define all major elements once ---
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
    const globalHolderFilter = document.getElementById('global-account-holder-filter');
    const accountHolderList = document.getElementById('account-holder-list');
    const addAccountHolderBtn = document.getElementById('add-account-holder-btn');
    const newAccountHolderNameInput = document.getElementById('new-account-holder-name');
    // --- NEW: Alerts Table Actions (v2.18) ---
    const alertsTable = document.getElementById('alerts-table');
    if (alertsTable) {
        alertsTable.addEventListener('click', async (e) => {
            const yesButton = e.target.closest('.alert-yes-btn');
            const noButton = e.target.closest('.alert-no-btn');
            const pendingButton = e.target.closest('.alert-pending-btn');

            if (yesButton) {
                const pendingOrderId = yesButton.dataset.pendingOrderId;
                const order = state.pendingOrders.find(o => o.id == pendingOrderId);

                if (!order) {
                    // If the order isn't in the state, refresh the orders list first
                    const { renderOrdersPage } = await import('./ui/renderers.js');
                    await renderOrdersPage(); 
                    const freshOrder = state.pendingOrders.find(o => o.id == pendingOrderId);
                    if (!freshOrder) return showToast('Could not find original order details.', 'error');
                }
                
                // Trigger the "Mark as Filled" button's logic by finding it and simulating a click
                const fillButton = document.querySelector(`.fill-order-btn[data-id="${pendingOrderId}"]`);
                if (fillButton) {
                    fillButton.click();
                } else {
                     // Fallback if the button isn't currently rendered (e.g., user is not on Orders page)
                     showToast("Please go to the 'Orders' tab and click 'Mark as Filled' for this item.", 'info');
                }
            } 
            else if (noButton) {
                const notificationId = noButton.dataset.notificationId;
                try {
                    const response = await fetch(`/api/orders/notifications/${notificationId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'DISMISSED' })
                    });
                    if (!response.ok) throw new Error('Failed to dismiss alert.');
                    showToast('Alert dismissed.', 'info');
                    await renderAlertsPage(); // Refresh the alerts list
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
            else if (pendingButton) {
                const notificationId = pendingButton.dataset.notificationId;
                try {
                    const response = await fetch(`/api/orders/notifications/${notificationId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'PENDING' })
                    });
                    if (!response.ok) throw new Error('Failed to update alert.');
                    showToast('Alert marked for later review.', 'info');
                    await renderAlertsPage(); // Refresh the alerts list
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    }
    // --- Global Filter Listener ---
    if (globalHolderFilter) {
        globalHolderFilter.addEventListener('change', (e) => {
            state.selectedAccountHolderId = e.target.value;
            switchView(state.currentView.type, state.currentView.value);
        });
    }
    
    // --- Main View/Tab Navigation ---
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('master-tab')) {
                const viewType = e.target.dataset.viewType;
                const viewValue = e.target.dataset.viewValue;
                if (viewType) {
                    switchView(viewType, viewValue || null);
                }
            }
        });
    }

    // --- Custom Date Picker ---
    const customDatePicker = document.getElementById('custom-date-picker');
    if(customDatePicker) {
        customDatePicker.addEventListener('change', (e) => {
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
    }

    // --- Ledger Filter Listeners ---
    const ledgerFilterTicker = document.getElementById('ledger-filter-ticker');
    const ledgerFilterStart = document.getElementById('ledger-filter-start');
    const ledgerFilterEnd = document.getElementById('ledger-filter-end');
    const ledgerClearFiltersBtn = document.getElementById('ledger-clear-filters-btn');

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

    // --- Add Transaction Form ---
// In public/event-listeners.js
if (transactionForm) {
    // Auto-calculate suggested limits when the price is entered
    const priceInput = document.getElementById('price');
    priceInput.addEventListener('change', () => {
        const price = parseFloat(priceInput.value);
        if (!price || isNaN(price)) return;

        const takeProfitPercent = state.settings.takeProfitPercent;
        const stopLossPercent = state.settings.stopLossPercent;

        const suggestedProfit = price * (1 + takeProfitPercent / 100);
        const suggestedLoss = price * (1 - stopLossPercent / 100);

        document.getElementById('add-limit-price-up').value = suggestedProfit.toFixed(2);
        document.getElementById('add-limit-price-down').value = suggestedLoss.toFixed(2);
    });

    // Handle the form submission
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- NEW VALIDATION LOGIC ---
        const isProfitLimitSet = document.getElementById('set-profit-limit-checkbox').checked;
        const profitExpirationDate = document.getElementById('add-limit-up-expiration').value;
        if (isProfitLimitSet && !profitExpirationDate) {
            showToast('A Take Profit limit requires an expiration date.', 'error');
            return; // Stop submission
        }

        const isLossLimitSet = document.getElementById('set-loss-limit-checkbox').checked;
        const lossExpirationDate = document.getElementById('add-limit-down-expiration').value;
        if (isLossLimitSet && !lossExpirationDate) {
            showToast('A Stop Loss limit requires an expiration date.', 'error');
            return; // Stop submission
        }
        // --- END OF VALIDATION ---

        const transaction = {
            account_holder_id: document.getElementById('add-tx-account-holder').value,
            transaction_date: document.getElementById('transaction-date').value,
            ticker: document.getElementById('ticker').value.toUpperCase().trim(),
            exchange: document.getElementById('exchange').value,
            transaction_type: document.getElementById('transaction-type').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            price: parseFloat(document.getElementById('price').value),
            
            // --- NEW CONDITIONAL SAVING LOGIC ---
            limit_price_up: isProfitLimitSet ? parseFloat(document.getElementById('add-limit-price-up').value) : null,
            limit_up_expiration: isProfitLimitSet ? profitExpirationDate : null,
            limit_price_down: isLossLimitSet ? parseFloat(document.getElementById('add-limit-price-down').value) : null,
            limit_down_expiration: isLossLimitSet ? lossExpirationDate : null
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
            transactionForm.reset(); // This will also clear the limit fields
            document.getElementById('transaction-date').value = getCurrentESTDateString();
            await refreshLedger();
        } catch (error) {
            showToast(`Failed to log transaction: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
}
    
    // --- Settings Modal and Associated Actions ---
    if(settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            renderExchangeManagementList();
            renderAccountHolderManagementList();
            settingsModal.classList.add('visible');
        });
    }
    
    if(saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings();
            settingsModal.classList.remove('visible');
        });
    }
    
    const themeSelector = document.getElementById('theme-selector');
    const fontSelector = document.getElementById('font-selector');
    if(themeSelector) {
        themeSelector.addEventListener('change', saveSettings);
    }
    if(fontSelector) {
        fontSelector.addEventListener('change', saveSettings);
    }

    // --- CSV Import ---
    /*
    if(importCsvBtn) {
        importCsvBtn.addEventListener('click', () => {
            const file = csvFileInput.files[0];
            const accountHolderId = document.getElementById('import-account-holder').value;
            if (!file) { return showToast('Please select a CSV file.', 'error'); }
            if (!accountHolderId) { return showToast('Please select an account holder to import into.', 'error'); }

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
                        const response = await fetch('/api/transactions/batch', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ transactions, account_holder_id: accountHolderId }) 
                        });
                        if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
                        showToast(`${transactions.length} transactions imported!`, 'success');
                        csvFileInput.value = '';
                        await refreshLedger();
                    } catch (error) { showToast(`Import failed: ${error.message}`, 'error'); }
                } else { showToast('No valid transactions found.', 'info'); }
            };
            reader.readAsText(file);
        });
    }
    */
    // --- Table Sorting ---
    const ledgerTable = document.querySelector('#ledger-table');
    if(ledgerTable) {
        ledgerTable.querySelector('thead').addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (!th) return;
            const newColumn = th.dataset.sort;
            let newDirection = 'asc';
            if (state.ledgerSort.column === newColumn && state.ledgerSort.direction === 'asc') { newDirection = 'desc'; }
            state.ledgerSort = { column: newColumn, direction: newDirection };
            renderLedger(state.allTransactions, state.ledgerSort);
        });
    }
    
    // --- Delegated Listeners for Dynamic Content (Daily Report / Ledger) ---
    const dailyReportContainer = document.getElementById('daily-report-container');
// In public/event-listeners.js, replace the existing block with this one
if(dailyReportContainer) {
    dailyReportContainer.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const thead = th.closest('thead');
            let tbody = thead.nextElementSibling;
            while (tbody && tbody.tagName !== 'TBODY') { tbody = tbody.nextElementSibling; }
            if (tbody) { sortTableByColumn(th, tbody); }
            return;
        }

        // --- ADDED FOR v2.17: Handle clicks on the table row itself ---
        const row = e.target.closest('#positions-summary-body tr');
        if (row && !e.target.closest('button')) {
            const lotKey = row.dataset.key;
            if (!lotKey) return;

            const lotData = state.activityMap.get(lotKey); // Get lot data
            const priceData = state.priceCache.get(lotData.ticker); // Get price data

            if (!lotData) return;

            // Perform calculations based on settings
            const costBasis = lotData.cost_basis;
            const takeProfitPercent = state.settings.takeProfitPercent;
            const stopLossPercent = state.settings.stopLossPercent;

            const suggestedProfit = costBasis * (1 + takeProfitPercent / 100);
            const suggestedLoss = costBasis * (1 - stopLossPercent / 100);

            // Populate Modal
            document.getElementById('advice-modal-title').textContent = `${lotData.ticker} Advice`;
            document.getElementById('advice-cost-basis').textContent = formatAccounting(costBasis);
            document.getElementById('advice-current-price').textContent = (priceData && priceData !== 'invalid') ? formatAccounting(priceData) : 'N/A';
            document.getElementById('advice-suggested-profit').textContent = formatAccounting(suggestedProfit);
            document.getElementById('advice-suggested-loss').textContent = formatAccounting(suggestedLoss);
            document.getElementById('advice-profit-percent').textContent = takeProfitPercent;
            document.getElementById('advice-loss-percent').textContent = stopLossPercent;

            const currentLimitUp = lotData.limit_price_up ? `${formatAccounting(lotData.limit_price_up)} by ${lotData.limit_up_expiration || 'N/A'}` : 'Not set';
            document.getElementById('advice-current-limit-up').textContent = currentLimitUp;

            const currentLimitDown = lotData.limit_price_down ? `${formatAccounting(lotData.limit_price_down)} by ${lotData.limit_down_expiration || 'N/A'}` : 'Not set';
            document.getElementById('advice-current-limit-down').textContent = currentLimitDown;

            // Show Modal
            document.getElementById('advice-modal').classList.add('visible');
            return; // Stop further execution
        }
        // --- END OF v2.17 ADDITION ---

        const sellBtn = e.target.closest('.sell-from-lot-btn');
        if (sellBtn) {
            const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
            
            // FIX: Find the original lot data to get the correct account holder ID
            const lotData = state.activityMap.get(`lot-${buyId}`);
            if (!lotData) { return showToast('Error: Could not find original lot data.', 'error'); }
            
            document.getElementById('sell-parent-buy-id').value = buyId;
            document.getElementById('sell-account-holder-id').value = lotData.account_holder_id; // <-- ADD THIS LINE
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
                document.getElementById('edit-account-holder').value = lotData.account_holder_id;
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
}
    
    if(ledgerTable) {
        ledgerTable.querySelector('tbody').addEventListener('click', async (e) => {
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
                    document.getElementById('edit-account-holder').value = tx.account_holder_id;
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
    }
if(sellFromPositionForm) {
    sellFromPositionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sellDetails = {
            // FIX: Read the account holder ID directly from the hidden form field
            account_holder_id: document.getElementById('sell-account-holder-id').value,
            parent_buy_id: document.getElementById('sell-parent-buy-id').value,
            quantity: parseFloat(document.getElementById('sell-quantity').value),
            price: parseFloat(document.getElementById('sell-price').value),
            transaction_date: document.getElementById('sell-date').value,
            ticker: document.getElementById('sell-ticker-display').textContent,
            exchange: document.getElementById('sell-exchange-display').textContent,
            transaction_type: 'SELL',
        };

        // The old check for a null account_holder_id is no longer needed.
        
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
}

    if(editForm) {
        // Listener for the form submission (Save Changes)
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const updatedTransaction = {
                account_holder_id: document.getElementById('edit-account-holder').value,
                ticker: document.getElementById('edit-ticker').value.toUpperCase().trim(),
                exchange: document.getElementById('edit-exchange').value,
                transaction_type: document.getElementById('edit-type').value,
                quantity: parseFloat(document.getElementById('edit-quantity').value),
                price: parseFloat(document.getElementById('edit-price').value),
                transaction_date: document.getElementById('edit-date').value,
                limit_price_up: parseFloat(document.getElementById('edit-limit-price-up').value) || null,
                limit_up_expiration: document.getElementById('edit-limit-up-expiration').value || null,
                limit_price_down: parseFloat(document.getElementById('edit-limit-price-down').value) || null,
                limit_down_expiration: document.getElementById('edit-limit-down-expiration').value || null,
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
                } else if (state.currentView.type === 'date') {
                     await switchView(state.currentView.type, state.currentView.value);
                }
            } catch (error) {
                showToast(`Error updating transaction: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
        
        // Listener for the v2.16 cancel button
        const cancelEditBtn = document.getElementById('edit-modal-cancel-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                editModal.classList.remove('visible');
            });
        }
    }

    if(editModal) {
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
    }

    if(addExchangeBtn) {
        addExchangeBtn.addEventListener('click', async () => {
            const name = newExchangeNameInput.value.trim();
            if (!name) return showToast('Exchange name cannot be empty.', 'error');
            try {
                const res = await fetch('/api/accounts/exchanges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                await fetchAndRenderExchanges(); 
                newExchangeNameInput.value = '';
                renderExchangeManagementList();
                showToast('Exchange added!', 'success');
            } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
        });
    }

    if(exchangeList) {
        exchangeList.addEventListener('click', async (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            
            const nameSpan = li.querySelector('.exchange-name');
            const nameInput = li.querySelector('.edit-exchange-input');
            const editBtn = li.querySelector('.edit-exchange-btn');
            const saveBtn = li.querySelector('.save-exchange-btn');
            const cancelBtn = li.querySelector('.cancel-exchange-btn');
            const deleteBtn = li.querySelector('.delete-exchange-btn');

            if (e.target === editBtn) {
                nameSpan.style.display = 'none';
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                nameInput.style.display = 'inline-block';
                saveBtn.style.display = 'inline-block';
                cancelBtn.style.display = 'inline-block';
                nameInput.focus();
            } 
            else if (e.target === cancelBtn) {
                nameInput.style.display = 'none';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                nameSpan.style.display = 'inline-block';
                editBtn.style.display = 'inline-block';
                deleteBtn.style.display = 'inline-block';
                nameInput.value = nameSpan.textContent;
            }
            else if (e.target === saveBtn) {
                const id = li.dataset.id;
                const newName = nameInput.value.trim();
                if (!newName) return showToast('Exchange name cannot be empty.', 'error');
                try {
                    const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                    await fetchAndRenderExchanges();
                    await refreshLedger();
                    renderExchangeManagementList();
                    showToast('Exchange updated!', 'success');
                } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
            } 
            else if (e.target === deleteBtn) {
                const id = li.dataset.id;
                showConfirmationModal('Delete Exchange?', 'This cannot be undone.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/exchanges/${id}`, { method: 'DELETE' });
                        if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                        await fetchAndRenderExchanges();
                        renderExchangeManagementList();
                        showToast('Exchange deleted.', 'success');
                    } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
                });
            }
        });
    }

    if (addAccountHolderBtn) {
        addAccountHolderBtn.addEventListener('click', async () => {
            const name = newAccountHolderNameInput.value.trim();
            if (!name) return showToast('Account holder name cannot be empty.', 'error');
            try {
                const res = await fetch('/api/accounts/holders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                await fetchAndPopulateAccountHolders();
                newAccountHolderNameInput.value = '';
                renderAccountHolderManagementList();
                showToast('Account holder added!', 'success');
            } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
        });
    }

    if (accountHolderList) {
        accountHolderList.addEventListener('click', async (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            
            const nameSpan = li.querySelector('.holder-name');
            const nameInput = li.querySelector('.edit-holder-input');
            const editBtn = li.querySelector('.edit-holder-btn');
            const saveBtn = li.querySelector('.save-holder-btn');
            const cancelBtn = li.querySelector('.cancel-holder-btn');

            if (e.target.matches('.edit-holder-btn')) {
                nameSpan.style.display = 'none';
                editBtn.style.display = 'none';
                nameInput.style.display = 'inline-block';
                saveBtn.style.display = 'inline-block';
                cancelBtn.style.display = 'inline-block';
                nameInput.focus();
            } else if (e.target.matches('.cancel-holder-btn')) {
                nameInput.style.display = 'none';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                nameSpan.style.display = 'inline-block';
                editBtn.style.display = 'inline-block';
                nameInput.value = nameSpan.textContent;
            } else if (e.target.matches('.save-holder-btn')) {
                const id = li.dataset.id;
                const newName = nameInput.value.trim();
                if (!newName) return showToast('Name cannot be empty.', 'error');
                try {
                    const res = await fetch(`/api/accounts/holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                    await fetchAndPopulateAccountHolders();
                    renderAccountHolderManagementList();
                    showToast('Account holder updated!', 'success');
                } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
            } else if (e.target.matches('.delete-holder-btn')) {
                const id = li.dataset.id;
                showConfirmationModal('Delete Account Holder?', 'This cannot be undone.', async () => {
                    try {
                        const res = await fetch(`/api/accounts/holders/${id}`, { method: 'DELETE' });
                        if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                        await fetchAndPopulateAccountHolders();
                        renderAccountHolderManagementList();
                        showToast('Account holder deleted.', 'success');
                    } catch (error) { showToast(`Error: ${error.message}`, 'error'); }
                });
            }
        });
    }
   // --- NEW: Pending Order Form Submission ---
    const addPendingOrderForm = document.getElementById('add-pending-order-form');
    if (addPendingOrderForm) {
        addPendingOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newOrder = {
                account_holder_id: document.getElementById('pending-order-account-holder').value,
                ticker: document.getElementById('pending-order-ticker').value,
                exchange: document.getElementById('pending-order-exchange').value,
                quantity: parseFloat(document.getElementById('pending-order-quantity').value),
                limit_price: parseFloat(document.getElementById('pending-order-limit-price').value),
                expiration_date: document.getElementById('pending-order-expiration').value || null,
                created_date: getCurrentESTDateString(),
                order_type: 'BUY_LIMIT',
            };

            try {
                const response = await fetch('/api/orders/pending_orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrder)
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Server error');
                }
                showToast('New buy limit order placed!', 'success');
                addPendingOrderForm.reset();
                
                // Refresh the table to show the new order
                if (state.currentView.type === 'orders') {
                    const { renderOrdersPage } = await import('./ui/renderers.js');
                    await renderOrdersPage();
                }
            } catch (error) {
                showToast(`Error placing order: ${error.message}`, 'error');
            }
        });
    }

    // --- NEW: Pending Orders Table Actions (Cancel) ---
// In public/event-listeners.js, replace the entire block

const pendingOrdersTable = document.getElementById('pending-orders-table');
if (pendingOrdersTable) {
    pendingOrdersTable.addEventListener('click', async (e) => {
        // --- FIX: Ensure both button variables are defined here ---
        const cancelButton = e.target.closest('.cancel-order-btn');
        const fillButton = e.target.closest('.fill-order-btn');

        if (cancelButton) {
            const orderId = cancelButton.dataset.id;
            showConfirmationModal('Cancel Order?', 'This will change the order status to CANCELLED.', async () => {
                try {
                    const response = await fetch(`/api/orders/pending/${orderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'CANCELLED' })
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.message || 'Server error');
                    }
                    showToast('Order cancelled.', 'success');
                    
                    const { renderOrdersPage } = await import('./ui/renderers.js');
                    await renderOrdersPage();
                } catch (error) {
                    showToast(`Error cancelling order: ${error.message}`, 'error');
                }
            });
        } 
        else if (fillButton) { // This line will now work correctly
            const orderId = fillButton.dataset.id;
            const order = state.pendingOrders.find(o => o.id == orderId);

            if (!order) {
                showToast('Could not find order details.', 'error');
                return;
            }

            // Populate the modal fields
            document.getElementById('fill-pending-order-id').value = order.id;
            document.getElementById('fill-account-holder-id').value = order.account_holder_id;
            document.getElementById('fill-ticker').value = order.ticker;
            document.getElementById('fill-exchange').value = order.exchange;
            document.getElementById('fill-quantity').value = order.quantity;
            document.getElementById('fill-ticker-display').textContent = order.ticker;
            document.getElementById('fill-limit-price-display').textContent = formatAccounting(order.limit_price);
            
            // Pre-fill editable fields with defaults
            document.getElementById('fill-execution-price').value = order.limit_price;
            document.getElementById('fill-execution-date').value = getCurrentESTDateString();

            // Show the modal
            document.getElementById('confirm-fill-modal').classList.add('visible');
        }
    });
}
    
    const addSnapshotForm = document.getElementById('add-snapshot-form');
    if (addSnapshotForm) {
        addSnapshotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const snapshot = {
                account_holder_id: document.getElementById('snapshot-account-holder').value,
                snapshot_date: document.getElementById('snapshot-date').value,
                exchange: document.getElementById('snapshot-exchange').value,
                value: parseFloat(document.getElementById('snapshot-value').value)
            };
            try {
                const res = await fetch('/api/utility/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                await refreshSnapshots();
                renderSnapshotsPage();
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
                        renderSnapshotsPage();
                        showToast('Snapshot deleted.', 'success');
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                    }
                });
            }
        });
    }

    // Settings Modal Tab logic
    const settingsTabsContainer = document.querySelector('.settings-tabs');
    if (settingsTabsContainer) {
        settingsTabsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('settings-tab')) {
                const tabName = e.target.dataset.tab;

                document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
                e.target.classList.add('active');

                document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));
                document.getElementById(`${tabName}-settings-panel`).classList.add('active');
            }
        });
    }

    // Generic Modal Closing Listeners
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

    const refreshBtn = document.getElementById('refresh-prices-btn');
    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => 
            updateAllPrices(state.activityMap, state.priceCache)
        );
    }
    // Add this new block to public/event-listeners.js

    // --- NEW: "Confirm Fill" Modal Form Submission ---
    const confirmFillForm = document.getElementById('confirm-fill-form');
    if (confirmFillForm) {
        confirmFillForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = confirmFillForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            const pendingOrderId = document.getElementById('fill-pending-order-id').value;

            // Prepare the new transaction object from the form data
            const newTransaction = {
                account_holder_id: document.getElementById('fill-account-holder-id').value,
                ticker: document.getElementById('fill-ticker').value,
                exchange: document.getElementById('fill-exchange').value,
                quantity: parseFloat(document.getElementById('fill-quantity').value),
                price: parseFloat(document.getElementById('fill-execution-price').value),
                transaction_date: document.getElementById('fill-execution-date').value,
                transaction_type: 'BUY'
            };
            
            try {
                // Step 1: Update the pending order's status to 'FILLED'
                const updateRes = await fetch(`/api/orders/pending/${pendingOrderId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'FILLED' })
                });
                if (!updateRes.ok) {
                    const err = await updateRes.json();
                    throw new Error(err.message || 'Failed to update pending order status.');
                }

                // Step 2: Create the new transaction in the ledger
                const createRes = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTransaction)
                });
                if (!createRes.ok) {
                    const err = await createRes.json();
                    // Attempt to roll back the status update if transaction creation fails
                    await fetch(`/api/orders/pending/${pendingOrderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'ACTIVE' })
                    });
                    throw new Error(err.message || 'Failed to create new transaction.');
                }

                // Step 3: If both API calls succeed, update the UI
                document.getElementById('confirm-fill-modal').classList.remove('visible');
                showToast('Order filled and transaction logged!', 'success');
                
                // Refresh the orders page to remove the filled order from the list
                const { renderOrdersPage } = await import('./ui/renderers.js');
                await renderOrdersPage();

            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }
}
