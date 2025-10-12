// public/ui/renderers/_ledger.js
import { state } from '../../app-main.js';
import { formatQuantity, formatAccounting } from '../helpers.js';

export function renderLedger(allTransactions, ledgerSort) {
    const ledgerTableBody = /** @type {HTMLTableSectionElement} */ (document.querySelector('#ledger-table tbody'));
    const summaryContainer = document.getElementById('ledger-summary-container');
    if(!ledgerTableBody) return;

    if (allTransactions.length === 0) {
        ledgerTableBody.innerHTML = '<tr><td colspan="9">No transactions have been logged for this account holder.</td></tr>';
        if (summaryContainer) summaryContainer.innerHTML = '';
        return;
    }
    
    const ledgerFilterTicker = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-ticker'));
    const ledgerFilterStart = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-start'));
    const ledgerFilterEnd = /** @type {HTMLInputElement} */ (document.getElementById('ledger-filter-end'));
    
    const filterTicker = ledgerFilterTicker.value.toUpperCase().trim();
    const filterStart = ledgerFilterStart.value;
    const filterEnd = ledgerFilterEnd.value;

    const filteredTransactions = allTransactions.filter(tx => {
        const tickerMatch = filterTicker ? tx.ticker.toUpperCase().includes(filterTicker) : true;
        const startDateMatch = filterStart ? tx.transaction_date >= filterStart : true;
        const endDateMatch = filterEnd ? tx.transaction_date <= filterEnd : true;
        return tickerMatch && startDateMatch && endDateMatch;
    });

    if (summaryContainer) {
        let buyCount = 0;
        let sellCount = 0;
        let totalCost = 0;
        let totalProceeds = 0;

        filteredTransactions.forEach(tx => {
            if (tx.transaction_type === 'BUY') {
                buyCount++;
                totalCost += tx.quantity * tx.price;
            } else if (tx.transaction_type === 'SELL') {
                sellCount++;
                totalProceeds += tx.quantity * tx.price;
            }
        });

        summaryContainer.innerHTML = `
            <div><h4>Buy Transactions</h4><p>${buyCount}</p></div>
            <div><h4>Sell Transactions</h4><p>${sellCount}</p></div>
            <div><h4>Total Cost</h4><p>${formatAccounting(totalCost)}</p></div>
            <div><h4>Total Proceeds</h4><p>${formatAccounting(totalProceeds)}</p></div>
        `;
    }

    filteredTransactions.sort((a, b) => {
        const col = ledgerSort.column;
        const dir = ledgerSort.direction === 'asc' ? 1 : -1;
        if (col === 'quantity' || col === 'price') return (a[col] - b[col]) * dir;
        return a[col].localeCompare(b[col]) * dir;
    });

    document.querySelectorAll('#ledger-table thead th[data-sort]').forEach(th => {
        const headerElement = /** @type {HTMLElement} */ (th);
        headerElement.classList.remove('sorted-asc', 'sorted-desc');
        if (headerElement.dataset.sort === ledgerSort.column) { 
            headerElement.classList.add(ledgerSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc'); 
        }
    });

    ledgerTableBody.innerHTML = '';
    if (filteredTransactions.length === 0) {
        ledgerTableBody.innerHTML = '<tr><td colspan="9">No transactions match the current filters.</td></tr>';
        if (summaryContainer) summaryContainer.innerHTML = '';
        return;
    }
    let lastDate = null;
    filteredTransactions.forEach(tx => {
        const row = ledgerTableBody.insertRow();
        if (tx.transaction_date !== lastDate && lastDate !== null) {
            row.classList.add('new-date-group');
        }

        let limitUpText = tx.limit_price_up ? formatAccounting(tx.limit_price_up) : '';
        if (tx.limit_up_expiration) limitUpText += ` (${tx.limit_up_expiration})`;

        let limitDownText = tx.limit_price_down ? formatAccounting(tx.limit_price_down) : '';
        if (tx.limit_down_expiration) limitDownText += ` (${tx.limit_down_expiration})`;
        
        row.innerHTML = `
            <td>${tx.transaction_date}</td>
            <td>${tx.ticker}</td>
            <td>${tx.exchange}</td>
            <td>${tx.transaction_type}</td>
            <td class="numeric">${formatQuantity(tx.quantity)}</td>
            <td class="numeric">${formatAccounting(tx.price)}</td>
            <td class="numeric">${limitUpText}</td>
            <td class="numeric">${limitDownText}</td>
            <td class="actions-cell">
                <button class="modify-btn" data-id="${tx.id}">Edit</button>
                <button class="delete-btn" data-id="${tx.id}">Delete</button>
            </td>`;
        
        lastDate = tx.transaction_date;
    });
}