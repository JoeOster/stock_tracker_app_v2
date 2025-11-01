// /public/ui/renderers/_watchlist_watched.js
/**
 * @file Renderer for the "Watched Tickers" sub-tab on the Watchlist page.
 * @module renderers/_watchlist_watched
 */

import { state } from '../../state.js';
import { fetchSimpleWatchlist } from '../../api/watchlist-api.js';
// --- MODIFIED: Import the correct function name ---
import { updatePricesForView } from '../../api/price-api.js';
// --- END MODIFIED ---
import { formatAccounting, formatPercent } from '../formatters.js';
// --- ADDED: Import date helper ---
import { getCurrentESTDateString } from '../datetime.js';

/**
 * Creates the HTML for the "Add Ticker" form.
 * @returns {string}
 */
function createAddTickerFormHTML() {
    return `
        <form id="add-watched-ticker-form" class="add-item-form">
            <input type="text" id="add-watched-ticker-input" placeholder="Add Ticker (e.g., AAPL)" required>
            <button type="submit">Add Ticker</button>
        </form>
    `;
}

/**
 * Creates the HTML for the watched tickers table.
 * @param {any[]} watchedTickers - Array of {id, ticker} objects.
 * @returns {string}
 */
function createWatchedTableHTML(watchedTickers) {
    if (watchedTickers.length === 0) {
        return '<p>No tickers are currently being watched.</p>';
    }

    let tableHTML = `
        <table id="watched-tickers-table" class="data-table">
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th class="numeric">Current Price</th>
                    <th class="numeric">Day's Change</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    watchedTickers.forEach(item => {
        const priceData = state.priceCache.get(item.ticker);
        let priceDisplay = '<i>Fetching...</i>';
        let changeDisplay = '<i>...</i>';

        // --- FIX: Manually calculate change and changePercent ---
        if (priceData && typeof priceData.price === 'number') {
            priceDisplay = formatAccounting(priceData.price);

            let change = 0;
            let changePercent = 0;

            // Only calculate change if previousPrice is also a valid number and not zero
            if (priceData.previousPrice !== null && typeof priceData.previousPrice === 'number' && priceData.previousPrice > 0) {
                change = priceData.price - priceData.previousPrice;
                changePercent = change / priceData.previousPrice; // This is a decimal (e.g., 0.05)
            }

            const changeClass = change >= 0 ? 'positive' : 'negative';
            // Pass the calculated decimal to formatPercent
            changeDisplay = `<span class="${changeClass}">${formatAccounting(change, false)} (${formatPercent(changePercent)})</span>`;
            
        } else if (priceData) {
            priceDisplay = `<span class="negative">${priceData.price}</span>`; // e.g., "Error" or "Invalid"
        }
        // --- END FIX ---

        tableHTML += `
            <tr data-id="${item.id}" data-ticker="${item.ticker}">
                <td>${item.ticker}</td>
                <td class="numeric">${priceDisplay}</td>
                <td class="numeric">${changeDisplay}</td>
                <td class="center-align">
                    <button class="delete-watched-ticker-btn delete-btn" data-id="${item.id}" title="Remove Ticker">X</button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

/**
 * Fetches, processes, and renders the "Watched Tickers" sub-tab.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @returns {Promise<void>}
 */
export async function renderWatchedTickers(panelElement) {
    panelElement.innerHTML = '<h3>Watched Tickers</h3><p>Loading watched tickers...</p>';
    
    // @ts-ignore
    const holderId = state.selectedAccountHolderId;
    if (!holderId || holderId === 'all') {
        panelElement.innerHTML = '<h3>Watched Tickers</h3><p>Please select a specific account holder.</p>';
        return;
    }

    // Step 1: Fetch the list of tickers
    const watchedTickers = await fetchSimpleWatchlist(holderId);

    // Step 2: Fetch prices for those tickers
    if (watchedTickers.length > 0) {
        const tickersToFetch = watchedTickers.map(item => item.ticker);
        // --- MODIFIED: Call the correct function with the date ---
        await updatePricesForView(getCurrentESTDateString(), tickersToFetch);
        // --- END MODIFICATION ---
    }

    // Step 3: Render the form and the table
    const formHTML = createAddTickerFormHTML();
    const tableHTML = createWatchedTableHTML(watchedTickers);

    panelElement.innerHTML = `
        <h3>Watched Tickers</h3>
        ${formHTML}
        <div id="watched-tickers-table-container" style="margin-top: 1.5rem;">
            ${tableHTML}
        </div>
    `;
}