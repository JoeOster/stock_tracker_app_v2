// public/event-handlers/_dailyReport.js
import { state, sortTableByColumn } from '../app-main.js';
import { formatAccounting, getCurrentESTDateString, showToast } from '../ui/helpers.js';

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
            // FIX: Cast the found element to HTMLTableCellElement for sortTableByColumn.
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
                // FIX: Use a typeof check to ensure priceData is a number before formatting.
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