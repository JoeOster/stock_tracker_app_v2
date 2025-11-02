// public/ui/renderers/_dashboard_data.js
// ... (imports are unchanged) ...
import { state, updateState } from '../../state.js';
import { fetchPositions } from '../../api/reporting-api.js';
import { updatePricesForView } from '../../api/price-api.js';
import { getCurrentESTDateString } from '../datetime.js';
import { showToast } from '../helpers.js';

// ... (PROXIMITY_THRESHOLD_PERCENT and calculateLotMetrics are unchanged) ...
const PROXIMITY_THRESHOLD_PERCENT = 5;
function calculateLotMetrics(lot, currentPrice) {
  const metrics = {
    currentValue: 0,
    costOfRemaining: lot.quantity_remaining * lot.cost_basis,
    unrealizedPL: 0,
    unrealizedPercent: 0,
    proximity: null,
  };
  if (currentPrice !== null && currentPrice > 0) {
    metrics.currentValue = lot.quantity_remaining * currentPrice;
    metrics.unrealizedPL = metrics.currentValue - metrics.costOfRemaining;
    metrics.unrealizedPercent =
      metrics.costOfRemaining !== 0
        ? (metrics.unrealizedPL / metrics.costOfRemaining) * 100
        : 0;
    if (lot.limit_price_up && currentPrice > 0) {
      const diffUp = lot.limit_price_up - currentPrice;
      const percentDiffUp = (diffUp / currentPrice) * 100;
      if (percentDiffUp <= PROXIMITY_THRESHOLD_PERCENT && percentDiffUp >= 0) {
        metrics.proximity = 'up';
      }
    }
    if (!metrics.proximity && lot.limit_price_down && currentPrice > 0) {
      const diffDown = currentPrice - lot.limit_price_down;
      const percentDiffDown = (diffDown / currentPrice) * 100;
      if (
        percentDiffDown <= PROXIMITY_THRESHOLD_PERCENT &&
        percentDiffDown >= 0
      ) {
        metrics.proximity = 'down';
      }
    }
  } else {
    metrics.currentValue = metrics.costOfRemaining;
    metrics.unrealizedPL = 0;
    metrics.unrealizedPercent = 0;
  }
  return metrics;
}

/**
 * Fetches position data and current prices. Stores raw lots in state.
 * @returns {Promise<any[]>} A promise resolving to the array of open lots, or empty array on error.
 */
export async function loadAndPrepareDashboardData() {
  // ... (this function is unchanged) ...
  showToast('Loading dashboard data...', 'info', 1500);
  try {
    const today = getCurrentESTDateString();
    const positionData = await fetchPositions(
      today,
      String(state.selectedAccountHolderId)
    );
    const openLots = positionData?.endOfDayPositions || [];

    updateState({ dashboardOpenLots: openLots }); // Store raw lots

    if (openLots.length > 0) {
      const tickers = [...new Set(openLots.map((lot) => lot.ticker))];
      await updatePricesForView(today, tickers); // Populates state.priceCache
    }
    return openLots;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // @ts-ignore
    showToast(`Error loading positions: ${error.message}`, 'error');
    updateState({ dashboardOpenLots: [] }); // Clear state on error
    return []; // Return empty array to signal failure upstream
  }
}

/**
 * --- THIS IS THE FIX ---
 * Processes raw lot data: calculates metrics, filters, groups by Ticker/Exchange, sorts, and calculates totals.
 * @param {any[]} openLots - Raw array of open lots.
 * @param {string} tickerFilter - Uppercase ticker filter string.
 * @param {string} exchangeFilter - Exchange filter string.
 * @param {string} sortValue - Sort criteria string.
 * @returns {{aggregatedLots: any[], individualLotsForTable: any[], totalUnrealizedPL: number, totalCurrentValue: number}}
 */
export function processFilterAndSortLots(
  openLots,
  tickerFilter,
  exchangeFilter,
  sortValue
) {
  // --- END FIX ---
  let totalUnrealizedPL = 0;
  let totalCurrentValue = 0;
  const aggregationMap = new Map();

  const individualLotsForTable = openLots
    .map((lot) => {
      const priceData = state.priceCache.get(lot.ticker);
      const currentPriceValue =
        priceData && typeof priceData.price === 'number'
          ? priceData.price
          : null;
      const metrics = calculateLotMetrics(lot, currentPriceValue);

      const processedLot = { ...lot, ...metrics, priceData }; // Combine lot, metrics, and priceData

      totalUnrealizedPL += metrics.unrealizedPL;
      totalCurrentValue += metrics.currentValue;

      // --- Aggregation Logic ---
      const aggKey = `${lot.ticker}|${lot.exchange}`;
      if (!aggregationMap.has(aggKey)) {
        aggregationMap.set(aggKey, {
          ticker: lot.ticker,
          exchange: lot.exchange,
          totalQuantity: 0,
          totalCurrentValue: 0,
          totalCostBasisValue: 0, // Sum of (cost_basis * quantity_remaining) for weighted avg
          underlyingLots: [],
        });
      }
      const aggEntry = aggregationMap.get(aggKey);
      aggEntry.totalQuantity += lot.quantity_remaining;
      aggEntry.totalCurrentValue += metrics.currentValue;
      aggEntry.totalCostBasisValue += lot.cost_basis * lot.quantity_remaining;
      aggEntry.underlyingLots.push(processedLot); // Store the fully processed individual lot
      // --- End Aggregation ---

      return processedLot; // Return processed individual lot for table view filtering/sorting
    })
    // --- THIS IS THE FIX ---
    .filter(
      (lot) =>
        (!tickerFilter || lot.ticker.toUpperCase().includes(tickerFilter)) &&
        (!exchangeFilter || lot.exchange === exchangeFilter)
    );
  // --- END FIX ---

  // --- Finalize Aggregated Data ---
  const aggregatedLots = Array.from(aggregationMap.values())
    .map((agg) => {
      const weightedAvgCostBasis =
        agg.totalQuantity > 0 ? agg.totalCostBasisValue / agg.totalQuantity : 0;
      const overallUnrealizedPL =
        agg.totalCurrentValue - agg.totalCostBasisValue;
      const overallUnrealizedPercent =
        agg.totalCostBasisValue !== 0
          ? (overallUnrealizedPL / agg.totalCostBasisValue) * 100
          : 0;
      const priceData = state.priceCache.get(agg.ticker); // Get price data for the ticker
      agg.underlyingLots.sort((a, b) =>
        a.purchase_date.localeCompare(b.purchase_date)
      );

      return {
        ...agg,
        weightedAvgCostBasis,
        overallUnrealizedPL,
        overallUnrealizedPercent,
        priceData, // Attach price data to aggregated object
      };
    })
    // --- THIS IS THE FIX ---
    .filter(
      (agg) =>
        (!tickerFilter || agg.ticker.toUpperCase().includes(tickerFilter)) &&
        (!exchangeFilter || agg.exchange === exchangeFilter)
    ); // Also filter aggregated list
  // --- END FIX ---

  // --- Apply Sorting ---
  // (Sort logic is unchanged)
  aggregatedLots.sort((a, b) => {
    switch (sortValue) {
      case 'exchange-asc':
        return (
          a.exchange.localeCompare(b.exchange) ||
          a.ticker.localeCompare(b.ticker)
        );
      case 'gain-desc':
        return (
          b.overallUnrealizedPercent - a.overallUnrealizedPercent ||
          a.ticker.localeCompare(b.ticker)
        );
      case 'loss-asc':
        return (
          a.overallUnrealizedPercent - b.overallUnrealizedPercent ||
          a.ticker.localeCompare(b.ticker)
        );
      case 'ticker-asc':
      default:
        return a.ticker.localeCompare(b.ticker);
    }
  });
  individualLotsForTable.sort((a, b) => {
    switch (sortValue) {
      case 'exchange-asc':
        return (
          a.exchange.localeCompare(b.exchange) ||
          a.ticker.localeCompare(b.ticker)
        );
      case 'proximity-asc': {
        const getProximityPercent = (lot) => {
          let proxPercent = Infinity;
          const currentPriceNum =
            lot.priceData && typeof lot.priceData.price === 'number'
              ? lot.priceData.price
              : null;
          if (currentPriceNum !== null && currentPriceNum > 0) {
            if (lot.limit_price_up && currentPriceNum < lot.limit_price_up) {
              // Check if below limit_up
              proxPercent = Math.min(
                proxPercent,
                ((lot.limit_price_up - currentPriceNum) / currentPriceNum) * 100
              );
            }
            if (
              lot.limit_price_down &&
              currentPriceNum > lot.limit_price_down
            ) {
              // Check if above limit_down
              proxPercent = Math.min(
                proxPercent,
                ((currentPriceNum - lot.limit_price_down) / currentPriceNum) *
                  100
              );
            }
          }
          return proxPercent < 0 ? Infinity : proxPercent; // Treat already passed limits as furthest away
        };
        return (
          getProximityPercent(a) - getProximityPercent(b) ||
          a.ticker.localeCompare(b.ticker)
        );
      }
      case 'gain-desc':
        return (
          b.unrealizedPercent - b.unrealizedPercent ||
          a.ticker.localeCompare(b.ticker)
        );
      case 'loss-asc':
        return (
          a.unrealizedPercent - b.unrealizedPercent ||
          a.ticker.localeCompare(b.ticker)
        );
      case 'ticker-asc':
      default:
        return a.ticker.localeCompare(b.ticker);
    }
  });

  return {
    aggregatedLots,
    individualLotsForTable,
    totalUnrealizedPL,
    totalCurrentValue,
  };
}
