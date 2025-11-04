// public/ui/renderers/_dashboard_html.js
/**
 * @file Contains functions for generating HTML specific to the Dashboard page.
 * @module renderers/_dashboard_html
 */

import { formatAccounting, formatQuantity } from '../formatters.js';

// --- Helper: Map Exchange Name to Logo ---
const genericLogoPath = '/images/logos/generic-exchange.png'; // Placeholder path
const exchangeLogoMap = {
  Fidelity: '/images/logos/image_fidelity.jpg',
  Robinhood: '/images/logos/image_robinhood.jpg',
  'E-Trade': '/images/logos/image_etrade.jpg',
  Other: genericLogoPath, // Fallback
};
const defaultLogo = genericLogoPath;

// --- Configuration ---
// Note: PROXIMITY_THRESHOLD_PERCENT is used in calculateLotMetrics, keep it there or pass as arg if needed elsewhere.

/**
 * Creates the HTML for a single position card.
 * If the aggData contains only one lot, it renders like an individual lot card.
 * If it contains multiple lots, it renders an aggregated summary card with different buttons.
 * @param {object} aggData - The aggregated data for a ticker/exchange combination.
 * @param {string} aggData.ticker
 * @param {string} aggData.exchange
 * @param {number} aggData.totalQuantity
 * @param {number} aggData.totalCurrentValue
 * @param {number} aggData.totalCostBasisValue // Keep this? Used internally for calculations.
 * @param {number} aggData.weightedAvgCostBasis
 * @param {number} aggData.overallUnrealizedPL
 * @param {number} aggData.overallUnrealizedPercent
 * @param {object|undefined} aggData.priceData - Price data for this ticker.
 * @param {any[]} aggData.underlyingLots - Array of the individual lots making up this aggregate (each includes calculated metrics).
 * @returns {string} HTML string for the card.
 */
export function createAggregatedCardHTML(aggData) {
  const {
    ticker,
    exchange,
    totalQuantity,
    totalCurrentValue,
    weightedAvgCostBasis,
    overallUnrealizedPL,
    overallUnrealizedPercent,
    priceData,
    underlyingLots,
  } = aggData;

  // --- Check if this card represents a single lot or multiple ---
  const isSingleLot = underlyingLots.length === 1;
  const singleLot = isSingleLot ? underlyingLots[0] : null; // Get the single lot data if applicable

  // --- Common calculations (price, trend, etc.) ---
  const currentPriceValue =
    priceData && typeof priceData.price === 'number' ? priceData.price : null;
  const previousPriceValue =
    priceData && typeof priceData.previousPrice === 'number'
      ? priceData.previousPrice
      : null;
  const priceStatus =
    priceData && typeof priceData.price !== 'number' ? priceData.price : null;
  const logoSrc = exchangeLogoMap[exchange] || defaultLogo;

  let currentPriceDisplay;
  if (currentPriceValue !== null)
    currentPriceDisplay = formatAccounting(currentPriceValue);
  else if (priceStatus === 'invalid')
    currentPriceDisplay = '<span class="negative">Invalid</span>';
  else if (priceStatus === 'error')
    currentPriceDisplay = '<span class="negative">Error</span>';
  else currentPriceDisplay = '--';

  let trendIndicator = ''; // Default to empty string
  if (currentPriceValue !== null && previousPriceValue !== null) {
    if (currentPriceValue > previousPriceValue)
      trendIndicator = ' <span class="trend-up positive">▲</span>';
    else if (currentPriceValue < previousPriceValue)
      trendIndicator = ' <span class="trend-down negative">▼</span>';
  }

  // --- Prepare data specific to single or aggregated view ---
  let cardClass = 'position-card';
  let cardDataAttrs = `data-ticker="${ticker}" data-exchange="${exchange}"`;
  let headerNote = `(${underlyingLots.length} Lots)`;
  let statsHTML = '';
  let performanceHTML = '';
  let footerHTML = '';
  let proximityIndicator = ''; // Calculate proximity for single lot only

  if (isSingleLot && singleLot) {
    // --- SINGLE LOT CARD ---
    cardClass += ' individual-lot-card';
    cardDataAttrs += ` data-lot-id="${singleLot.id}"`;
    headerNote = `Lot ID: ${singleLot.id}`;

    const plClass = singleLot.unrealizedPL >= 0 ? 'positive' : 'negative';
    if (singleLot.proximity === 'up')
      proximityIndicator =
        '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
    else if (singleLot.proximity === 'down')
      proximityIndicator =
        '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';

    const limitUpText = singleLot.limit_price_up
      ? formatAccounting(singleLot.limit_price_up, false)
      : '--';
    const limitDownText = singleLot.limit_price_down
      ? formatAccounting(singleLot.limit_price_down, false)
      : '--';
    const limitsCombinedText = `Up: ${limitUpText} / Down: ${limitDownText}`;

    statsHTML = `
            <p><span>Qty:</span> <strong>${formatQuantity(singleLot.quantity_remaining)}</strong></p>
            <p><span>Basis:</span> <strong>${formatAccounting(singleLot.cost_basis)}</strong></p>
            <p><span>Value:</span> <strong>${formatAccounting(singleLot.totalCurrentValue)}</strong></p>
            <p><span>Limit ↑:</span> <strong title="${limitsCombinedText}">${limitUpText}</strong></p>
        `;
    performanceHTML = `
            <p><span>Current:</span> <strong>${currentPriceDisplay}</strong></p>
            <p><span>P/L $:</span> <strong class="unrealized-pl ${plClass}">${formatAccounting(singleLot.unrealizedPL)}</strong></p>
            <p><span>P/L %:</span> <strong class="unrealized-pl ${plClass}">${singleLot.unrealizedPercent.toFixed(2)}%</strong>${proximityIndicator}${trendIndicator}</p>
            <p><span>Limit ↓:</span> <strong title="${limitsCombinedText}">${limitDownText}</strong></p>
        `;

    // --- MODIFICATION START: Update buttons for single lot card ---
    // Prepare data needed for the manage-position-btn (same as aggregated, but with only one lot)
    const lotsForModal = [
      {
        id: singleLot.id,
        purchase_date: singleLot.purchase_date,
        cost_basis: singleLot.cost_basis,
        quantity_remaining: singleLot.quantity_remaining,
      },
    ];
    const encodedLots = encodeURIComponent(JSON.stringify(lotsForModal));

    footerHTML = `
            <div class="action-buttons" style="margin-left: auto;">
                <button class="sell-from-lot-btn" data-buy-id="${singleLot.id}" data-ticker="${ticker}" data-exchange="${exchange}" data-quantity="${singleLot.quantity_remaining}">Sell</button>
                <button class="set-limit-btn" data-id="${singleLot.id}">Limits</button>
                <button class="edit-buy-btn" data-id="${singleLot.id}">Edit</button>
                <button class="manage-position-btn" data-ticker="${ticker}" data-exchange="${exchange}" data-lots="${encodedLots}" title="View/Manage Lot Details">Manage</button>
            </div>
        `;
    // --- MODIFICATION END ---
  } else {
    // --- AGGREGATED LOT CARD ---
    cardClass += ' aggregated-card';
    const plClass = overallUnrealizedPL >= 0 ? 'positive' : 'negative';
    const lotsForModal = underlyingLots.map((lot) => ({
      id: lot.id,
      purchase_date: lot.purchase_date,
      cost_basis: lot.cost_basis,
      quantity_remaining: lot.quantity_remaining,
    }));
    const encodedLots = encodeURIComponent(JSON.stringify(lotsForModal));

    statsHTML = `
            <p><span>Qty:</span> <strong>${formatQuantity(totalQuantity)}</strong></p>
            <p><span>Basis:</span> <strong>${formatAccounting(weightedAvgCostBasis)}</strong></p>
            <p><span>T_Value:</span> <strong>${formatAccounting(totalCurrentValue)}</strong></p>
            <p><small>Limits: See Manage Lots</small></p>
        `;
    performanceHTML = `
            <p><span>Current:</span> <strong>${currentPriceDisplay}</strong></p>
            <p><span>T_P/L:</span> <strong class="unrealized-pl ${plClass}">${formatAccounting(overallUnrealizedPL)}</strong></p>
            <p><span>T_P/L %:</span> <strong class="unrealized-pl ${plClass}">${overallUnrealizedPercent.toFixed(2)}%</strong>${trendIndicator}</p>
        `;
    footerHTML = `
            <span class="limits-text">Limits managed per lot</span>
            <div class="action-buttons">
                <button class="selective-sell-btn" data-ticker="${ticker}" data-exchange="${exchange}" data-total-quantity="${totalQuantity}" data-lots="${encodedLots}">Sell</button>
                <button class="manage-position-btn" data-ticker="${ticker}" data-exchange="${exchange}" data-lots="${encodedLots}" title="View/Manage All Lots">Manage Lots</button>
            </div>
        `;
  }

  // --- Assemble the final card HTML ---
  return `
        <div class="${cardClass}" ${cardDataAttrs}>
            <div class="card-header">
                <img src="${logoSrc}" alt="${exchange} logo" class="exchange-logo">
                <h3 class="ticker">${ticker}</h3>
                <small style="margin-left: auto;">${headerNote}</small>
            </div>
            <div class="card-body">
                <div class="card-stats">
                    ${statsHTML}
                </div>
                <div class.card-performance">
                    ${performanceHTML}
                </div>
            </div>
             <div class="card-chart-placeholder">Spark Chart Area</div>
             <div class="card-footer">
                ${footerHTML}
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for a single position table row.
 * Includes all 4 action buttons (Sell, History, Limits, Edit).
 * @param {object} lot - The processed position lot data including metrics and priceData.
 * @returns {string} HTML string for the table row.
 */
export function createTableRowHTML(lot) {
  // ... (full code for createTableRowHTML function as it was in _dashboard.js) ...
  const { priceData, unrealizedPL, unrealizedPercent, proximity } = lot; // Use processed data
  const currentPriceValue =
    priceData && typeof priceData.price === 'number' ? priceData.price : null;
  const previousPriceValue =
    priceData && typeof priceData.previousPrice === 'number'
      ? priceData.previousPrice
      : null;
  const priceStatus =
    priceData && typeof priceData.price !== 'number' ? priceData.price : null;

  const plClass = unrealizedPL >= 0 ? 'positive' : 'negative';
  const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

  let trendIndicator = ''; // Default to empty string
  if (currentPriceValue !== null && previousPriceValue !== null) {
    if (currentPriceValue > previousPriceValue)
      trendIndicator = ' <span class="trend-up positive">▲</span>';
    else if (currentPriceValue < previousPriceValue)
      trendIndicator = ' <span class="trend-down negative">▼</span>';
    // else trendIndicator = ' <span class="trend-flat">→</span>'; // Optional: Add for no change
  }
  // No placeholder if current price exists but previous doesn't

  // Simplified Limits Display for Table
  const limitUpText = lot.limit_price_up
    ? `Up: ${formatAccounting(lot.limit_price_up, false)}`
    : '';
  const limitDownText = lot.limit_price_down
    ? `Down: ${formatAccounting(lot.limit_price_down, false)}`
    : '';
  let limitsCombinedText = '';
  if (limitUpText && limitDownText) {
    limitsCombinedText = `${limitUpText} / ${limitDownText}`;
  } else {
    limitsCombinedText = limitUpText || limitDownText; // Show one or the other, or '' if both are empty
  }

  let proximityIndicator = '';
  if (proximity === 'up')
    proximityIndicator =
      '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
  else if (proximity === 'down')
    proximityIndicator =
      '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';

  let currentPriceDisplay;
  if (currentPriceValue !== null)
    currentPriceDisplay = formatAccounting(currentPriceValue);
  else if (priceStatus === 'invalid')
    currentPriceDisplay = '<span class="negative">Invalid</span>';
  else if (priceStatus === 'error')
    currentPriceDisplay = '<span class="negative">Error</span>';
  else currentPriceDisplay = '--';

  return `
        <tr data-lot-id="${lot.id}" data-key="lot-${lot.id}">
            <td class="reconciliation-checkbox-cell center-align sticky-col col-check"><input type="checkbox" class="reconciliation-checkbox"></td>
            <td class="sticky-col col-ticker">${lot.ticker}</td>
            <td class="col-exchange"><img src="${logoSrc}" alt="${lot.exchange}" title="${lot.exchange}" class="exchange-logo-small"> ${lot.exchange}</td>
            <td class="col-date">${lot.purchase_date}</td>
            <td class="numeric col-price">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric col-qty center-align">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric current-price col-price">${currentPriceDisplay}</td>
            <td class="numeric unrealized-pl-combined col-pl ${plClass}">
                ${formatAccounting(unrealizedPL)} | ${unrealizedPercent.toFixed(2)}% ${proximityIndicator}${trendIndicator}
            </td>
            <td class="numeric col-limits">${limitsCombinedText}</td>
            <td class="center-align actions-cell sticky-col col-actions">
                <button class="sell-from-lot-btn" data-buy-id="${lot.id}" data-ticker="${lot.ticker}" data-exchange="${lot.exchange}" data-quantity="${lot.quantity_remaining}">Sell</button>
                <button class="sales-history-btn" data-buy-id="${lot.id}" title="View Sales History">History</button>
                <button class="set-limit-btn" data-id="${lot.id}">Limits</button>
                <button class="edit-buy-btn" data-id="${lot.id}">Edit</button>
            </td>
        </tr>
    `;
}

// --- *** THIS IS THE FIX: Added the missing function *** ---
/**
 * Creates the HTML for a single position table row *without* action buttons or checkboxes.
 * Used for info-only views like the Watchlist "Real Positions" tab.
 * @param {object} lot - The processed position lot data including metrics and priceData.
 * @returns {string} HTML string for the table row.
 */
export function createTableRowHTML_InfoOnly(lot) {
  // This logic is identical to createTableRowHTML, just the return string is different.
  const { priceData, unrealizedPL, unrealizedPercent, proximity } = lot; // Use processed data
  const currentPriceValue =
    priceData && typeof priceData.price === 'number' ? priceData.price : null;
  const previousPriceValue =
    priceData && typeof priceData.previousPrice === 'number'
      ? priceData.previousPrice
      : null;
  const priceStatus =
    priceData && typeof priceData.price !== 'number' ? priceData.price : null;

  const plClass = unrealizedPL >= 0 ? 'positive' : 'negative';
  const logoSrc = exchangeLogoMap[lot.exchange] || defaultLogo;

  let trendIndicator = '';
  if (currentPriceValue !== null && previousPriceValue !== null) {
    if (currentPriceValue > previousPriceValue)
      trendIndicator = ' <span class="trend-up positive">▲</span>';
    else if (currentPriceValue < previousPriceValue)
      trendIndicator = ' <span class="trend-down negative">▼</span>';
  }

  const limitUpText = lot.limit_price_up
    ? `Up: ${formatAccounting(lot.limit_price_up, false)}`
    : '';
  const limitDownText = lot.limit_price_down
    ? `Down: ${formatAccounting(lot.limit_price_down, false)}`
    : '';
  let limitsCombinedText = '';
  if (limitUpText && limitDownText) {
    limitsCombinedText = `${limitUpText} / ${limitDownText}`;
  } else {
    limitsCombinedText = limitUpText || limitDownText;
  }

  let proximityIndicator = '';
  if (proximity === 'up')
    proximityIndicator =
      '<span class="limit-proximity-indicator" title="Nearing Take Profit Limit">🔥</span>';
  else if (proximity === 'down')
    proximityIndicator =
      '<span class="limit-proximity-indicator" title="Nearing Stop Loss Limit">❄️</span>';

  let currentPriceDisplay;
  if (currentPriceValue !== null)
    currentPriceDisplay = formatAccounting(currentPriceValue);
  else if (priceStatus === 'invalid')
    currentPriceDisplay = '<span class="negative">Invalid</span>';
  else if (priceStatus === 'error')
    currentPriceDisplay = '<span class="negative">Error</span>';
  else currentPriceDisplay = '--';

  // Return the 8-cell row (no checkbox, no actions cell)
  return `
        <tr data-lot-id="${lot.id}" data-key="lot-${lot.id}">
            <td class="sticky-col col-ticker">${lot.ticker}</td>
            <td class="col-exchange"><img src="${logoSrc}" alt="${lot.exchange}" title="${lot.exchange}" class="exchange-logo-small"> ${lot.exchange}</td>
            <td class="col-date">${lot.purchase_date}</td>
            <td class="numeric col-price">${formatAccounting(lot.cost_basis)}</td>
            <td class="numeric col-qty center-align">${formatQuantity(lot.quantity_remaining)}</td>
            <td class="numeric current-price col-price">${currentPriceDisplay}</td>
            <td class="numeric unrealized-pl-combined col-pl ${plClass}">
                ${formatAccounting(unrealizedPL)} | ${unrealizedPercent.toFixed(2)}% ${proximityIndicator}${trendIndicator}
            </td>
            <td class="numeric col-limits">${limitsCombinedText}</td>
        </tr>
    `;
}
