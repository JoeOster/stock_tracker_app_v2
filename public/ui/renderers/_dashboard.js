// public/ui/renderers/_dashboard.js
/**
 * @file Renderer for the Dashboard page (Open Positions).
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

/**
 * Calculates unrealized P/L and limit proximity for a position lot.
 * @param {object} lot - The position lot data.
 * @param {number|null} currentPrice - The current market price (validated as number or null).
 * @returns {{currentValue: number, costOfRemaining: number, unrealizedPL: number, unrealizedPercent: number, proximity: 'up'|'down'|null}}
 */
function calculateLotMetrics(lot, currentPrice) {
    const metrics = {
        currentValue: 0,
        costOfRemaining: lot.quantity_remaining * lot.cost_basis, // Calculate cost basis regardless of price validity
        unrealizedPL: 0,
        unrealizedPercent: 0,
        proximity: null,
    };

    if (currentPrice !== null && currentPrice > 0) { // Only calculate P/L if currentPrice is a valid positive number
        metrics.currentValue = lot.quantity_remaining * currentPrice;
        metrics.unrealizedPL = metrics.currentValue - metrics.costOfRemaining;
        metrics.unrealizedPercent = (metrics.costOfRemaining !== 0) ? (metrics.unrealizedPL / metrics.costOfRemaining) * 100 : 0;

        // Check proximity to limits
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
        // If price is invalid/missing, use cost basis for value, P/L remains 0
        metrics.currentValue = metrics.costOfRemaining;
        metrics.unrealizedPL = 0;
        metrics.unrealizedPercent = 0;
    }

    return metrics;
}


/**
 * Creates the HTML for a single position card.
 * @param {object} lot - The position lot data.
 * @param {object | undefined} priceData - Price data object {price: number|string|null, previousPrice: number|null, timestamp: number}.
 * @returns {string} HTML string for the card.
 */
function createCardHTML(lot, priceData) {
    // Extract validated prices and status
    const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
    const previousPriceValue = (priceData && typeof priceData.previousPrice === 'number') ? priceData.previousPrice : null;
    const priceStatus = (priceData && typeof priceData.price !== 'number') ? priceData.price : null; // 'invalid', 'error', or null if price was null

    const metrics = calculateLotMetrics(lot, currentPriceValue); // Pass only valid number or null
    const plClass = metrics.unrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

    // --- Determine Trend Indicator ---
    let trendIndicator = '<span class="trend-placeholder">-</span>'; // Default
    if (currentPriceValue !== null && previousPriceValue !== null) {
        if (currentPriceValue > previousPriceValue) {
            trendIndicator = '<span class="trend-up positive">▲</span>';
        } else if (currentPriceValue < previousPriceValue) {
            trendIndicator = '<span class="trend-down negative">▼</span>';
        } else {
             trendIndicator = '<span class="trend-flat">→</span>'; // Optional: for no change
        }
    } else if (currentPriceValue !== null && previousPriceValue === null) {
        // Keep placeholder if we have current but no previous
        trendIndicator = '<span class="trend-placeholder">-</span>';
    }
    // --- End Trend Indicator ---

    // Format combined limits
    const limitUpText = lot.limit_price_up ? formatAccounting(lot.limit_price_up, false) : '--';
    const limitDownText = lot.limit_price_down ? formatAccounting(lot.limit_price_down, false) : '--';
    const limitsCombinedText = `Up: ${limitUpText} / Down: ${limitDownText}`;

    // Proximity Indicator
    let proximityIndicator = '';
    if (metrics.proximity === 'up') {
        proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
    } else if (metrics.proximity === 'down') {
        proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';
    }

    // Display Price or Status
    let currentPriceDisplay;
    if (currentPriceValue !== null) {
        currentPriceDisplay = formatAccounting(currentPriceValue);
    } else if (priceStatus === 'invalid') {
        currentPriceDisplay = '<span class="negative">Invalid</span>';
    } else if (priceStatus === 'error') {
        currentPriceDisplay = '<span class="negative">Error</span>';
    } else {
        currentPriceDisplay = '--'; // Price was null or priceData was undefined
    }


    return `
        <div class="position-card" data-lot-id="${lot.id}">
            <div class="card-header">
                <img src="${logoSrc}" alt="${lot.exchange} logo" class="exchange-logo">
                <h3 class="ticker">${lot.ticker}</h3>
            </div>
            <div class="card-body">
                <div class="card-stats">
                    <p><span>Qty:</span> <strong>${formatQuantity(lot.quantity_remaining)}</strong></p>
                    <p><span>Basis:</span> <strong>${formatAccounting(lot.cost_basis)}</strong></p>
                    <p><span>Current:</span> <strong>${currentPriceDisplay}</strong></p>
                </div>
                <div class="card-performance">
                    <p><span>P/L:</span> <strong class="unrealized-pl ${plClass}">${formatAccounting(metrics.unrealizedPL)}</strong> ${trendIndicator} ${proximityIndicator}</p>
                    <p><span>P/L %:</span> <strong class="unrealized-pl ${plClass}">${metrics.unrealizedPercent.toFixed(2)}%</strong></p>
                    <p><span>Value:</span> <strong>${formatAccounting(metrics.currentValue)}</strong></p>
                </div>
            </div>
             <div class="card-chart-placeholder">Spark Chart Area</div>
             <div class="card-footer">
                <span class="limits-text" title="${limitsCombinedText}">${limitsCombinedText}</span>
                <div class="action-buttons">
                    <button class="sell-from-lot-btn" data-buy-id="${lot.id}" data-ticker="${lot.ticker}" data-exchange="${lot.exchange}" data-quantity="${lot.quantity_remaining}">Sell</button>
                    <button class="set-limit-btn" data-id="${lot.id}">Limits</button>
                    <button class="edit-buy-btn" data-id="${lot.id}">Edit</button>
                </div>
            </div>
        </div>
    `;
}


/**
 * Creates the HTML for a single position table row.
 * @param {object} lot - The position lot data.
 * @param {object | undefined} priceData - Price data object {price: number|string|null, previousPrice: number|null, timestamp: number}.
 * @returns {string} HTML string for the table row.
 */
function createTableRowHTML(lot, priceData) {
    // Extract validated prices and status
    const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
    const previousPriceValue = (priceData && typeof priceData.previousPrice === 'number') ? priceData.previousPrice : null;
    const priceStatus = (priceData && typeof priceData.price !== 'number') ? priceData.price : null;

    const metrics = calculateLotMetrics(lot, currentPriceValue);
    const plClass = metrics.unrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

    // Determine Trend Indicator (same logic as card)
    let trendIndicator = ''; // Default empty for table
    if (currentPriceValue !== null && previousPriceValue !== null) {
        if (currentPriceValue > previousPriceValue) trendIndicator = ' <span class="trend-up positive">▲</span>';
        else if (currentPriceValue < previousPriceValue) trendIndicator = ' <span class="trend-down negative">▼</span>';
        else trendIndicator = ' <span class="trend-flat">→</span>';
    } else if (currentPriceValue !== null) {
        trendIndicator = ' <span class="trend-placeholder">-</span>';
    }

    // Format combined limits
    const limitUpText = lot.limit_price_up ? formatAccounting(lot.limit_price_up, false) : '--';
    const limitDownText = lot.limit_price_down ? formatAccounting(lot.limit_price_down, false) : '--';
    const limitsCombinedText = `${limitUpText} / ${limitDownText}`;

    // MODIFIED (X.6): Add title attribute to proximity indicator span
    let proximityIndicator = '';
    if (metrics.proximity === 'up') {
        proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
    } else if (metrics.proximity === 'down') {
        proximityIndicator = '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';
    }
    // END MODIFICATION

    // Display Price or Status
    let currentPriceDisplay;
    if (currentPriceValue !== null) {
        currentPriceDisplay = formatAccounting(currentPriceValue);
    } else if (priceStatus === 'invalid') {
        currentPriceDisplay = '<span class="negative">Invalid</span>';
    } else if (priceStatus === 'error') {
        currentPriceDisplay = '<span class="negative">Error</span>';
    } else {
        currentPriceDisplay = '--';
    }

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
                ${formatAccounting(metrics.unrealizedPL)} | ${metrics.unrealizedPercent.toFixed(2)}% ${proximityIndicator}${trendIndicator}
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


/**
 * Main function to render the dashboard page (cards and table).
 * Fetches data, calculates metrics, sorts, and populates the DOM.
 */
export async function renderDashboardPage() {
    const cardGrid = document.getElementById('positions-cards-grid');
    const tableBody = document.getElementById('open-positions-tbody');
    const filterInput = /** @type {HTMLInputElement} */ (document.getElementById('dashboard-ticker-filter'));
    const sortSelect = /** @type {HTMLSelectElement} */ (document.getElementById('dashboard-sort-select'));
    const totalPlFooter = document.getElementById('dashboard-unrealized-pl-total');
    const totalValueFooter = document.getElementById('dashboard-total-value'); // Make sure this ID exists in dashboard.html tfoot

    if (!cardGrid || !tableBody || !filterInput || !sortSelect || !totalPlFooter || !totalValueFooter) {
        console.error("Dashboard renderer: Missing required DOM elements.");
        return;
    }

    // Show loading state
    cardGrid.innerHTML = '<p>Loading open positions...</p>';
    tableBody.innerHTML = '<tr><td colspan="10">Loading open positions...</td></tr>';
    totalPlFooter.textContent = '--';
    totalValueFooter.textContent = '--';

    try {
        const today = getCurrentESTDateString();
        // Fetch position data (uses the same endpoint as daily report)
        const positionData = await fetchPositions(today, String(state.selectedAccountHolderId));
        let openLots = positionData?.endOfDayPositions || [];

        // Store the raw fetched lots in the state for event handlers to access easily
        updateState({ dashboardOpenLots: openLots });

        if (openLots.length === 0) {
            cardGrid.innerHTML = '<p>No open positions found.</p>';
            tableBody.innerHTML = '<tr><td colspan="10">No open positions found.</td></tr>';
            totalPlFooter.textContent = formatAccounting(0);
            totalValueFooter.textContent = formatAccounting(0); // Show 0 value
            return;
        }

        // Fetch current prices
        const tickers = [...new Set(openLots.map(lot => lot.ticker))];
        await updatePricesForView(today, tickers); // Populates state.priceCache

        // Calculate metrics and apply filter/sort
        const filterValue = filterInput.value.toUpperCase();
        const sortValue = sortSelect.value;
        let totalUnrealizedPL = 0;
        let totalCurrentValue = 0; // Initialize total value

        const processedLots = openLots
            .map(lot => {
                const priceData = state.priceCache.get(lot.ticker);
                // Get the validated current price (number or null)
                const currentPriceValue = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
                const metrics = calculateLotMetrics(lot, currentPriceValue);
                totalUnrealizedPL += metrics.unrealizedPL;
                totalCurrentValue += metrics.currentValue; // Sum up current value
                // Return lot data combined with metrics and the full priceData object
                return { ...lot, ...metrics, priceData };
            })
            .filter(lot => !filterValue || lot.ticker.toUpperCase().includes(filterValue));

        // Apply sorting
        processedLots.sort((a, b) => {
             switch (sortValue) {
                case 'exchange-asc':
                    return a.exchange.localeCompare(b.exchange) || a.ticker.localeCompare(b.ticker);
                case 'proximity-asc': {
                    const getProximityPercent = (lot) => {
                        let proxPercent = Infinity;
                        const currentPriceNum = (lot.priceData && typeof lot.priceData.price === 'number') ? lot.priceData.price : null;
                        if (currentPriceNum !== null && currentPriceNum > 0) { // Added check for > 0
                            if (lot.proximity === 'up' && lot.limit_price_up) {
                                proxPercent = ((lot.limit_price_up - currentPriceNum) / currentPriceNum) * 100;
                            } else if (lot.proximity === 'down' && lot.limit_price_down) {
                                proxPercent = ((currentPriceNum - lot.limit_price_down) / currentPriceNum) * 100;
                            }
                        }
                        return proxPercent < 0 ? Infinity : proxPercent; // Treat already passed limits as furthest away
                    };
                    return getProximityPercent(a) - getProximityPercent(b) || a.ticker.localeCompare(b.ticker);
                }
                case 'gain-desc':
                    // Sort by percentage P/L descending
                    return b.unrealizedPercent - a.unrealizedPercent || a.ticker.localeCompare(b.ticker);
                case 'loss-asc':
                    // Sort by percentage P/L ascending (most negative first)
                    return a.unrealizedPercent - b.unrealizedPercent || a.ticker.localeCompare(b.ticker);
                case 'ticker-asc':
                default:
                    return a.ticker.localeCompare(b.ticker);
            }
        });

        // Render Cards & Table Rows (pass full priceData)
        if (processedLots.length > 0) {
            cardGrid.innerHTML = processedLots.map(lot => createCardHTML(lot, lot.priceData)).join('');
            tableBody.innerHTML = processedLots.map(lot => createTableRowHTML(lot, lot.priceData)).join('');
        } else {
            const noMatchMsg = '<p>No positions match the current filter.</p>';
            const noMatchRow = '<tr><td colspan="10">No positions match the current filter.</td></tr>';
            cardGrid.innerHTML = noMatchMsg;
            tableBody.innerHTML = noMatchRow;
        }

        // Update total P/L footer
        totalPlFooter.textContent = formatAccounting(totalUnrealizedPL);
        totalPlFooter.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;

        // Update total value footer
        totalValueFooter.textContent = formatAccounting(totalCurrentValue);
        totalValueFooter.className = `numeric`; // No specific class needed

    } catch (error) {
        console.error("Error rendering dashboard:", error);
        showToast(`Error loading dashboard: ${error.message}`, 'error');
        cardGrid.innerHTML = '<p>Error loading positions.</p>';
        tableBody.innerHTML = '<tr><td colspan="10">Error loading positions.</td></tr>';
        totalPlFooter.textContent = 'Error';
        totalValueFooter.textContent = 'Error';
        updateState({ dashboardOpenLots: [] }); // Clear state on error
    }
}