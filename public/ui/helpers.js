// in public/ui/helpers.js
// Version Updated (Fix total value calc for invalid prices AGAIN)
/**
 * @file Contains general UI helper functions for DOM manipulation and notifications.
 * @module ui/helpers
 */

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
    if (!container) return; // Add null check for container
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // Automatically remove the toast after the duration
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
     }, duration - 500);
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

    const newConfirmBtn = /** @type {HTMLButtonElement} */ (confirmBtn.cloneNode(true)); // Cast for type safety
    confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);

    const closeModal = () => confirmModal.classList.remove('visible');

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal();
    });

    cancelBtn.removeEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal, { once: true });

    confirmModal.classList.add('visible');
}


/**
 * Populates the current prices and calculates unrealized P/L for rows in the daily report or dashboard table.
 * @param {Map<string, object>} dataMap - A map of open positions ('lot-id' -> lotData).
 * @param {Map<string, {price: number|string|null, timestamp: number}>} priceCache - A cache of recently fetched stock prices.
 */
export function populatePricesFromCache(dataMap, priceCache) {
    const totalValueSummarySpan = document.querySelector('#total-value-summary span');
    const dashboardTotalValueSpan = document.querySelector('#dashboard-total-value span');
    let totalPortfolioValue = 0;
    let totalUnrealizedPL = 0;

    dataMap.forEach((lot, key) => {
        const row = document.querySelector(`tr[data-key="${key}"]`);
        if (!row) return;

        const priceData = priceCache.get(lot.ticker);
        const priceToUse = priceData ? priceData.price : null;

        const priceCell = row.querySelector('.current-price');
        const plCombinedCell = row.querySelector('.unrealized-pl-combined');

        let currentValue = 0;
        let costOfRemaining = 0; // Initialize here
        let unrealizedPL = 0;
        let unrealizedPercent = 0;

        // --- FIX: Ensure costOfRemaining is calculated regardless of price validity ---
        costOfRemaining = lot.quantity_remaining * lot.cost_basis;
        // --- END FIX ---


        if (priceToUse === 'invalid' || priceToUse === 'error' || priceToUse === null || priceToUse === undefined) {
            if (priceCell) priceCell.innerHTML = `<span class="negative">${priceToUse === null || priceToUse === undefined ? '--' : (priceToUse === 'invalid' ? 'Invalid' : 'Error')}</span>`;
            if (plCombinedCell) plCombinedCell.innerHTML = '--';

            // Use cost basis as the current value when price is unavailable
            currentValue = costOfRemaining; // Use calculated costOfRemaining
            unrealizedPL = 0;
            unrealizedPercent = 0;

        } else if (typeof priceToUse === 'number') {
            // Valid price found
            currentValue = lot.quantity_remaining * priceToUse;
            // costOfRemaining already calculated above
            unrealizedPL = currentValue - costOfRemaining;
            unrealizedPercent = (costOfRemaining !== 0) ? (unrealizedPL / costOfRemaining) * 100 : 0;

            if (priceCell) priceCell.innerHTML = formatAccounting(priceToUse);

            if (plCombinedCell) {
                const plDollarHTML = formatAccounting(unrealizedPL);
                const plPercentHTML = `${unrealizedPercent.toFixed(2)}%`;
                plCombinedCell.innerHTML = `${plDollarHTML} | ${plPercentHTML}`;
                plCombinedCell.className = `numeric unrealized-pl-combined ${unrealizedPL >= 0 ? 'positive' : 'negative'}`;
            }
        }
        // Always add the calculated current value (or cost basis fallback)
        totalPortfolioValue += currentValue;
        totalUnrealizedPL += unrealizedPL;
    });

    if (totalValueSummarySpan) { totalValueSummarySpan.innerHTML = `<strong>${formatAccounting(totalPortfolioValue)}</strong>`; }
    if (dashboardTotalValueSpan) { dashboardTotalValueSpan.innerHTML = `<strong>${formatAccounting(totalPortfolioValue)}</strong>`; }

    const dailyReportTotalPlCell = document.getElementById('unrealized-pl-total');
    const dashboardTotalPlCell = document.getElementById('dashboard-unrealized-pl-total');

    if (dailyReportTotalPlCell) {
        dailyReportTotalPlCell.innerHTML = `<strong>${formatAccounting(totalUnrealizedPL)}</strong>`;
        dailyReportTotalPlCell.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    }
     if (dashboardTotalPlCell) {
        dashboardTotalPlCell.innerHTML = `<strong>${formatAccounting(totalUnrealizedPL)}</strong>`;
        dashboardTotalPlCell.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    }
}


/**
 * Sorts a table by a specific column.
 * @param {HTMLTableCellElement} th - The table header element that was clicked.
 * @param {HTMLTableSectionElement} tbody - The tbody element of the table to sort.
 * @returns {void}
 */
export function sortTableByColumn(th, tbody) {
    if (!th || !tbody) return;

    const column = th.cellIndex;
    const dataType = th.dataset.type || 'string';
    let currentDirection = '';
    if (th.classList.contains('sorted-asc')) currentDirection = 'asc';
    else if (th.classList.contains('sorted-desc')) currentDirection = 'desc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const dataRows = rows.filter(row => !row.id.endsWith('-no-results'));

    dataRows.sort((a, b) => {
        const cellA = a.cells[column];
        const cellB = b.cells[column];
        const valA = cellA?.textContent?.trim() ?? '';
        const valB = cellB?.textContent?.trim() ?? '';

        if (dataType === 'numeric') {
            const numA = parseFloat(valA.replace(/[$,()\s]/g, '')) || 0;
            const numB = parseFloat(valB.replace(/[$,()\s]/g, '')) || 0;
            return newDirection === 'asc' ? numA - numB : numB - numA;
        } else if (dataType === 'date') {
             const dateA = new Date(valA);
             const dateB = new Date(valB);
             if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
             return newDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }
        else {
            return newDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
    });

    const allHeaders = th.closest('thead')?.querySelectorAll('th[data-sort]') ?? [];
    allHeaders.forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
    });

    th.classList.add(newDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
    tbody.append(...dataRows);
}