// public/ui/renderers/_dashboard.js
/**
 * @file Renderer for the Dashboard page (Open Positions).
 * @module renderers/_dashboard
 */

import { state, updateState } from '../../state.js'; // Added updateState import
import { fetchPositions, updatePricesForView } from '../../api.js';
import { formatAccounting, formatQuantity } from '../formatters.js';
import { getCurrentESTDateString } from '../datetime.js';
import { showToast } from '../helpers.js';

// --- Configuration ---
const PROXIMITY_THRESHOLD_PERCENT = 5; // e.g., Show indicator if within 5% of limit

// --- Helper: Map Exchange Name to Logo ---
// (Store logos in /public/images/logos/ or similar)
const genericLogoPath = '/images/logos/generic-exchange.png'; // Placeholder path
const exchangeLogoMap = {
    // --- UPDATED: Use specific paths ---
    'Fidelity': '/images/logos/image_fidelity.jpg',
    'Robinhood': '/images/logos/image_robinhood.jpg', // Updated path
    'E-Trade': '/images/logos/image_etrade.jpg', // Updated path
    // --- Keep placeholder for Other ---
    'Other': genericLogoPath
    // Add more mappings as needed
};
const defaultLogo = genericLogoPath; // Fallback is still the generic one

/**
 * Calculates unrealized P/L and limit proximity for a position lot.
 * @param {object} lot - The position lot data.
 * @param {number|null|'invalid'|'error'} currentPrice - The current market price.
 * @returns {{currentValue: number, unrealizedPL: number, unrealizedPercent: number, proximity: 'up'|'down'|null}}
 */
function calculateLotMetrics(lot, currentPrice) {
    const metrics = {
        currentValue: 0,
        unrealizedPL: 0,
        unrealizedPercent: 0,
        proximity: null,
    };

    if (typeof currentPrice === 'number' && currentPrice > 0) {
        metrics.currentValue = lot.quantity_remaining * currentPrice;
        const costOfRemaining = lot.quantity_remaining * lot.cost_basis;
        metrics.unrealizedPL = metrics.currentValue - costOfRemaining;
        metrics.unrealizedPercent = (costOfRemaining !== 0) ? (metrics.unrealizedPL / costOfRemaining) * 100 : 0;

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
        // If price is invalid/missing, use cost basis for value, P/L is 0
        metrics.currentValue = lot.quantity_remaining * lot.cost_basis;
        metrics.unrealizedPL = 0;
        metrics.unrealizedPercent = 0;
    }

    return metrics;
}

/**
 * Creates the HTML for a single position card.
 * @param {object} lot - The position lot data including calculated metrics.
 * @param {number|string|null} currentPrice - Current price or status string.
 * @returns {string} HTML string for the card.
 */
function createCardHTML(lot, currentPrice) {
    const metrics = calculateLotMetrics(lot, currentPrice);
    const plClass = metrics.unrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

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
                    <p><span>Current:</span> <strong>${typeof currentPrice === 'number' ? formatAccounting(currentPrice) : '--'}</strong></p>
                </div>
                <div class="card-performance">
                    <p><span>P/L:</span> <strong class="unrealized-pl ${plClass}">${formatAccounting(metrics.unrealizedPL)}</strong> ${proximityIndicator}</p>
                    <p><span>P/L %:</span> <strong class="unrealized-pl ${plClass}">${metrics.unrealizedPercent.toFixed(2)}%</strong></p>
                    <p><span>Value:</span> <strong>${formatAccounting(metrics.currentValue)}</strong></p>
                </div>
            </div>
             <div class="card-chart-placeholder">Spark Chart Area</div> <div class="card-footer">
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
 * @param {object} lot - The position lot data including calculated metrics.
 * @param {number|string|null} currentPrice - Current price or status string.
 * @returns {string} HTML string for the table row.
 */
function createTableRowHTML(lot, currentPrice) {
    const metrics = calculateLotMetrics(lot, currentPrice);
    const plClass = metrics.unrealizedPL >= 0 ? 'positive' : 'negative';
    const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

    // Format combined limits
    const limitUpText = lot.limit_price_up ? formatAccounting(lot.limit_price_up, false) : '--';
    const limitDownText = lot.limit_price_down ? formatAccounting(lot.limit_price_down, false) : '--';
    const limitsCombinedText = `${limitUpText} / ${limitDownText}`;

    // Proximity Indicator (optional for table)
    let proximityIndicator = '';
    if (metrics.proximity === 'up') proximityIndicator = '🔥';
    else if (metrics.proximity === 'down') proximityIndicator = '❄️';

    return `
        <tr data-lot-id="${lot.id}" data-key="lot-${lot.id}">
            <td class="reconciliation-checkbox-cell center-align sticky-col"><input type="checkbox" class="reconciliation-checkbox"></td>
            <td class="sticky-col">${lot.ticker}</td>
            <td><img src="${logoSrc}" alt="${lot.exchange}" title="${lot.exchange}" class="exchange-logo-small" style="width: 20px; height: 20px; vertical-align: middle;"></td> <td>${lot.purchase_date}</td>
            <td class="numeric">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric current-price">${typeof currentPrice === 'number' ? formatAccounting(currentPrice) : '--'}</td>
            <td class="numeric unrealized-pl-combined ${plClass}">
                ${formatAccounting(metrics.unrealizedPL)} | ${metrics.unrealizedPercent.toFixed(2)}% ${proximityIndicator}
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

    if (!cardGrid || !tableBody || !filterInput || !sortSelect || !totalPlFooter) {
        console.error("Dashboard renderer: Missing required DOM elements.");
        return;
    }

    // Show loading state
    cardGrid.innerHTML = '<p>Loading open positions...</p>';
    tableBody.innerHTML = '<tr><td colspan="10">Loading open positions...</td></tr>';
    totalPlFooter.textContent = '--';

    try {
        const today = getCurrentESTDateString();
        // Fetch position data (uses the same endpoint as daily report)
        const positionData = await fetchPositions(today, String(state.selectedAccountHolderId));
        let openLots = positionData?.endOfDayPositions || [];

        // Store the raw fetched lots in the state for event handlers to access easily
        updateState({ dashboardOpenLots: openLots }); // Added dashboardOpenLots to state

        if (openLots.length === 0) {
            cardGrid.innerHTML = '<p>No open positions found for this account holder.</p>';
            tableBody.innerHTML = '<tr><td colspan="10">No open positions found.</td></tr>';
            totalPlFooter.textContent = formatAccounting(0);
            return;
        }

        // Fetch current prices
        const tickers = [...new Set(openLots.map(lot => lot.ticker))];
        await updatePricesForView(today, tickers); // Populates state.priceCache

        // Calculate metrics and apply filter/sort
        const filterValue = filterInput.value.toUpperCase();
        const sortValue = sortSelect.value;
        let totalUnrealizedPL = 0;

        const processedLots = openLots
            .map(lot => {
                const priceData = state.priceCache.get(lot.ticker);
                // Ensure price is treated as number or null for calculations
                const currentPrice = (priceData && typeof priceData.price === 'number') ? priceData.price : null;
                const metrics = calculateLotMetrics(lot, currentPrice);
                totalUnrealizedPL += metrics.unrealizedPL; // Sum up P/L
                // Pass the potentially null price to the rendering functions
                return { ...lot, ...metrics, currentPrice: priceData?.price }; // Keep original price format (number, null, 'invalid', 'error')
            })
            .filter(lot => !filterValue || lot.ticker.toUpperCase().includes(filterValue)); // Apply filter

        // Apply sorting
        processedLots.sort((a, b) => {
            switch (sortValue) {
                case 'exchange-asc':
                    return a.exchange.localeCompare(b.exchange) || a.ticker.localeCompare(b.ticker);
                case 'proximity-asc': { // Sort by how close % they are to a limit (smallest % first)
                    const getProximityPercent = (lot) => {
                        let proxPercent = Infinity;
                        // Only calculate if currentPrice is a valid number
                        if (typeof lot.currentPrice === 'number' && lot.currentPrice > 0) {
                            if (lot.proximity === 'up') {
                                proxPercent = ((lot.limit_price_up - lot.currentPrice) / lot.currentPrice) * 100;
                            } else if (lot.proximity === 'down') {
                                proxPercent = ((lot.currentPrice - lot.limit_price_down) / lot.currentPrice) * 100;
                            }
                        }
                        return proxPercent < 0 ? Infinity : proxPercent; // Ignore if already past limit
                    };
                    return getProximityPercent(a) - getProximityPercent(b) || a.ticker.localeCompare(b.ticker);
                }
                case 'gain-desc':
                    return b.unrealizedPercent - a.unrealizedPercent || a.ticker.localeCompare(b.ticker);
                case 'loss-asc': // Sorts by most negative % first
                    return a.unrealizedPercent - b.unrealizedPercent || a.ticker.localeCompare(b.ticker);
                case 'ticker-asc':
                default:
                    return a.ticker.localeCompare(b.ticker);
            }
        });

        // Render Cards
        if (processedLots.length > 0) {
            cardGrid.innerHTML = processedLots.map(lot => createCardHTML(lot, lot.currentPrice)).join('');
        } else {
            cardGrid.innerHTML = '<p>No positions match the current filter.</p>';
        }

        // Render Table Rows
         if (processedLots.length > 0) {
            tableBody.innerHTML = processedLots.map(lot => createTableRowHTML(lot, lot.currentPrice)).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="10">No positions match the current filter.</td></tr>';
        }


        // Update total P/L footer
        totalPlFooter.textContent = formatAccounting(totalUnrealizedPL);
        totalPlFooter.className = `numeric ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`;


    } catch (error) {
        console.error("Error rendering dashboard:", error);
        showToast(`Error loading dashboard: ${error.message}`, 'error');
        cardGrid.innerHTML = '<p>Error loading positions.</p>';
        tableBody.innerHTML = '<tr><td colspan="10">Error loading positions.</td></tr>';
        totalPlFooter.textContent = 'Error';
        updateState({ dashboardOpenLots: [] }); // Clear state on error
    }
}