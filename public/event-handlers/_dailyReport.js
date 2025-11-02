import { fetchPositions, fetchDailyPerformance } from '../api/reporting-api.js';
import { updatePricesForView } from '../api/price-api.js';
// public/event-handlers/_dailyReport.js
// Version 0.1.24 (Cleaned up logging)
/**
 * @file Loads data for and initializes event handlers for the Daily Report page.
 * @module event-handlers/_dailyReport
 */
import { state } from '../state.js';
import {
  showToast,
  sortTableByColumn,
  populatePricesFromCache,
} from '../ui/helpers.js';
import { renderDailyReportPage } from '../ui/renderers/_dailyReport.js';
import { getCurrentESTDateString } from '../ui/datetime.js';
import { formatAccounting } from '../ui/formatters.js';

// console.log("[DailyReport Module] _dailyReport.js loaded."); // Removed log

/**
 * Loads all data for the daily report page and triggers rendering.
 * @param {string} viewValue - The date for the report.
 */
export async function loadDailyReportPage(viewValue) {
  const performanceSummary = document.getElementById(
    'daily-performance-summary'
  );
  if (performanceSummary) {
    performanceSummary.innerHTML = `<h3>Daily Performance: <span>...</span></h3><h3 id="realized-gains-summary">Realized: <span>--</span></h3><h3 id="total-value-summary">Total Open Value: <span>--</span></h3>`;
  }
  const logBody = document.querySelector('#log-body');
  const summaryBody = document.querySelector('#positions-summary-body');
  if (logBody) logBody.innerHTML = `<tr><td colspan="12">Loading...</td></tr>`;
  if (summaryBody)
    summaryBody.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;

  try {
    const [positionData, perfData] = await Promise.all([
      fetchPositions(viewValue, String(state.selectedAccountHolderId)),
      fetchDailyPerformance(viewValue, String(state.selectedAccountHolderId)),
    ]);
    renderDailyReportPage(viewValue, state.activityMap, null, positionData);

    const tickersToUpdate = [
      ...new Set(
        Array.from(state.activityMap.values()).map((lot) => lot.ticker)
      ),
    ];
    await updatePricesForView(viewValue, tickersToUpdate);
    populatePricesFromCache(state.activityMap, state.priceCache);

    let currentValue = 0;
    state.activityMap.forEach((lot) => {
      const priceData = state.priceCache.get(lot.ticker);
      const priceToUse =
        priceData && typeof priceData.price === 'number'
          ? priceData.price
          : lot.cost_basis;
      currentValue += priceToUse * lot.quantity_remaining;
    });

    const previousValue = perfData?.previousValue ?? 0;
    const dailyChange = currentValue - previousValue;
    const percentage =
      previousValue !== 0 ? (dailyChange / previousValue) * 100 : 0;

    const performanceSpan = document.querySelector(
      '#daily-performance-summary h3:first-child span'
    );
    if (performanceSpan) {
      const colorClass = dailyChange >= 0 ? 'positive' : 'negative';
      performanceSpan.className = colorClass;
      performanceSpan.innerHTML = `${formatAccounting(dailyChange)} (${percentage.toFixed(2)}%)`;
    } else {
      console.warn('[DailyReport] Performance summary span not found.'); // Keep warning
    }
  } catch (error) {
    console.error('[DailyReport] Failed to load daily report:', error); // Keep error log
    showToast(error.message, 'error');
    renderDailyReportPage(viewValue, state.activityMap, null, null);
    if (logBody)
      logBody.innerHTML = `<tr><td colspan="12">Error loading transaction data.</td></tr>`;
    if (summaryBody)
      summaryBody.innerHTML =
        '<tr><td colspan="10">Error loading position data.</td></tr>';
  }
}

/**
 * Initializes all event listeners for the Daily Report page.
 * @returns {void}
 */
export function initializeDailyReportHandlers() {
  try {
    const dailyReportContainer = document.getElementById(
      'daily-report-container'
    );
    const sellFromPositionModal = document.getElementById(
      'sell-from-position-modal'
    );
    const editModal = document.getElementById('edit-modal');
    const adviceModal = document.getElementById('advice-modal');

    if (
      dailyReportContainer &&
      sellFromPositionModal &&
      editModal &&
      adviceModal
    ) {
      dailyReportContainer.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        const th = /** @type {HTMLTableCellElement} */ (
          target.closest('th[data-sort]')
        );
        if (th) {
          const thead = th.closest('thead');
          let tbody = thead.nextElementSibling;
          while (tbody && tbody.tagName !== 'TBODY') {
            tbody = tbody.nextElementSibling;
          }
          if (tbody) {
            sortTableByColumn(
              th,
              /** @type {HTMLTableSectionElement} */ (tbody)
            );
          }
          return;
        }

        const row = target.closest('#positions-summary-body tr');
        if (row && !target.closest('button')) {
          const lotKey = /** @type {HTMLElement} */ (row).dataset.key;
          if (!lotKey) return;
          const lotData = state.activityMap.get(lotKey);
          const priceData = state.priceCache.get(lotData.ticker);
          if (!lotData) {
            console.error(
              '[DailyReport Event] Lot data not found in activityMap for key:',
              lotKey
            ); // Keep error log
            return;
          }

          const adviceTitle = document.getElementById('advice-modal-title');
          const adviceCostBasis = document.getElementById('advice-cost-basis');
          const adviceCurrentPrice = document.getElementById(
            'advice-current-price'
          );
          const adviceSuggestedProfit = document.getElementById(
            'advice-suggested-profit'
          );
          const adviceSuggestedLoss = document.getElementById(
            'advice-suggested-loss'
          );
          const adviceProfitPercent = document.getElementById(
            'advice-profit-percent'
          );
          const adviceLossPercent = document.getElementById(
            'advice-loss-percent'
          );
          const adviceCurrentLimitUp = document.getElementById(
            'advice-current-limit-up'
          );
          const adviceCurrentLimitDown = document.getElementById(
            'advice-current-limit-down'
          );

          if (
            !adviceTitle ||
            !adviceCostBasis ||
            !adviceCurrentPrice ||
            !adviceSuggestedProfit ||
            !adviceSuggestedLoss ||
            !adviceProfitPercent ||
            !adviceLossPercent ||
            !adviceCurrentLimitUp ||
            !adviceCurrentLimitDown
          ) {
            console.error(
              '[DailyReport Event] One or more elements missing inside advice modal.'
            ); // Keep error log
            showToast('UI Error: Cannot display advice details.', 'error');
            return;
          }

          const costBasis = lotData.cost_basis;
          const takeProfitPercent = state.settings.takeProfitPercent;
          const stopLossPercent = state.settings.stopLossPercent;
          const suggestedProfit = costBasis * (1 + takeProfitPercent / 100);
          const suggestedLoss = costBasis * (1 - stopLossPercent / 100);

          adviceTitle.textContent = `${lotData.ticker} Advice`;
          adviceCostBasis.textContent = formatAccounting(costBasis);
          adviceCurrentPrice.textContent =
            priceData && typeof priceData.price === 'number'
              ? formatAccounting(priceData.price)
              : 'N/A';
          adviceSuggestedProfit.textContent = formatAccounting(suggestedProfit);
          adviceSuggestedLoss.textContent = formatAccounting(suggestedLoss);
          adviceProfitPercent.textContent = String(takeProfitPercent);
          adviceLossPercent.textContent = String(stopLossPercent);
          const currentLimitUp = lotData.limit_price_up
            ? `${formatAccounting(lotData.limit_price_up)} by ${lotData.limit_up_expiration || 'N/A'}`
            : 'Not set';
          adviceCurrentLimitUp.textContent = currentLimitUp;
          const currentLimitDown = lotData.limit_price_down
            ? `${formatAccounting(lotData.limit_price_down)} by ${lotData.limit_down_expiration || 'N/A'}`
            : 'Not set';
          adviceCurrentLimitDown.textContent = currentLimitDown;

          adviceModal.classList.add('visible');
          return;
        }

        const sellBtn = /** @type {HTMLElement} */ (
          target.closest('.sell-from-lot-btn')
        );
        if (sellBtn) {
          const { ticker, exchange, buyId, quantity } = sellBtn.dataset;
          const lotData = state.activityMap.get(`lot-${buyId}`);
          if (!lotData) {
            return showToast(
              'Error: Could not find original lot data.',
              'error'
            );
          }

          const sellParentBuyIdInput = /** @type {HTMLInputElement} */ (
            document.getElementById('sell-parent-buy-id')
          );
          const sellAccountHolderIdInput = /** @type {HTMLInputElement} */ (
            document.getElementById('sell-account-holder-id')
          );
          const sellTickerDisplay = document.getElementById(
            'sell-ticker-display'
          );
          const sellExchangeDisplay = document.getElementById(
            'sell-exchange-display'
          );
          const sellQuantityInput = /** @type {HTMLInputElement} */ (
            document.getElementById('sell-quantity')
          );
          const sellDateInput = /** @type {HTMLInputElement} */ (
            document.getElementById('sell-date')
          );

          if (
            !sellParentBuyIdInput ||
            !sellAccountHolderIdInput ||
            !sellTickerDisplay ||
            !sellExchangeDisplay ||
            !sellQuantityInput ||
            !sellDateInput
          ) {
            console.error(
              '[DailyReport Event] One or more elements missing inside sell modal.'
            ); // Keep error log
            showToast('UI Error: Cannot display sell details.', 'error');
            return;
          }

          sellParentBuyIdInput.value = buyId;
          sellAccountHolderIdInput.value = String(lotData.account_holder_id);
          sellTickerDisplay.textContent = ticker;
          sellExchangeDisplay.textContent = exchange;
          sellQuantityInput.value = quantity;
          sellQuantityInput.max = quantity;
          sellDateInput.value = getCurrentESTDateString();

          sellFromPositionModal.classList.add('visible');
          return;
        }

        const setLimitBtn = /** @type {HTMLElement} */ (
          target.closest('.set-limit-btn')
        );
        const editBuyBtn = /** @type {HTMLElement} */ (
          target.closest('.edit-buy-btn')
        );
        if (setLimitBtn || editBuyBtn) {
          const id = (setLimitBtn || editBuyBtn).dataset.id;
          const lotData = state.activityMap.get(`lot-${id}`);
          if (lotData) {
            const editIdInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-id')
            );
            const editAccountHolderSelect = /** @type {HTMLSelectElement} */ (
              document.getElementById('edit-account-holder')
            );
            const editDateInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-date')
            );
            const editTickerInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-ticker')
            );
            const editExchangeSelect = /** @type {HTMLSelectElement} */ (
              document.getElementById('edit-exchange')
            );
            const editTypeSelect = /** @type {HTMLSelectElement} */ (
              document.getElementById('edit-type')
            );
            const editQuantityInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-quantity')
            );
            const editPriceInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-price')
            );
            const editLimitPriceUpInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-price-up')
            );
            const editLimitUpExpirationInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-up-expiration')
            );
            const editLimitPriceDownInput = /** @type {HTMLInputElement} */ (
              document.getElementById('edit-limit-price-down')
            );
            const editLimitDownExpirationInput =
              /** @type {HTMLInputElement} */ (
                document.getElementById('edit-limit-down-expiration')
              );
            const coreFields = /** @type {HTMLElement} */ (
              document.getElementById('edit-core-fields')
            );
            const limitFields = /** @type {HTMLElement} */ (
              document.getElementById('edit-limit-fields')
            );
            const modalTitle = document.getElementById('edit-modal-title');

            if (
              !editIdInput ||
              !editAccountHolderSelect ||
              !editDateInput ||
              !editTickerInput ||
              !editExchangeSelect ||
              !editTypeSelect ||
              !editQuantityInput ||
              !editPriceInput ||
              !editLimitPriceUpInput ||
              !editLimitUpExpirationInput ||
              !editLimitPriceDownInput ||
              !editLimitDownExpirationInput ||
              !coreFields ||
              !limitFields ||
              !modalTitle
            ) {
              console.error(
                '[DailyReport Event] One or more elements missing inside edit modal.'
              ); // Keep error log
              showToast('UI Error: Cannot display edit details.', 'error');
              return;
            }

            editIdInput.value = String(lotData.id);
            editAccountHolderSelect.value = String(lotData.account_holder_id);
            editDateInput.value = lotData.purchase_date;
            editTickerInput.value = lotData.ticker;
            editExchangeSelect.value = lotData.exchange;
            editTypeSelect.value = 'BUY';
            editQuantityInput.value = String(lotData.original_quantity);
            editPriceInput.value = String(lotData.cost_basis);
            editLimitPriceUpInput.value = String(lotData.limit_price_up || '');
            editLimitUpExpirationInput.value =
              lotData.limit_up_expiration || '';
            editLimitPriceDownInput.value = String(
              lotData.limit_price_down || ''
            );
            editLimitDownExpirationInput.value =
              lotData.limit_down_expiration || '';

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
          } else {
            console.error(
              '[DailyReport Event] Lot data not found in activityMap for ID:',
              id
            ); // Keep error log
          }
        }
      });
    } else {
      console.error(
        '[DailyReport Init] Could not find required elements to attach listener.'
      ); // Keep error log
    }
  } catch (error) {
    console.error(
      '[DailyReport Init] CRITICAL ERROR during initialization:',
      error
    ); // Keep error log
  }
}
