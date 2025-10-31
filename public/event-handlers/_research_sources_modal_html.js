// public/event-handlers/_research_sources_modal_html.js
/**
 * @file Contains all "partial" HTML helper functions for building the Source Details modal.
 * @module event-handlers/_research_sources_modal_html
 */

import { state } from '../state.js'; // Needed for price cache
import { formatAccounting, formatQuantity } from '../ui/formatters.js';

/**
 * Escapes HTML special characters in a string.
 * @param {string | null | undefined} str The string to escape.
 * @returns {string} The escaped string.
 */
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Renders the Profile (top-left) section of the modal.
 * @param {object} source - The advice source data.
 * @returns {string} HTML string.
 */
export function _renderModalProfile(source) {
    let html = '<div class="source-profile-section">';
    html += `<h4>Profile</h4>`;
    const imagePath = source.image_path ? escapeHTML(source.image_path) : '/images/contacts/default.png'; // Default path
    html += `<img src="${imagePath}" alt="${escapeHTML(source.name)}" class="profile-image">`;
    html += `<p><strong>Name:</strong> ${escapeHTML(source.name)}</p>`;
    html += `<p><strong>Type:</strong> ${escapeHTML(source.type)}</p>`;
    html += `<p><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
    if (source.url) html += `<p><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;

    // --- FIX: Conditionally show contact info ---
    if (source.type === 'Person' || source.type === 'Group') {
        html += `<h5 style="margin-top: 1rem;">Contact Info</h5>`;
        if (source.details?.contact_person) html += `<p><strong>Person:</strong> ${escapeHTML(source.details.contact_person)}</p>`;
        if (source.details?.contact_email) html += `<p><strong>Email:</strong> ${escapeHTML(source.details.contact_email)}</p>`;
        if (source.details?.contact_phone) html += `<p><strong>Phone:</strong> ${escapeHTML(source.details.contact_phone)}</p>`;
        let appIconHTML = '';
        const appType = source.details?.contact_app_type?.toLowerCase();
        const appHandle = escapeHTML(source.details?.contact_app_handle);
        if (appType === 'signal') { appIconHTML = `<img src="/images/logos/signal.png" alt="Signal" class="contact-app-icon"> `; }
        else if (appType === 'whatsapp') { appIconHTML = `<img src="/images/logos/whatsapp.jpeg" alt="WhatsApp" class="contact-app-icon"> `; }
        if (source.details?.contact_app_type) { html += `<p><strong>App:</strong> ${appIconHTML}${escapeHTML(source.details.contact_app_type)}: ${appHandle || 'N/A'}</p>`; }
    }
    // --- END FIX ---

    // --- ADD: Display links from Book type ---
    if (source.type === 'Book') {
        if (source.details?.websites && source.details.websites.length > 0) {
            html += `<h5 style="margin-top: 1rem;">Websites</h5>`;
            html += source.details.websites.map(link => `<p><a href="${escapeHTML(link)}" target="_blank">${escapeHTML(link)}</a></p>`).join('');
        }
        if (source.details?.pdfs && source.details.pdfs.length > 0) {
            html += `<h5 style="margin-top: 1rem;">Documents</h5>`;
            html += source.details.pdfs.map(link => `<p><a href="${escapeHTML(link)}" target="_blank">${escapeHTML(link)}</a></p>`).join('');
        }
    }
    // --- END ADD ---

    html += '</div>';
    return html;
}

/**
 * Renders the Add Trade Idea (top-right) section of the modal.
 * @param {object} source - The advice source data.
 * @returns {string} HTML string.
 */
export function _renderModalAddIdeaForm(source) {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    let html = `<div class="add-ticker-section" id="add-trade-idea-form-container">`; // Added ID for show/hide
    html += `<h5>Add Trade Idea</h5>`;
    html += `
        <form class="add-watchlist-item-form" data-source-id="${source.id}">
             <input type="hidden" class="add-watchlist-journal-id-input" value="">

             <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 15px; align-items: end;">
                <div class="form-group" style="grid-column: span 2; margin-bottom: 0;"> <label for="add-wl-ticker-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Ticker*</label> <input type="text" id="add-wl-ticker-${source.id}" class="add-watchlist-ticker-input" placeholder="e.g., AAPL" required> </div>
                <div class="form-group" style="margin-bottom: 0;"> <label for="add-wl-rec-entry-low-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Entry Low</label> <input type="number" id="add-wl-rec-entry-low-${source.id}" class="add-watchlist-rec-entry-low-input" step="any" min="0" placeholder="Guideline Low"> </div>
                 <div class="form-group" style="margin-bottom: 0;"> <label for="add-wl-rec-entry-high-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Entry High</label> <input type="number" id="add-wl-rec-entry-high-${source.id}" class="add-watchlist-rec-entry-high-input" step="any" min="0" placeholder="Guideline High"> </div>
                <div class="form-group" style="margin-bottom: 0;"> <label for="add-wl-tp1-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Take Profit 1</label> <input type="number" id="add-wl-tp1-${source.id}" class="add-watchlist-tp1-input" step="any" min="0.01" placeholder="Guideline"> </div>
                <div class="form-group" style="margin-bottom: 0;"> <label for="add-wl-tp2-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Take Profit 2</label> <input type="number" id="add-wl-tp2-${source.id}" class="add-watchlist-tp2-input" step="any" min="0.01" placeholder="Guideline"> </div>
                 <div class="form-group" style="margin-bottom: 0;"> <label for="add-wl-rec-datetime-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Date</label> <input type="datetime-local" id="add-wl-rec-datetime-${source.id}" class="add-watchlist-rec-datetime-input" value="${localDateTime}"> </div>
                <div class="form-group" style="margin-bottom: 0;"> <label for="add-wl-rec-stop-loss-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Stop Loss</label> <input type="number" id="add-wl-rec-stop-loss-${source.id}" class="add-watchlist-rec-stop-loss-input" step="any" min="0.01" placeholder="Guideline"> </div>
                 <div style="grid-column: span 2; text-align: right; margin-top: 5px;"> <button type="submit" class="add-watchlist-ticker-button" style="padding: 8px 12px;">Add</button> </div>
            </div>
        </form>
    `;
    html += '</div>';
    return html;
}

/**
 * --- MODIFIED FUNCTION ---
 * Renders the "Add Technique" (Journal Entry) form for Book/Website types.
 * @param {object} source - The advice source data.
 * @returns {string} HTML string.
 */
export function _renderModalAddTechniqueForm(source) {
    let html = `<div class="add-ticker-section">`; // Use same styling as the other form
    html += `<h5>Add Technique / Method</h5>`;
    html += `
        <form class="add-technique-form" data-source-id="${source.id}">
             <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 15px; align-items: end;">
                
                <div class="form-group" style="grid-column: span 2; margin-bottom: 0;">
                    <label for="tech-entry-reason-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Description*</label>
                    <input type="text" id="tech-entry-reason-${source.id}" class="tech-entry-reason-input" placeholder="e.g., 'Chapter 5 Breakout Strategy'" required>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                    <label for="tech-chart-type-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Chart Type (Optional)</label>
                    <input type="text" id="tech-chart-type-${source.id}" class="tech-chart-type-input" placeholder="e.g., '5-min Heikin Ashi'">
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                    <label for="tech-image-path-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Image Path (Optional)</label>
                    <input type="text" id="tech-image-path-${source.id}" class="tech-image-path-input" placeholder="e.g., /images/book/chart1.png">
                </div>
                
                 <div class="form-group form-group-span-2" style="margin-bottom: 0;">
                    <label for="tech-notes-${source.id}" style="font-size: 0.8em; margin-bottom: 2px; font-weight: bold;">Notes</label>
                    <textarea id="tech-notes-${source.id}" class="tech-notes-input" rows="2" placeholder="Additional observations..."></textarea>
                </div>

                 <div style="grid-column: span 2; text-align: right; margin-top: 5px;">
                    <button type="submit" class="add-technique-button" style="padding: 8px 12px;">Add Technique</button>
                 </div>
            </div>
        </form>
    `;
    html += '</div>';
    return html;
}

/**
 * Renders the Summary Stats header section.
 * @param {object} stats - The summary stats object.
 * @returns {string} HTML string.
 */
export function _renderModalSummaryStats(stats) {
    let html = `<div class="summary-container source-summary-header" style="margin-top: 1.5rem; justify-content: space-around;">`;
    html += `<div class="summary-item"><h3>Total Ideas</h3><p>${stats.totalTrades}</p></div>`;
    html += `<div class="summary-item"><h3>Investment (Open)</h3><p>${formatAccounting(stats.totalInvestment)}</p></div>`;
    html += `<div class="summary-item"><h3>Unrealized P/L (Open)</h3><p class="${stats.totalUnrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalUnrealizedPL)}</p></div>`;
    html += `<div class="summary-item"><h3>Realized P/L (Closed)</h3><p class="${stats.totalRealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalRealizedPL)}</p></div>`;
    html += `</div>`;
    return html;
}

/**
 * Renders the "Trade Ideas" (Watchlist) table.
 * @param {any[]} watchlistItems - Array of watchlist items.
 * @param {Set<string>} linkedTxTickers - Set of tickers linked to real trades.
 * @param {Set<string>} paperTradeTickers - Set of tickers linked to paper trades.
 * @param {object} source - The parent advice source.
 * @returns {string} HTML string.
 */
export function _renderModalTradeIdeas(watchlistItems, linkedTxTickers, paperTradeTickers, source) {
    let html = `<h4 style="margin-top: 1rem;">Trade Ideas (${watchlistItems.length})</h4>`;
    if (watchlistItems.length > 0) {
        html += `<div style="max-height: 200px; overflow-y: auto;"><table class="recommended-trades-table mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr> 
                    <th>Ticker</th> 
                    <th>Date Added</th> 
                    <th class="numeric">Entry Range</th> 
                    <th class="numeric">Current $</th> 
                    <th class="numeric" title="Distance to Entry: Percentage difference between the current price and the recommended entry range.">Dist. to Entry</th> 
                    <th class="numeric">Guidelines (SL/TP1/TP2)</th> 
                    <th class="center-align">Actions</th> 
                </tr>
            </thead><tbody>`;
        watchlistItems.forEach(item => {
            const currentPriceData = state.priceCache.get(item.ticker); const currentPrice = (currentPriceData && typeof currentPriceData.price === 'number') ? currentPriceData.price : null;
            let entryRange = '--'; if (item.rec_entry_low !== null && item.rec_entry_high !== null) { entryRange = `${formatAccounting(item.rec_entry_low, false)} - ${formatAccounting(item.rec_entry_high, false)}`; } else if (item.rec_entry_low !== null) { entryRange = `${formatAccounting(item.rec_entry_low, false)}+`; } else if (item.rec_entry_high !== null) { entryRange = `Up to ${formatAccounting(item.rec_entry_high, false)}`; }
            let distance = '--'; let distClass = ''; if (currentPrice !== null && item.rec_entry_low !== null) { const distPercent = ((currentPrice - item.rec_entry_low) / item.rec_entry_low) * 100; distClass = distPercent >= 0 ? 'positive' : 'negative'; if (item.rec_entry_high !== null && currentPrice <= item.rec_entry_high) { distClass = 'positive'; distance = `In Range (${distPercent.toFixed(1)}%)`; } else { distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`; } } else if (currentPrice !== null && item.rec_entry_high !== null) { const distPercent = ((currentPrice - item.rec_entry_high) / item.rec_entry_high) * 100; distClass = distPercent > 0 ? 'negative' : 'positive'; distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`; }
            
            const recLimits = [
                item.rec_stop_loss ? `SL: ${formatAccounting(item.rec_stop_loss)}` : null,
                item.rec_tp1 ? `TP1: ${formatAccounting(item.rec_tp1)}` : null,
                item.rec_tp2 ? `TP2: ${formatAccounting(item.rec_tp2)}` : null
            ].filter(Boolean).join(' / ') || '--';
            
            const isLinkedToRealTrade = linkedTxTickers.has(item.ticker);
            const isLinkedToPaperTrade = paperTradeTickers.has(item.ticker);
            
            let buyOrLiveHTML = '';
            let paperOrPaperMarkerHTML = '';

            if (isLinkedToRealTrade) {
                buyOrLiveHTML = '<span class="marker-live" title="This idea is linked to a live trade.">✔ Live</span>';
            } else {
                buyOrLiveHTML = `
                    <button class="create-buy-order-btn" 
                        data-ticker="${escapeHTML(item.ticker)}" 
                        data-price=""
                        data-tp1="${item.rec_tp1 || ''}"
                        data-tp2="${item.rec_tp2 || ''}"
                        data-sl="${item.rec_stop_loss || ''}"
                        data-source-id="${source.id}" 
                        data-source-name="${escapeHTML(source.name)}" 
                        title="Create Buy Order from this Idea">Buy</button>
                `;
            }

            if (isLinkedToPaperTrade) {
                paperOrPaperMarkerHTML = ' <span class="marker-paper" title="This idea is linked to a paper trade.">✔ Paper</span>';
            } else {
                paperOrPaperMarkerHTML = `
                    <button class="create-paper-trade-btn" 
                        data-ticker="${escapeHTML(item.ticker)}" 
                        data-entry-low="${item.rec_entry_low || ''}"
                        data-entry-high="${item.rec_entry_high || ''}"
                        data-tp1="${item.rec_tp1 || ''}"
                        data-tp2="${item.rec_tp2 || ''}"
                        data-sl="${item.rec_stop_loss || ''}"
                        data-source-id="${source.id}" 
                        data-source-name="${escapeHTML(source.name)}" 
                        title="Add to Paper Trades">Paper</button>
                `;
            }
            
            const deleteButtonHTML = `<button class="delete-watchlist-item-button delete-btn" data-item-id="${item.id}" title="Close/Archive Idea">X</button>`;
            const actionButtonsHTML = buyOrLiveHTML + paperOrPaperMarkerHTML + deleteButtonHTML;

            html += `
                <tr> 
                    <td>${escapeHTML(item.ticker)}</td> 
                    <td>${new Date(item.created_at).toLocaleDateString()}</td> 
                    <td class="numeric">${entryRange}</td> 
                    <td class="numeric">${currentPrice ? formatAccounting(currentPrice) : '--'}</td> 
                    <td class="numeric ${distClass}">${distance}</td> 
                    <td class="numeric">${recLimits}</td>
                    <td class="center-align actions-cell">
                        ${actionButtonsHTML}
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<p>No trade ideas linked.</p>`;
    }
    return html;
}

/**
 * Renders the "Linked Real Trades" (Open and History) tables.
 * @param {any[]} linkedTransactions - Array of transaction objects.
 * @returns {string} HTML string.
 */
export function _renderModalRealTrades(linkedTransactions) {
    let html = '';
    const openRealTrades = linkedTransactions
        .filter(tx => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    const closedRealTrades = linkedTransactions
        .filter(tx => tx.transaction_type === 'SELL')
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    
    html += `<h4 style="margin-top: 1rem;">Linked Real Trades (Open) (${openRealTrades.length})</h4>`;
    if (openRealTrades.length > 0) {
        html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> <th>Ticker</th> <th class="numeric">Entry $</th> <th class="numeric">Rem. Qty</th> <th class="numeric">Current $</th> <th class="numeric">Unrealized P/L</th> <th>Status</th>
                </tr>
            </thead><tbody>`;
        openRealTrades.forEach(entry => {
            const pnl = entry.unrealized_pnl;
            const pnlClass = pnl !== null && pnl !== undefined ? (pnl >= 0 ? 'positive' : 'negative') : '';
            const pnlDisplay = pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
            const currentPriceDisplay = entry.current_price ? formatAccounting(entry.current_price) : '--';
            html += `
                <tr>
                    <td>${escapeHTML(entry.transaction_date) || 'N/A'}</td> 
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td> 
                    <td class="numeric">${formatAccounting(entry.price)}</td> 
                    <td class="numeric">${formatQuantity(entry.quantity_remaining)}</td> 
                    <td class="numeric">${currentPriceDisplay}</td> 
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td> 
                    <td>Open Lot</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<p>No open real-money trades linked to this source.</p>`;
    }

    html += `<h4 style="margin-top: 1rem;">Linked Real Trades (History) (${closedRealTrades.length})</h4>`;
    if (closedRealTrades.length > 0) {
            html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> <th>Ticker</th> <th>Type</th> <th class="numeric">Price</th> <th class="numeric">Qty</th> <th class="numeric">Realized P/L</th> <th>Status</th>
                </tr>
            </thead><tbody>`;
        
        // Note: Realized P/L for SELLs is calculated on the backend in the /api/sources/:id/details route
        closedRealTrades.forEach(entry => {
            let pnl = entry.realized_pnl; // This comes from the backend calculation
            let statusDisplay = 'SELL';
            
            const pnlClass = pnl !== null && pnl !== undefined ? (pnl >= 0 ? 'positive' : 'negative') : '';
            const pnlDisplay = pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
            html += `
                <tr class="text-muted">
                    <td>${escapeHTML(entry.transaction_date) || 'N/A'}</td> 
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td> 
                    <td>${statusDisplay}</td>
                    <td class="numeric">${formatAccounting(entry.price)}</td> 
                    <td class="numeric">${formatQuantity(entry.quantity)}</td> 
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td> 
                    <td>Sold</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<p>No closed or sold real-money trades linked to this source.</p>`;
    }
    return html;
}

/**
 * --- MODIFIED FUNCTION ---
 * Renders the "Tracked Paper Trades" (Open) table.
 * Title changes to "Techniques / Methods" for non-person source types.
 * @param {any[]} journalEntries - Array of journal entry objects.
 * @param {string} [sourceType='Person'] - The type of the source.
 * @returns {string} HTML string.
 */
export function _renderModalPaperTrades_Open(journalEntries, sourceType = 'Person') {
    let html = '';
    const isPersonOrGroup = (sourceType === 'Person' || sourceType === 'Group');
    const paperTradeTitle = isPersonOrGroup ? 'Tracked Paper Trades' : 'Techniques / Methods';
    
    const openJournalEntries = journalEntries.filter(entry => entry.status === 'OPEN');

    html += `<h4 style="margin-top: 1rem;">${paperTradeTitle} (${openJournalEntries.length})</h4>`;
    if (openJournalEntries.length > 0) {
        html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Entry Date</th> 
                    <th>Ticker</th>
                    <th class="center-align">Chart</th>
                    <th class="numeric">Entry $</th> 
                    <th class="numeric">Qty</th> 
                    <th class="numeric">Current $</th> 
                    <th class="numeric">Unrealized P/L</th> 
                    <th class="numeric">Guidelines (SL/TP1/TP2)</th> 
                    <th>Description</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;
        openJournalEntries.forEach(entry => {
            const pnl = entry.current_pnl;
            const pnlClass = pnl !== null && pnl !== undefined ? (pnl >= 0 ? 'positive' : 'negative') : '';
            const pnlDisplay = pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
            const currentPriceDisplay = entry.current_price ? formatAccounting(entry.current_price) : '--';
            const recLimits = [
                entry.stop_loss_price ? `SL: ${formatAccounting(entry.stop_loss_price)}` : null,
                entry.target_price ? `TP1: ${formatAccounting(entry.target_price)}` : null,
                entry.target_price_2 ? `TP2: ${formatAccounting(entry.target_price_2)}` : null
            ].filter(Boolean).join(' / ') || '--';
            
            // --- ADDED: Chart Thumbnail ---
            let chartThumbnail = '--';
            if (entry.image_path) {
                chartThumbnail = `<img src="${escapeHTML(entry.image_path)}" alt="Technique Chart" class="technique-image-thumbnail">`;
            }
            // --- END ADDED ---

            const actionButtons = `
                <button class="develop-trade-idea-btn" data-journal-id="${entry.id}" data-ticker="${escapeHTML(entry.ticker)}" data-entry="${entry.entry_price}" data-tp1="${entry.target_price || ''}" data-tp2="${entry.target_price_2 || ''}" data-sl="${entry.stop_loss_price || ''}" title="Develop Trade Idea from this Technique">Add Idea</button>
                <button class="delete-journal-btn delete-btn" data-journal-id="${entry.id}" title="Delete Technique">X</button>
            `;

            html += `
                <tr>
                    <td>${escapeHTML(entry.entry_date) || 'N/A'}</td> 
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td>
                    <td class="center-align">${chartThumbnail}</td> 
                    <td class="numeric">${formatAccounting(entry.entry_price)}</td> 
                    <td class="numeric">${formatQuantity(entry.quantity)}</td> 
                    <td class="numeric">${currentPriceDisplay}</td> 
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td> 
                    <td class="numeric">${recLimits}</td> 
                    <td style="white-space: normal; min-width: 150px;">${escapeHTML(entry.entry_reason) || '--'}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<p>No ${isPersonOrGroup ? 'paper trades' : 'techniques'} are being tracked for this source.</p>`;
    }
    return html;
}

/**
 * --- MODIFIED FUNCTION ---
 * Renders the "Completed Paper Trades" (Closed) table.
 * Title changes to "Completed Techniques" for non-person source types.
 * @param {any[]} journalEntries - Array of journal entry objects.
 * @param {string} [sourceType='Person'] - The type of the source.
 * @returns {string} HTML string.
 */
export function _renderModalPaperTrades_Closed(journalEntries, sourceType = 'Person') {
    let html = '';
    const isPersonOrGroup = (sourceType === 'Person' || sourceType === 'Group');
    const completedTradeTitle = isPersonOrGroup ? 'Completed Paper Trades' : 'Completed Techniques';
    
    const closedJournalEntries = journalEntries.filter(entry => ['CLOSED', 'EXECUTED'].includes(entry.status));
    
    html += `<h4 style="margin-top: 1rem;">${completedTradeTitle} (${closedJournalEntries.length})</h4>`;
    if (closedJournalEntries.length > 0) {
        html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Entry Date</th> 
                    <th>Exit Date</th> 
                    <th>Ticker</th>
                    <th class="center-align">Chart</th>
                    <th class="numeric">Entry $</th> 
                    <th class="numeric">Exit $</th> 
                    <th class="numeric">Qty</th> 
                    <th class="numeric">Realized P/L</th> 
                    <th>Description</th>
                    <th>Status</th>
                </tr>
            </thead><tbody>`;
        closedJournalEntries.forEach(entry => {
            const pnl = entry.pnl;
            const pnlClass = pnl !== null && pnl !== undefined ? (pnl >= 0 ? 'positive' : 'negative') : '';
            const pnlDisplay = pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
            const statusDisplay = entry.status === 'EXECUTED' && entry.linked_trade_id ? `Executed (Tx #${entry.linked_trade_id})` : escapeHTML(entry.status);

            // --- ADDED: Chart Thumbnail ---
            let chartThumbnail = '--';
            if (entry.image_path) {
                chartThumbnail = `<img src="${escapeHTML(entry.image_path)}" alt="Technique Chart" class="technique-image-thumbnail">`;
            }
            // --- END ADDED ---

            html += `
                <tr class="text-muted">
                    <td>${escapeHTML(entry.entry_date) || 'N/A'}</td> 
                    <td>${escapeHTML(entry.exit_date) || '--'}</td> 
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td>
                    <td class="center-align">${chartThumbnail}</td> 
                    <td class="numeric">${formatAccounting(entry.entry_price)}</td> 
                    <td class="numeric">${entry.exit_price ? formatAccounting(entry.exit_price) : '--'}</td> 
                    <td class="numeric">${formatQuantity(entry.quantity)}</td> 
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td> 
                    <td style="white-space: normal; min-width: 150px;">${escapeHTML(entry.entry_reason) || '--'}</td>
                    <td>${statusDisplay}</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<p>No completed ${isPersonOrGroup ? 'paper trades' : 'techniques'} linked to this source.</p>`;
    }
    return html;
}


/**
 * Renders the "Linked Documents" section and its "Add" form.
 * @param {any[]} documents - Array of document objects.
 * @param {object} source - The parent advice source.
 * @returns {string} HTML string.
 */
export function _renderModalDocuments(documents, source) {
    let html = `<h4 style="margin-top: 1rem;">Linked Documents (${documents.length})</h4>`;
    if (documents.length > 0) {
        html += `<ul class="linked-items-list">`;
         documents.forEach(doc => {
            const titleDisplay = escapeHTML(doc.title) || 'Untitled Document'; const typeDisplay = doc.document_type ? `(${escapeHTML(doc.document_type)})` : ''; const descDisplay = doc.description ? `- ${escapeHTML(doc.description)}` : '';
            html += `<li style="display: flex; justify-content: space-between; align-items: center;"> <span><a href="${escapeHTML(doc.external_link)}" target="_blank">${titleDisplay}</a> ${typeDisplay} ${descDisplay}</span> <button class="delete-document-button delete-btn" data-doc-id="${doc.id}" title="Delete Document Link" style="padding: 2px 5px; font-size: 0.8em;">X</button> </li>`;
        });
        html += `</ul>`;
    } else { html += `<p>No documents linked.</p>`; }
    html += `<form class="add-document-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Document Link</h5> <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"> <input type="text" class="add-doc-title-input" placeholder="Title (Optional)" style="grid-column: span 2;"> <input type="text" class="add-doc-type-input" placeholder="Type (e.g., Chart)"> <input type="url" class="add-doc-link-input" placeholder="External Link (http://...)" required> <textarea class="add-doc-desc-input" placeholder="Description (Optional)" rows="2" style="grid-column: span 2;"></textarea> <button type="submit" class="add-document-button" style="grid-column: 2 / 3; justify-self: end;">Add Link</button> </div> </form>`;
    return html;
}

/**
 * Renders the "Source Notes" section and its "Add" form.
 * @param {any[]} sourceNotes - Array of note objects.
 * @param {object} source - The parent advice source.
 * @returns {string} HTML string.
 */
export function _renderModalNotes(sourceNotes, source) {
    let html = `<h4 style="margin-top: 1rem;">Notes (${sourceNotes.length})</h4>`;
     if (sourceNotes.length > 0) {
        html += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
        const sortedNotes = [...sourceNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        sortedNotes.forEach(note => {
            const escapedNoteContent = escapeHTML(note.note_content); const createdDateStr = new Date(note.created_at).toLocaleString(); const updatedDateStr = new Date(note.updated_at).toLocaleString(); const editedMarker = note.updated_at > note.created_at ? ` (edited ${updatedDateStr})` : '';
             html += `<li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--container-border);" data-note-id="${note.id}"> <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;"> <small><i>${createdDateStr}${editedMarker}</i></small> <div class="note-actions"> <button class="edit-source-note-button" title="Edit Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">Edit</button> <button class="delete-source-note-button delete-btn" data-note-id="${note.id}" title="Delete Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">X</button> </div> </div> <div class="note-content-display">${escapedNoteContent.replace(/\n/g, '<br>')}</div> <div class="note-content-edit" style="display: none;"> <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box;">${escapedNoteContent}</textarea> <div style="text-align: right; margin-top: 5px;"> <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button> <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button> </div> </div> </li>`;
        });
        html += `</ul>`;
    } else { html += `<p>No notes added.</p>`; }
    html += `<form class="add-source-note-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Note</h5> <textarea class="add-note-content-textarea" placeholder="Enter your note..." required rows="3" style="width: 100%; box-sizing: border-box; margin-bottom: 5px;"></textarea> <div style="text-align: right;"> <button type="submit" class="add-source-note-button">Add Note</button> </div> </form>`;
    return html;
}