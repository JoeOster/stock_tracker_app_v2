// public/ui/renderers/_dashboard.js
// Version Refactored (Task X.16 + History Button X.4 + Aggregation Logic X.5 - Fixed comment)
/**
 * @file Renderer for the Dashboard page (Open Positions). Includes refactored structure and aggregation logic.
 * @module renderers/_dashboard
 */

import { state, updateState } from '../../state.js';
import { fetchPositions, updatePricesForView } from '../../api.js';
import { formatAccounting, formatQuantity } from '../formatters.js';
import { getCurrentESTDateString } from '../datetime.js';
import { showToast } from '../helpers.js';

// --- Configuration ---
const PROXIMITY_THRESHOLD_PERCENT = 5; // e.g., Show indicator if within 5% of limit

// --- Helper: Map Exchange Name to Logo ---
const genericLogoPath = '/images/logos/generic-exchange.png'; // Placeholder path
const exchangeLogoMap = {
    'Fidelity': '/images/logos/image_fidelity.jpg',
    'Robinhood': '/images/logos/image_robinhood.jpg',
    'E-Trade': '/images/logos/image_etrade.jpg',
    'Other': genericLogoPath // Fallback
};
const defaultLogo = genericLogoPath;

// --- Helper Functions (Calculation & HTML Generation) ---

/**
 * Calculates unrealized P/L and limit proximity for a position lot.
 * @param {object} lot - The position lot data.
 * @param {number|null} currentPrice - The current market price (validated as number or null).
 * @returns {{currentValue: number, costOfRemaining: number, unrealizedPL: number, unrealizedPercent: number, proximity: 'up'|'down'|null}}
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
        metrics.unrealizedPercent = (metrics.costOfRemaining !== 0) ? (metrics.unrealizedPL / metrics.costOfRemaining) * 100 : 0;

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
            if (percentDiffDown <= PROXIMITY_THRESHOLD_PERCENT && percentDiffDown >= 0) {
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
 * Creates the HTML for a single **individual lot** card (kept for potential future use or alternative view).
 * @param {object} lot - The processed position lot data including metrics and priceData.
 * @returns {string} HTML string for the card.
 */
function createIndividualLotCardHTML(lot) {
    const { priceData, unrealizedPL, unrealizedPercent, currentValue, proximity } = lot;
    const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
    const previousPriceValue = (priceData && typeof priceData.previousPrice === 'number') ? priceData.previousPrice : null;
    const priceStatus = (priceData && typeof priceData.price !== 'number') ? priceData.price : null;

    const plClass = unrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

    let trendIndicator = '<span class="trend-placeholder">-</span>';
    if (currentPriceValue !== null && previousPriceValue !== null) {
        if (currentPriceValue > previousPriceValue) trendIndicator = '<span class="trend-up positive">▲</span>';
        else if (currentPriceValue < previousPriceValue) trendIndicator = '<span class="trend-down negative">▼</span>';
        else trendIndicator = '<span class="trend-flat">→</span>';
    } else if (currentPriceValue !== null) {
        trendIndicator = '<span class="trend-placeholder">-</span>';
    }

    const limitUpText = lot.limit_price_up ? formatAccounting(lot.limit_price_up, false) : '--';
    const limitDownText = lot.limit_price_down ? formatAccounting(lot.limit_price_down, false) : '--';
    const limitsCombinedText = `Up: ${limitUpText} / Down: ${limitDownText}`;

    let proximityIndicator = '';
    if (proximity === 'up') proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
    else if (proximity === 'down') proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';

    let currentPriceDisplay;
    if (currentPriceValue !== null) currentPriceDisplay = formatAccounting(currentPriceValue);
    else if (priceStatus === 'invalid') currentPriceDisplay = '<span class="negative">Invalid</span>';
    else if (priceStatus === 'error') currentPriceDisplay = '<span class="negative">Error</span>';
    else currentPriceDisplay = '--';

    return `
        <div class="position-card individual-lot-card" data-lot-id="${lot.id}">
            <div class="card-header">
                <img src="${logoSrc}" alt="${lot.exchange} logo" class="exchange-logo">
                <h3 class="ticker">${lot.ticker}</h3>
                <small style="margin-left: auto;">Lot ID: ${lot.id}</small>
            </div>
            <div class="card-body">
                <div class="card-stats">
                    <p><span>Qty:</span> <strong>${formatQuantity(lot.quantity_remaining)}</strong></p>
                    <p><span>Basis:</span> <strong>${formatAccounting(lot.cost_basis)}</strong></p>
                    <p><span>Current:</span> <strong>${currentPriceDisplay}</strong></p>
                </div>
                <div class="card-performance">
                    <p><span>P/L:</span> <strong class="unrealized-pl ${plClass}">${formatAccounting(unrealizedPL)}</strong> ${trendIndicator} ${proximityIndicator}</p>
                    <p><span>P/L %:</span> <strong class="unrealized-pl ${plClass}">${unrealizedPercent.toFixed(2)}%</strong></p>
                    <p><span>Value:</span> <strong>${formatAccounting(currentValue)}</strong></p>
                </div>
            </div>
             <div class="card-chart-placeholder">Spark Chart Area</div>
             <div class="card-footer">
                <span class="limits-text" title="${limitsCombinedText}">${limitsCombinedText}</span>
                <div class="action-buttons">
                    <button class="sell-from-lot-btn" data-buy-id="${lot.id}" data-ticker="${lot.ticker}" data-exchange="${lot.exchange}" data-quantity="${lot.quantity_remaining}">Sell</button>
                    <button class="sales-history-btn" data-buy-id="${lot.id}" title="View Sales History">History</button>
                    <button class="set-limit-btn" data-id="${lot.id}">Limits</button>
                    <button class="edit-buy-btn" data-id="${lot.id}">Edit</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for a single **aggregated position** card (NEW for Task X.5).
 * @param {object} aggData - The aggregated data for a ticker/exchange combination.
 * @param {string} aggData.ticker
 * @param {string} aggData.exchange
 * @param {number} aggData.totalQuantity
 * @param {number} aggData.totalCurrentValue
 * @param {number} aggData.totalCostBasisValue
 * @param {number} aggData.weightedAvgCostBasis
 * @param {number} aggData.overallUnrealizedPL
 * @param {number} aggData.overallUnrealizedPercent
 * @param {object|undefined} aggData.priceData - Price data for this ticker.
 * @param {any[]} aggData.underlyingLots - Array of the individual lots making up this aggregate.
 * @returns {string} HTML string for the aggregated card.
 */
function createAggregatedCardHTML(aggData) {
    const {
        ticker, exchange, totalQuantity, totalCurrentValue, weightedAvgCostBasis,
        overallUnrealizedPL, overallUnrealizedPercent, priceData, underlyingLots
    } = aggData;

    const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
    const previousPriceValue = (priceData && typeof priceData.previousPrice === 'number') ? priceData.previousPrice : null;
    const priceStatus = (priceData && typeof priceData.price !== 'number') ? priceData.price : null;

    const plClass = overallUnrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[exchange] || defaultLogo;

    let trendIndicator = '<span class="trend-placeholder">-</span>';
    if (currentPriceValue !== null && previousPriceValue !== null) {
        if (currentPriceValue > previousPriceValue) trendIndicator = '<span class="trend-up positive">▲</span>';
        else if (currentPriceValue < previousPriceValue) trendIndicator = '<span class="trend-down negative">▼</span>';
        else trendIndicator = '<span class="trend-flat">→</span>';
    } else if (currentPriceValue !== null) {
        trendIndicator = '<span class="trend-placeholder">-</span>';
    }

    let currentPriceDisplay;
    if (currentPriceValue !== null) currentPriceDisplay = formatAccounting(currentPriceValue);
    else if (priceStatus === 'invalid') currentPriceDisplay = '<span class="negative">Invalid</span>';
    else if (priceStatus === 'error') currentPriceDisplay = '<span class="negative">Error</span>';
    else currentPriceDisplay = '--';

    const lotsForModal = underlyingLots.map(lot => ({
        id: lot.id,
        purchase_date: lot.purchase_date,
        cost_basis: lot.cost_basis,
        quantity_remaining: lot.quantity_remaining
    }));
    const encodedLots = encodeURIComponent(JSON.stringify(lotsForModal));

    return `
        <div class="position-card aggregated-card" data-ticker="${ticker}" data-exchange="${exchange}">
            <div class="card-header">
                <img src="${logoSrc}" alt="${exchange} logo" class="exchange-logo">
                <h3 class="ticker">${ticker}</h3>
                <small style="margin-left: auto;">(${underlyingLots.length} Lots)</small>
            </div>
            <div class="card-body">
                <div class="card-stats">
                    <p><span>Total Qty:</span> <strong>${formatQuantity(totalQuantity)}</strong></p>
                    <p><span>Avg Basis:</span> <strong>${formatAccounting(weightedAvgCostBasis)}</strong></p>
                    <p><span>Current:</span> <strong>${currentPriceDisplay}</strong></p>
                </div>
                <div class="card-performance">
                    <p><span>Total P/L:</span> <strong class="unrealized-pl ${plClass}">${formatAccounting(overallUnrealizedPL)}</strong> ${trendIndicator}</p>
                    <p><span>Total P/L %:</span> <strong class="unrealized-pl ${plClass}">${overallUnrealizedPercent.toFixed(2)}%</strong></p>
                    <p><span>Total Value:</span> <strong>${formatAccounting(totalCurrentValue)}</strong></p>
                </div>
            </div>
             <div class="card-chart-placeholder">Spark Chart Area</div>
             <div class="card-footer">
                <span class="limits-text">Limits managed per lot</span> {/* <<< REMOVED COMMENT HERE */}
                <div class="action-buttons">
                    <button class="selective-sell-btn" data-ticker="${ticker}" data-exchange="${exchange}" data-total-quantity="${totalQuantity}" data-lots="${encodedLots}">Sell</button>
                    {/* Removed other buttons */}
                </div>
            </div>
        </div>
    `;
}


/**
 * Creates the HTML for a single position table row.
 * @param {object} lot - The processed position lot data including metrics and priceData.
 * @returns {string} HTML string for the table row.
 */
function createTableRowHTML(lot) {
    const { priceData, unrealizedPL, unrealizedPercent, currentValue, proximity } = lot; // Use processed data
    const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
    const previousPriceValue = (priceData && typeof priceData.previousPrice === 'number') ? priceData.previousPrice : null;
    const priceStatus = (priceData && typeof priceData.price !== 'number') ? priceData.price : null;

    const plClass = unrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

    let trendIndicator = '';
    if (currentPriceValue !== null && previousPriceValue !== null) {
        if (currentPriceValue > previousPriceValue) trendIndicator = ' <span class="trend-up positive">▲</span>';
        else if (currentPriceValue < previousPriceValue) trendIndicator = ' <span class="trend-down negative">▼</span>';
        else trendIndicator = ' <span class="trend-flat">→</span>';
    } else if (currentPriceValue !== null) {
        trendIndicator = ' <span class="trend-placeholder">-</span>';
    }

    const limitUpText = lot.limit_price_up ? formatAccounting(lot.limit_price_up, false) : '--';
    const limitDownText = lot.limit_price_down ? formatAccounting(lot.limit_price_down, false) : '--';
    const limitsCombinedText = `${limitUpText} / ${limitDownText}`;

    let proximityIndicator = '';
    if (proximity === 'up') proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
    else if (proximity === 'down') proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';

    let currentPriceDisplay;
    if (currentPriceValue !== null) currentPriceDisplay = formatAccounting(currentPriceValue);
    else if (priceStatus === 'invalid') currentPriceDisplay = '<span class="negative">Invalid</span>';
    else if (priceStatus === 'error') currentPriceDisplay = '<span class="negative">Error</span>';
    else currentPriceDisplay = '--';

    return `
        <tr data-lot-id="${lot.id}" data-key="lot-${lot.id}">
            <td class="reconciliation-checkbox-cell center-align sticky-col"><input type="checkbox" class="reconciliation-checkbox"></td>
            <td class="sticky-col">${lot.ticker}</td>
            <td><img src="${logoSrc}" alt="${lot.exchange}" title="${lot.exchange}" class="exchange-logo-small"> ${lot.exchange}</td>
            <td>${lot.purchase_date}</td>
            <td class="numeric">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric current-price">${currentPriceDisplay}</td>
            <td class="numeric unrealized-pl-combined ${plClass}">
                ${formatAccounting(unrealizedPL)} | ${unrealizedPercent.toFixed(2)}% ${proximityIndicator}${trendIndicator}
            </td>
            <td class="numeric">${limitsCombinedText}</td>
            <td class="center-align actions-cell sticky-col">
                <button class="sell-from-lot-btn" data-buy-id="${lot.id}" data-ticker="${lot.ticker}" data-exchange="${lot.exchange}" data-quantity="${lot.quantity_remaining}">Sell</button>
                <button class="set-limit-btn" data-id="${lot.id}">Limits</button>
                <button class="edit-buy-btn" data-id="${lot.id}">Edit</button>
            </td>
        </tr>
    `;
}

// --- Data Loading and Processing Functions ---

/**
 * Fetches position data and current prices. Stores raw lots in state.
 * @returns {Promise<any[]>} A promise resolving to the array of open lots, or empty array on error.
 */
async function loadAndPrepareDashboardData() {
    showToast('Loading dashboard data...', 'info', 1500);
    try {
        const today = getCurrentESTDateString();
        const positionData = await fetchPositions(today, String(state.selectedAccountHolderId));
        const openLots = positionData?.endOfDayPositions || [];

        updateState({ dashboardOpenLots: openLots }); // Store raw lots

        if (openLots.length > 0) {
            const tickers = [...new Set(openLots.map(lot => lot.ticker))];
            await updatePricesForView(today, tickers); // Populates state.priceCache
        }
        return openLots;
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showToast(`Error loading positions: ${error.message}`, 'error');
        updateState({ dashboardOpenLots: [] }); // Clear state on error
        return []; // Return empty array to signal failure upstream
    }
}

/**
 * Processes raw lot data: calculates metrics, filters, groups by Ticker/Exchange, sorts, and calculates totals.
 * @param {any[]} openLots - Raw array of open lots.
 * @param {string} filterValue - Uppercase ticker filter string.
 * @param {string} sortValue - Sort criteria string.
 * @returns {{aggregatedLots: any[], individualLotsForTable: any[], totalUnrealizedPL: number, totalCurrentValue: number}}
 */
function processFilterAndSortLots(openLots, filterValue, sortValue) {
    let totalUnrealizedPL = 0;
    let totalCurrentValue = 0;
    const aggregationMap = new Map();

    const individualLotsForTable = openLots
        .map(lot => {
            const priceData = state.priceCache.get(lot.ticker);
            const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
            const metrics = calculateLotMetrics(lot, currentPriceValue);

            const processedLot = { ...lot, ...metrics, priceData }; // Combine lot, metrics, and priceData

            // Accumulate totals *after* calculating metrics for each lot
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
                    underlyingLots: []
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
        .filter(lot => !filterValue || lot.ticker.toUpperCase().includes(filterValue));

    // --- Finalize Aggregated Data ---
    const aggregatedLots = Array.from(aggregationMap.values()).map(agg => {
        const weightedAvgCostBasis = agg.totalQuantity > 0 ? agg.totalCostBasisValue / agg.totalQuantity : 0;
        const overallUnrealizedPL = agg.totalCurrentValue - agg.totalCostBasisValue;
        const overallUnrealizedPercent = agg.totalCostBasisValue !== 0 ? (overallUnrealizedPL / agg.totalCostBasisValue) * 100 : 0;
        const priceData = state.priceCache.get(agg.ticker); // Get price data for the ticker

        // Sort underlying lots by purchase date (useful for the selective sell modal)
        agg.underlyingLots.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));

        return {
            ...agg,
            weightedAvgCostBasis,
            overallUnrealizedPL,
            overallUnrealizedPercent,
            priceData // Attach price data to aggregated object
        };
    }).filter(agg => !filterValue || agg.ticker.toUpperCase().includes(filterValue)); // Also filter aggregated list


    // --- Apply Sorting ---
    // Sort Aggregated Lots (for Card View)
    aggregatedLots.sort((a, b) => {
         switch (sortValue) {
            case 'exchange-asc':
                return a.exchange.localeCompare(b.exchange) || a.ticker.localeCompare(b.ticker);
            // Proximity sort might be complex/less useful for aggregated view, TBD
            case 'gain-desc': return b.overallUnrealizedPercent - a.overallUnrealizedPercent || a.ticker.localeCompare(b.ticker);
            case 'loss-asc': return a.overallUnrealizedPercent - b.overallUnrealizedPercent || a.ticker.localeCompare(b.ticker);
            case 'ticker-asc': default: return a.ticker.localeCompare(b.ticker);
        }
    });

    // Sort Individual Lots (for Table View - same logic as before)
    individualLotsForTable.sort((a, b) => {
         switch (sortValue) {
            case 'exchange-asc': return a.exchange.localeCompare(b.exchange) || a.ticker.localeCompare(b.ticker);
            case 'proximity-asc': {
                const getProximityPercent = (lot) => {
                    let proxPercent = Infinity;
                    const currentPriceNum = (lot.priceData && typeof lot.priceData.price === 'number') ? lot.priceData.price : null;
                    if (currentPriceNum !== null && currentPriceNum > 0) {
                        if (lot.proximity === 'up' && lot.limit_price_up) proxPercent = ((lot.limit_price_up - currentPriceNum) / currentPriceNum) * 100;
                        else if (lot.proximity === 'down' && lot.limit_price_down) proxPercent = ((currentPriceNum - lot.limit_price_down) / currentPriceNum) * 100;
                    }
                    return proxPercent < 0 ? Infinity : proxPercent; // Treat already passed limits as furthest away
                };
                return getProximityPercent(a) - getProximityPercent(b) || a.ticker.localeCompare(b.ticker);
             }
            case 'gain-desc': return b.unrealizedPercent - a.unrealizedPercent || a.ticker.localeCompare(b.ticker);
            case 'loss-asc': return a.unrealizedPercent - b.unrealizedPercent || a.ticker.localeCompare(b.ticker);
            case 'ticker-asc': default: return a.ticker.localeCompare(b.ticker);
        }
    });

    return { aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue };
}


/**
 * Renders the dashboard UI elements (cards, table, footers).
 * Now uses aggregatedLots for Card View and individualLotsForTable for Table View.
 * @param {any[]} aggregatedLots - Processed and sorted array of aggregated lots.
 * @param {any[]} individualLotsForTable - Processed and sorted array of individual lots.
 * @param {number} totalUnrealizedPL - Calculated total P/L.
 * @param {number} totalCurrentValue - Calculated total value.
 */
function renderDashboardUI(aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue) {
    const cardGrid = document.getElementById('positions-cards-grid');
    const tableBody = document.getElementById('open-positions-tbody');
    const totalPlFooter = document.getElementById('dashboard-unrealized-pl-total');
    const totalValueFooter = document.getElementById('dashboard-total-value');

    if (!cardGrid || !tableBody || !totalPlFooter || !totalValueFooter) {
        console.error("Dashboard renderer (UI): Missing required DOM elements.");
        return;
    }

    const filterInput = /** @type {HTMLInputElement} */ (document.getElementById('dashboard-ticker-filter'));
    const isEmpty = state.dashboardOpenLots.length === 0;
    const message = isEmpty ? 'No open positions found.' : (filterInput && filterInput.value ? 'No positions match the current filter.' : 'No open positions found.');

    // Render Aggregated Cards
    if (aggregatedLots.length === 0) {
        cardGrid.innerHTML = `<p>${message}</p>`;
    } else {
        cardGrid.innerHTML = aggregatedLots.map(agg => createAggregatedCardHTML(agg)).join('');
    }

    // Render Individual Lot Table Rows
    if (individualLotsForTable.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10">${message}</td></tr>`;
        // Ensure totals are zeroed out when no lots are displayed
        totalUnrealizedPL = 0;
        totalCurrentValue = 0;
    } else {
        tableBody.innerHTML = individualLotsForTable.map(lot => createTableRowHTML(lot)).join('');
    }

    // Update footers - always update, even if zero
    totalPlFooter.textContent = formatAccounting(totalUnrealizedPL);
    totalPlFooter.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;
    totalValueFooter.textContent = formatAccounting(totalCurrentValue);
    totalValueFooter.className = `numeric`;
}


// --- Main Orchestration Function ---

/**
 * Main function to render the dashboard page (orchestrator).
 * Fetches data, processes, aggregates, sorts, and populates the DOM.
 */
export async function renderDashboardPage() {
    const cardGrid = document.getElementById('positions-cards-grid');
    const tableBody = document.getElementById('open-positions-tbody');
    const filterInput = /** @type {HTMLInputElement} */ (document.getElementById('dashboard-ticker-filter'));
    const sortSelect = /** @type {HTMLSelectElement} */ (document.getElementById('dashboard-sort-select'));
    const totalPlFooter = document.getElementById('dashboard-unrealized-pl-total');
    const totalValueFooter = document.getElementById('dashboard-total-value');

    if (!cardGrid || !tableBody || !filterInput || !sortSelect || !totalPlFooter || !totalValueFooter) {
        console.error("Dashboard renderer orchestration: Missing required DOM elements. Aborting render.");
        return;
    }

    // Show initial loading state
    cardGrid.innerHTML = '<p>Loading open positions...</p>';
    tableBody.innerHTML = '<tr><td colspan="10">Loading open positions...</td></tr>';
    totalPlFooter.textContent = '--';
    totalValueFooter.textContent = '--';

    try {
        // Step 1: Load data
        const openLots = await loadAndPrepareDashboardData();

        // Get filter/sort values
        const filterValue = filterInput.value.toUpperCase();
        const sortValue = sortSelect.value;

        // Step 2: Process data
        const { aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue } = processFilterAndSortLots(openLots, filterValue, sortValue);

        // Step 3: Render the UI
        renderDashboardUI(aggregatedLots, individualLotsForTable, totalUnrealizedPL, totalCurrentValue);

    } catch (error) {
        console.error("Unexpected error during dashboard page render:", error);
        showToast(`An unexpected error occurred while loading the dashboard: ${error.message}`, 'error');
        const errorMsg = 'Error loading positions.';
        if (cardGrid) cardGrid.innerHTML = `<p>${errorMsg}</p>`;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="10">${errorMsg}</td></tr>`;
        if (totalPlFooter) totalPlFooter.textContent = 'Error';
        if (totalValueFooter) totalValueFooter.textContent = 'Error';
        updateState({ dashboardOpenLots: [] });
    }
}