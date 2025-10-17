// in public/ui/helpers.js
// Version 0.1.21
/**
 * @file Contains general UI helper functions for DOM manipulation and notifications.
 * @module ui/helpers
 */

// FIX: Import the 'formatAccounting' function from its new location.
import { formatAccounting } from './formatters.js';

/**
 * Displays a toast notification message.
 * @param {string} message - The message to display.
 * @param {'info' | 'success' | 'error'} [type='info'] - The type of toast.
 * @param {number} [duration=15000] - The duration in milliseconds to show the toast.
 * @returns {void}
 */
export function showToast(message, type = 'info', duration = 15000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    if(container) container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, duration);
}

/**
 * Displays a confirmation modal dialog.
 * @param {string} title - The title of the modal.
 * @param {string} body - The body text of the modal.
 * @param {function(): void} onConfirm - The callback function to execute when the user confirms.
 * @returns {void}
 */
export function showConfirmationModal(title, body, onConfirm) {
    const confirmModal = document.getElementById('confirm-modal');
    if (!confirmModal) return;
    
    const titleEl = document.getElementById('confirm-modal-title');
    const bodyEl = document.getElementById('confirm-modal-body');
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = body;

    if (!confirmBtn || !cancelBtn) return;

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const closeModal = () => confirmModal.classList.remove('visible');

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal();
    });

    cancelBtn.addEventListener('click', closeModal);
    confirmModal.classList.add('visible');
}

/**
 * Populates the current prices and calculates unrealized P/L for rows in the daily report.
 * @param {Map<string, object>} activityMap - A map of open positions for the current view.
 * @param {Map<string, {price: number|string, timestamp: number}>} priceCache - A cache of recently fetched stock prices.
 */
export function populatePricesFromCache(activityMap, priceCache) {
    const totalValueSummarySpan = document.querySelector('#total-value-summary span');
    let totalPortfolioValue = 0;
    let totalUnrealizedPL = 0;

    activityMap.forEach((lot, key) => {
        const row = document.querySelector(`[data-key="${key}"]`);
        if (!row) return;

        const priceData = priceCache.get(lot.ticker);
        const priceToUse = priceData ? priceData.price : null;

        const priceCell = row.querySelector('.current-price');
        const plCombinedCell = row.querySelector('.unrealized-pl-combined');

        if (priceToUse === 'invalid') {
            if (priceCell) priceCell.innerHTML = `<span class="negative">Invalid</span>`;
            if (plCombinedCell) plCombinedCell.innerHTML = '--';
        } else if (typeof priceToUse === 'number') {
            const currentValue = lot.quantity_remaining * priceToUse;
            const costOfRemaining = lot.quantity_remaining * lot.cost_basis;
            const unrealizedPL = currentValue - costOfRemaining;
            const unrealizedPercent = (costOfRemaining !== 0) ? (unrealizedPL / costOfRemaining) * 100 : 0;

            totalPortfolioValue += currentValue;
            totalUnrealizedPL += unrealizedPL;

            if (priceCell) priceCell.innerHTML = formatAccounting(priceToUse);

            if (plCombinedCell) {
                const plDollarHTML = formatAccounting(unrealizedPL);
                const plPercentHTML = `${unrealizedPercent.toFixed(2)}%`;
                plCombinedCell.innerHTML = `${plDollarHTML} | ${plPercentHTML}`;
                plCombinedCell.className = `numeric unrealized-pl-combined ${unrealizedPL >= 0 ? 'positive' : 'negative'}`;
            }
        } else {
            if (priceCell) priceCell.innerHTML = '--';
            if (plCombinedCell) plCombinedCell.innerHTML = '--';
        }
    });

    if (totalValueSummarySpan) { totalValueSummarySpan.innerHTML = `<strong>${formatAccounting(totalPortfolioValue)}</strong>`; }

    const totalPlCell = document.getElementById('unrealized-pl-total');
    if (totalPlCell) {
        totalPlCell.innerHTML = `<strong>${formatAccounting(totalUnrealizedPL)}</strong>`;
        totalPlCell.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    }
}

/**
 * Sorts a table by a specific column.
 * @param {HTMLTableCellElement} th - The table header element that was clicked.
 * @param {HTMLTableSectionElement} tbody - The tbody element of the table to sort.
 * @returns {void}
 */
export function sortTableByColumn(th, tbody) {
    const column = th.cellIndex;
    const dataType = th.dataset.type || 'string';
    let direction = th.classList.contains('sorted-asc') ? 'desc' : 'asc';
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const valA = a.cells[column]?.textContent.trim() || '';
        const valB = b.cells[column]?.textContent.trim() || '';

        if (dataType === 'numeric') {
            const numA = parseFloat(valA.replace(/[$,\(\)]/g, '')) || 0;
            const numB = parseFloat(valB.replace(/[$,\(\)]/g, '')) || 0;
            return direction === 'asc' ? numA - numB : numB - numA;
        } else {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
    });

    const allHeaders = th.parentElement.children;
    for (const header of allHeaders) {
        header.classList.remove('sorted-asc', 'sorted-desc');
    }
    th.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    tbody.append(...rows);
}