// public/ui/renderers/_watchlist_real.js
/**
 * @file Renderer for the "From Real Trades" sub-tab on the Watchlist page.
 * @module renderers/_watchlist_real
 */

import { state } from '../../state.js';
import { fetchPositions } from '../../api/reporting-api.js';
import { updatePricesForView } from '../../api/price-api.js';
// --- *** THIS IS THE FIX: Import the info-only row renderer *** ---
import { createTableRowHTML_InfoOnly } from './_dashboard_html.js';
// --- *** END FIX *** ---
import { getCurrentESTDateString } from '../datetime.js';

// --- *** THIS IS THE FIX: Copied from _dashboard_data.js *** ---
// This logic is needed to process the raw lot data before rendering
const PROXIMITY_THRESHOLD_PERCENT = 5;
/**
 * @param {any} lot
 * @param {number|null} currentPrice
 */
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
    // Fallback logic for invalid price
    // --- FIX: Use cost basis as fallback value ---
    metrics.currentValue = metrics.costOfRemaining;
    metrics.unrealizedPL = 0;
    metrics.unrealizedPercent = 0;
  }
  return metrics;
}
// --- *** END FIX *** ---

/**
 * Fetches, processes, and renders the "From Real Trades" sub-tab.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
export async function renderRealTickers(panelElement) {
  // The panelElement already contains the table structure from the template
  const tableBody = /** @type {HTMLTableSectionElement} */ (
    document.getElementById('watchlist-real-tbody')
  );

  if (!tableBody) {
    // If the table isn't there, fall back to just writing status in the panel
    panelElement.innerHTML =
      '<h3>Real Positions (Info-Only)</h3><p style="color:red;">Error: Table body #watchlist-real-tbody not found in template.</p>';
    return;
  }

  tableBody.innerHTML =
    '<tr><td colspan="8">Loading open positions...</td></tr>';

  // @ts-ignore
  const holderId = state.selectedAccountHolderId;
  if (!holderId || holderId === 'all') {
    tableBody.innerHTML =
      '<tr><td colspan="8">Please select a specific account holder.</td></tr>';
    return;
  }

  // --- *** THIS IS THE FIX: Fetch, Process, Render *** ---
  try {
    // Step 1: Fetch the open position lots
    const positionData = await fetchPositions(
      getCurrentESTDateString(),
      holderId
    );
    const openPositions = positionData.endOfDayPositions || [];

    if (openPositions.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="8">No open positions found.</td></tr>';
      return;
    }

    // Step 2: Fetch prices for those tickers
    const tickersToFetch = [
      ...new Set(openPositions.map((item) => item.ticker)),
    ];
    if (tickersToFetch.length > 0) {
      await updatePricesForView(getCurrentESTDateString(), tickersToFetch);
    }

    // Step 3: Process the lots (calculate metrics)
    const processedLots = openPositions.map((lot) => {
      const priceData = state.priceCache.get(lot.ticker);
      const currentPriceValue =
        priceData && typeof priceData.price === 'number'
          ? priceData.price
          : null;
      const metrics = calculateLotMetrics(lot, currentPriceValue);
      return { ...lot, ...metrics, priceData }; // Combine lot, metrics, and priceData
    });

    // --- ADDED: Sort by ticker by default ---
    processedLots.sort((a, b) => a.ticker.localeCompare(b.ticker));

    // Step 4: Render the table rows using the imported function
    tableBody.innerHTML = processedLots
      .map((lot) => createTableRowHTML_InfoOnly(lot))
      .join('');
  } catch (error) {
    console.error('Error rendering real tickers watchlist:', error);
    // @ts-ignore
    tableBody.innerHTML = `<tr><td colspan="8">Error loading positions: ${error.message}</td></tr>`;
  }
  // --- *** END FIX *** ---
}
