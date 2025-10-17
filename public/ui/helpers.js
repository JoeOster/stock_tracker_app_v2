// in public/ui/helpers.js
// Version 0.1.19
/**
 * @file Contains UI helper functions for formatting, notifications, and DOM manipulation.
 * @module ui/helpers
 */

/**
 * Formats a number for display as a quantity, removing trailing zeros for whole numbers.
 * @param {number | null | undefined} number - The number to format.
 * @returns {string} The formatted quantity string.
 */
export function formatQuantity(number) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    const options = { maximumFractionDigits: 5 };
    if (number % 1 === 0) { options.maximumFractionDigits = 0; }
    return number.toLocaleString('en-US', options);
}

/**
 * Formats a number into an accounting-style string (e.g., $1,234.56 or ($1,234.56) for negative).
 * @param {number | null | undefined} number - The number to format.
 * @param {boolean} [isCurrency=true] - Whether to include a currency symbol.
 * @returns {string} The formatted accounting string.
 */
export function formatAccounting(number, isCurrency = true) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    if (Math.abs(number) < 0.001 && isCurrency) { return isCurrency ? '$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-' : '-'; }
    if (Math.abs(number) < 0.001 && !isCurrency) { return '-'; }
    const isNegative = number < 0;
    const absoluteValue = Math.abs(number);
    let options = { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true };
    if (!isCurrency) { options.maximumFractionDigits = 5; }
    let formattedNumber = absoluteValue.toLocaleString('en-US', options);
    if (isCurrency) { formattedNumber = '$' + formattedNumber; }
    return isNegative ? `(${formattedNumber})` : formattedNumber;
}

/**
 * Displays a toast notification message.
 * @param {string} message - The message to display.
 * @param {'info' | 'success' | 'error'} [type='info'] - The type of toast.
 * @param {number} [duration=10000] - The duration in milliseconds to show the toast.
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
 * Gets the current date as a string in 'YYYY-MM-DD' format for the America/New_York timezone.
 * @returns {string} The current date string.
 */
export function getCurrentESTDateString() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Gets an array of the last N trading days (Mon-Fri) in 'YYYY-MM-DD' format.
 * @param {number} c - The number of trading days to retrieve.
 * @returns {string[]} An array of date strings.
 */
export function getTradingDays(c) {
    let d = [];
    let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z');
    while (d.length < c) {
        const dow = cd.getUTCDay();
        if (dow > 0 && dow < 6) { d.push(cd.toISOString().split('T')[0]); }
        cd.setUTCDate(cd.getUTCDate() - 1);
    }
    return d.reverse();
}

/**
 * Retrieves an array of date strings that have been persisted in localStorage within the last 24 hours.
 * @returns {string[]} An array of active persistent date strings.
 */
export function getActivePersistentDates() {
    let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeDates = persistentDates.filter(d => d.added > twentyFourHoursAgo);
    if (activeDates.length < persistentDates.length) { localStorage.setItem('persistentDates', JSON.stringify(activeDates)); }
    return activeDates.map(d => d.date);
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
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-body').textContent = body;
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

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

        // FIX: Access the 'price' property from the priceCache object.
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
 * Gets the current status of the US stock market.
 * @returns {'Pre-Market' | 'Regular Hours' | 'After-Hours' | 'Closed'} The current market status.
 */
export function getUSMarketStatus() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const dayOfWeek = estTime.getDay();
    const hour = estTime.getHours();
    const minute = estTime.getMinutes();

    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;
    if (!isWeekday) {
        return 'Closed';
    }

    if (hour < 4) return 'Closed';
    if (hour < 9 || (hour === 9 && minute < 30)) return 'Pre-Market';
    if (hour < 16) return 'Regular Hours';
    if (hour < 20) return 'After-Hours';

    return 'Closed';
}

/**
 * Gets the date string for the most recent trading day (Mon-Fri).
 * @returns {string} The date string in YYYY-MM-DD format.
 */
export function getMostRecentTradingDay() {
    let checkDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    let dayOfWeek = checkDate.getDay();

    if (dayOfWeek === 0) {
        checkDate.setDate(checkDate.getDate() - 2);
    }
    else if (dayOfWeek === 6) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return checkDate.toLocaleDateString('en-CA');
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