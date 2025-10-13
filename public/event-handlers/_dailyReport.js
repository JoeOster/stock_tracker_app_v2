// public/event-handlers/_dailyReport.js
import { state } from '../state.js';
import { formatAccounting, getCurrentESTDateString, showToast, sortTableByColumn, populatePricesFromCache } from '../ui/helpers.js';
import { renderDailyReport } from '../ui/renderers.js';
import { fetchPositions, fetchDailyPerformance, updatePricesForView } from '../api.js';

/**
 * Loads all data for the daily report page and triggers rendering.
 * @param {string} viewValue - The date for the report.
 */
export async function loadDailyReportPage(viewValue) {
    const performanceSummary = document.getElementById('daily-performance-summary');
    if(performanceSummary) { performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>--</span></h3><h3 id="total-value-summary">Total Open Value: <span>--</span></h3>`; }
    const logBody = document.querySelector('#log-body');
    const summaryBody = document.querySelector('#positions-summary-body');
    if(logBody) logBody.innerHTML = `<tr><td colspan="12">Loading...</td></tr>`;
    if(summaryBody) summaryBody.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;
    
    try {
        // First, get the positions and the previous day's total value.
        const [positionData, perfData] = await Promise.all([
            fetchPositions(viewValue, state.selectedAccountHolderId),
            fetchDailyPerformance(viewValue, state.selectedAccountHolderId)
        ]);

        // Render the main table structure with the data we have so far.
        renderDailyReport(viewValue, state.activityMap, null, positionData);
        
        // Now, gather all the unique tickers from the open positions for a single price fetch.
        const tickersToUpdate = [...new Set(Array.from(state.activityMap.values()).map(lot => lot.ticker))];
        
        // Fetch the live prices for today's open positions.
        await updatePricesForView(viewValue, tickersToUpdate);
        
        // Populate the price cells with the freshly fetched data.
        populatePricesFromCache(state.activityMap, state.priceCache);

        // Now that we have live prices, calculate the current portfolio value on the client-side.
        let currentValue = 0;
        state.activityMap.forEach(lot => {
            const priceToUse = state.priceCache.get(lot.ticker);
            const finalPrice = (typeof priceToUse === 'number') ? priceToUse : lot.cost_basis;
            currentValue += (finalPrice * lot.quantity_remaining);
        });

        const { previousValue } = perfData;
        const dailyChange = currentValue - previousValue;
        const percentage = (previousValue !== 0) ? (dailyChange / previousValue * 100).toFixed(2) : 0;
        
        const performanceSpan = document.querySelector('#daily-performance-summary h3:first-child span');
        if (performanceSpan) {
            const colorClass = dailyChange >= 0 ? 'positive' : 'negative';
            performanceSpan.className = colorClass;
            performanceSpan.innerHTML = `${formatAccounting(dailyChange)} (${percentage}%)`;
        }

    } catch (error) {
        console.error("Failed to load daily report:", error);
        showToast(error.message, 'error');
        renderDailyReport(viewValue, state.activityMap, null, null);
         if(logBody) logBody.innerHTML = `<tr><td colspan="12">Error loading transaction data.</td></tr>`;
         if(summaryBody) summaryBody.innerHTML = '<tr><td colspan="10">Error loading position data.</td></tr>';
    }
}

/**
 * Initializes all event listeners for the Daily Report page.
 * This includes table sorting, and click handlers for opening various modals
 * (Advice, Sell, Edit Limits, Edit Buy).
 * @returns {void}
 */
export function initializeDailyReportHandlers() {
    const dailyReportContainer = document.getElementById('daily-report-container');
    const sellFromPositionModal = document.getElementById('sell-from-position-modal');
    const editModal = document.getElementById('edit-modal');

	if(dailyReportContainer) {
		dailyReportContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);

            // --- Table Sorting Handler ---
			const th = /** @type {HTMLTableCellElement} */ (target.closest('th[data-sort]'));
			if (th) {
				const thead = th.closest('thead');
				let tbody = thead.nextElementSibling;
				// Find the next TBODY element to sort
				while (tbody && tbody.tagName !== 'TBODY') { tbody = tbody.nextElementSibling; }
				if (tbody) { sortTableByColumn(th, /** @type {HTMLTableSectionElement} */ (tbody)); }
				return;
			}

            // --- Advice Modal Handler ---
			const row = target.closest('#positions-summary-body tr');
			if (row && !target.closest('button')) {
				const lotKey = (/** @type {HTMLElement} */ (row)).dataset.key;
				if (!lotKey) return;
				const lotData = state.activityMap.get(lotKey);
				const priceData = state.priceCache.get(lotData.ticker);
				if (!lotData) return;
				const costBasis = lotData.cost_basis;
				const takeProfitPercent = state.settings.takeProfitPercent;
				const stopLossPercent = state.settings.stopLossPercent;
				const suggestedProfit = costBasis * (1 + takeProfitPercent / 100);
				const suggestedLoss = costBasis * (1 - stopLossPercent / 100);
				document.getElementById('advice-modal-title').textContent = `${lotData.ticker} Advice`;
				document.getElementById('advice-cost-basis').textContent = formatAccounting(costBasis);
				document.getElementById('advice-current-price').textContent = (typeof priceData === 'number') ? formatAccounting(priceData) : 'N/A';
				document.getElementById('advice-suggested-profit').textContent = formatAccounting(suggestedProfit);
				document.getElementById('advice-suggested-loss').textContent = formatAccounting(suggestedLoss);
				document.getElementById('advice-profit-percent').textContent = String(takeProfitPercent);
				document.getElementById('advice-loss-percent').textContent = String(stopLossPercent);
				const currentLimitUp = lotData.limit_price_up ? `${formatAccounting(lotData.limit_price_up)} by ${lotData.limit_up_expiration || 'N/A'}` : 'Not set';
				document.getElementById('advice-current-limit-up').textContent = currentLimitUp;
				const currentLimitDown = lotData.limit_price_down ? `${formatAccounting(lotData.limit_price_down)} by ${lotData.limit_down_expiration || 'N/A'}` : 'Not set';
				document.getElementById('advice-current-limit-down').textContent = currentLimitDown;
				document.getElementById('advice-modal').classList.add('visible');
				return;
			}

            // --- Sell From Lot Modal Handler ---
			const sellBtn = /** @type {HTMLElement} */ (target.closest('.sell-from-lot-btn'));
			if (sellBtn) {
				const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
				const lotData = state.activityMap.get(`lot-${buyId}`);
				if (!lotData) { return showToast('Error: Could not find original lot data.', 'error'); }
				(/** @type {HTMLInputElement} */(document.getElementById('sell-parent-buy-id'))).value = buyId;
				(/** @type {HTMLInputElement} */(document.getElementById('sell-account-holder-id'))).value = String(lotData.account_holder_id);
				document.getElementById('sell-ticker-display').textContent = ticker;
				document.getElementById('sell-exchange-display').textContent = exchange;
				const quantityInput = /** @type {HTMLInputElement} */ (document.getElementById('sell-quantity'));
				quantityInput.value = quantity;
				quantityInput.max = quantity;
				(/** @type {HTMLInputElement} */(document.getElementById('sell-date'))).value = getCurrentESTDateString();
				sellFromPositionModal.classList.add('visible');
				return;
			}

            // --- Edit Limit or Edit Buy Modal Handler ---
			const setLimitBtn = /** @type {HTMLElement} */ (target.closest('.set-limit-btn'));
			const editBuyBtn = /** @type {HTMLElement} */ (target.closest('.edit-buy-btn'));
			if (setLimitBtn || editBuyBtn) {
				const id = (setLimitBtn || editBuyBtn).dataset.id;
				const lotData = state.activityMap.get(`lot-${id}`);
				if (lotData) {
					// Populate the shared edit modal with data from the selected lot.
					(/** @type {HTMLInputElement} */(document.getElementById('edit-id'))).value = String(lotData.id);
					(/** @type {HTMLSelectElement} */(document.getElementById('edit-account-holder'))).value = String(lotData.account_holder_id);
					(/** @type {HTMLInputElement} */(document.getElementById('edit-date'))).value = lotData.purchase_date;
					(/** @type {HTMLInputElement} */(document.getElementById('edit-ticker'))).value = lotData.ticker;
					(/** @type {HTMLSelectElement} */(document.getElementById('edit-exchange'))).value = lotData.exchange;
					(/** @type {HTMLSelectElement} */(document.getElementById('edit-type'))).value = 'BUY';
					(/** @type {HTMLInputElement} */(document.getElementById('edit-quantity'))).value = String(lotData.original_quantity);
					(/** @type {HTMLInputElement} */(document.getElementById('edit-price'))).value = String(lotData.cost_basis);
					(/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-up'))).value = String(lotData.limit_price_up || '');
					(/** @type {HTMLInputElement} */(document.getElementById('edit-limit-up-expiration'))).value = lotData.limit_up_expiration || '';
					(/** @type {HTMLInputElement} */(document.getElementById('edit-limit-price-down'))).value = String(lotData.limit_price_down || '');
					(/** @type {HTMLInputElement} */(document.getElementById('edit-limit-down-expiration'))).value = lotData.limit_down_expiration || '';
					
					const coreFields = /** @type {HTMLElement} */ (document.getElementById('edit-core-fields'));
					const limitFields = /** @type {HTMLElement} */ (document.getElementById('edit-limit-fields'));
					const modalTitle = document.getElementById('edit-modal-title');

					// Toggle field visibility based on which button was clicked.
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
}