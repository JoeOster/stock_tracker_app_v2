// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_research_sources_modal_html.js
/**
 * @file Contains all "partial" HTML helper functions for building the Source Details modal.
 * @module event-handlers/_research_sources_modal_html
 */

import { state } from '../state.js'; // Needed for price cache
import {
  formatAccounting,
  formatQuantity,
  formatDate,
  formatPercent,
} from '../ui/formatters.js';
import { getSourceNameFromId } from '../ui/dropdowns.js';

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
  const imagePath = source.image_path
    ? escapeHTML(source.image_path)
    : '/images/contacts/default.png'; // Default path
  html += `<img src="${imagePath}" alt="${escapeHTML(source.name)}" class="profile-image">`;
  html += `<p><strong>Name:</strong> ${escapeHTML(source.name)}</p>`;
  html += `<p><strong>Type:</strong> ${escapeHTML(source.type)}</p>`;
  html += `<p><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
  if (source.url)
    html += `<p><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;

  if (source.type === 'Person') {
    html += `<h5 style="margin-top: 1rem;">Contact Info</h5>`;
    if (source.details?.contact_email)
      html += `<p><strong>Email:</strong> ${escapeHTML(source.details.contact_email)}</p>`;
    if (source.details?.contact_phone)
      html += `<p><strong>Phone:</strong> ${escapeHTML(source.details.contact_phone)}</p>`;
  } else if (source.type === 'Group') {
    html += `<h5 style="margin-top: 1rem;">Contact Info</h5>`;
    if (source.details?.contact_person)
      html += `<p><strong>Primary Contact:</strong> ${escapeHTML(source.details.contact_person)}</p>`;
    if (source.details?.contact_email)
      html += `<p><strong>Email:</strong> ${escapeHTML(source.details.contact_email)}</p>`;
    if (source.details?.contact_phone)
      html += `<p><strong>Phone:</strong> ${escapeHTML(source.details.contact_phone)}</p>`;
  }

  if (source.type === 'Person' || source.type === 'Group') {
    let appIconHTML = '';
    const appType = source.details?.contact_app_type?.toLowerCase();
    const appHandle = escapeHTML(source.details?.contact_app_handle);
    if (appType === 'signal') {
      appIconHTML = `<img src="/images/logos/signal.png" alt="Signal" class="contact-app-icon"> `;
    } else if (appType === 'whatsapp') {
      appIconHTML = `<img src="/images/logos/whatsapp.jpeg" alt="WhatsApp" class="contact-app-icon"> `;
    }
    if (source.details?.contact_app_type) {
      html += `<p><strong>App:</strong> ${appIconHTML}${escapeHTML(source.details.contact_app_type)}: ${appHandle || 'N/A'}</p>`;
    }
  }

  if (source.type === 'Book') {
    if (source.details?.websites && source.details.websites.length > 0) {
      html += `<h5 style="margin-top: 1rem;">Websites</h5>`;
      html += source.details.websites
        .map(
          (link) =>
            `<p><a href="${escapeHTML(link)}" target="_blank">${escapeHTML(link)}</a></p>`
        )
        .join('');
    }
    if (source.details?.pdfs && source.details.pdfs.length > 0) {
      html += `<h5 style="margin-top: 1rem;">Documents</h5>`;
      html += source.details.pdfs
        .map(
          (link) =>
            `<p><a href="${escapeHTML(link)}" target="_blank">${escapeHTML(link)}</a></p>`
        )
        .join('');
    }
  }

  html += '</div>';
  return html;
}

/**
 * Renders the top-right "Actions" panel, with conditional buttons based on source type.
 * @param {object} source - The advice source data.
 * @returns {string} HTML string.
 */
export function _renderModalActionsPanel(source) {
  let html = `<div class="add-ticker-section" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem;">`;

  const sourceId = source.id;
  const sourceName = escapeHTML(source.name);

  if (source.type === 'Person' || source.type === 'Group') {
    // For Person/Group, show "Add Trade Idea"
    html += `
            <button id="add-idea-from-source-btn" data-source-id="${sourceId}" data-source-name="${sourceName}" style="width: 100%;">
                Add Trade Idea
            </button>
        `;
  } else {
    // For Book/Website/Other, show "Add Technique"
    html += `
            <button id="add-technique-btn" data-source-id="${sourceId}" data-source-name="${sourceName}" style="width: 100%;">
                Add Technique
            </button>
        `;
  }

  html += '</div>';
  return html;
}

/**
 * --- MODIFIED FUNCTION ---
 * Renders the Summary Stats panel.
 * @param {object} stats - The summary stats object.
 * @returns {string} HTML string.
 */
export function _renderModalSummaryStats(stats) {
  // --- THIS IS THE FIX ---
  // Use 'source-profile-section' class for consistent styling with the profile
  // Add margin-top to separate it from the action button above it.
  let html = `<div class="source-profile-section" style="margin-top: 1.5rem;">`;
  // Add a title "Summary"
  html += `<h4 style="margin-top: 0; margin-bottom: 1rem;">Summary</h4>`;

  // Use the same <p> styling as the profile
  html += `<p style="margin: 0.4rem 0;"><strong>Total Ideas:</strong> ${stats.totalTrades}</p>`;
  html += `<p style="margin: 0.4rem 0;"><strong>Investment (Open):</strong> ${formatAccounting(stats.totalInvestment)}</p>`;
  html += `<p style="margin: 0.4rem 0;"><strong>Unrealized P/L (Open):</strong> <span class="${stats.totalUnrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalUnrealizedPL)}</span></p>`;
  html += `<p style="margin: 0.4rem 0;"><strong>Realized P/L (Closed):</strong> <span class="${stats.totalRealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalRealizedPL)}</span></p>`;
  html += `</div>`;
  // --- END FIX ---
  return html;
}

/**
 * Renders the "Trade Ideas" (Watchlist) table.
 * @param {any[]} watchlistItems - Array of watchlist items.
 * @param {Set<string>} linkedTxTickers - Set of tickers linked to real trades.
 * @param {Set<string>} paperTradeTickers - Set of tickers linked to paper trades.
 * @param {object} source - The parent advice source.
 * @param {any[]} journalEntries - All journal entries (needed to link techniques).
 * @returns {string} HTML string.
 */
export function _renderModalTradeIdeas(
  watchlistItems,
  linkedTxTickers,
  paperTradeTickers,
  source,
  journalEntries
) {
  let html = `<h4 style="margin-top: 1rem;">Trade Ideas (${watchlistItems.length})</h4>`;
  if (watchlistItems.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="recommended-trades-table mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr> 
                    <th>Ticker</th> 
                    <th>From Technique</th>
                    <th class="numeric">Entry Range</th> 
                    <th class="numeric">Current $</th> 
                    <th class="numeric" title="Distance to Entry: Percentage difference between the current price and the recommended entry range.">Dist. to Entry</th> 
                    <th class="numeric">Guidelines (SL/TP1/TP2)</th> 
                    <th class="center-align">Actions</th> 
                </tr>
            </thead><tbody>`;
    watchlistItems.forEach((item) => {
      const currentPriceData = state.priceCache.get(item.ticker);
      const currentPrice =
        currentPriceData && typeof currentPriceData.price === 'number'
          ? currentPriceData.price
          : null;
      let entryRange = '--';
      if (item.rec_entry_low !== null && item.rec_entry_high !== null) {
        entryRange = `${formatAccounting(item.rec_entry_low, false)} - ${formatAccounting(item.rec_entry_high, false)}`;
      } else if (item.rec_entry_low !== null) {
        entryRange = `${formatAccounting(item.rec_entry_low, false)}+`;
      } else if (item.rec_entry_high !== null) {
        entryRange = `Up to ${formatAccounting(item.rec_entry_high, false)}`;
      }
      let distance = '--';
      let distClass = '';
      if (currentPrice !== null && item.rec_entry_low !== null) {
        const distPercent =
          ((currentPrice - item.rec_entry_low) / item.rec_entry_low) * 100;
        distClass = distPercent >= 0 ? 'positive' : 'negative';
        if (
          item.rec_entry_high !== null &&
          currentPrice <= item.rec_entry_high
        ) {
          distClass = 'positive';
          distance = `In Range (${distPercent.toFixed(1)}%)`;
        } else {
          distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`;
        }
      } else if (currentPrice !== null && item.rec_entry_high !== null) {
        const distPercent =
          ((currentPrice - item.rec_entry_high) / item.rec_entry_high) * 100;
        distClass = distPercent > 0 ? 'negative' : 'positive';
        distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`;
      }

      const recLimits =
        [
          item.rec_stop_loss
            ? `SL: ${formatAccounting(item.rec_stop_loss)}`
            : null,
          item.rec_tp1 ? `TP1: ${formatAccounting(item.rec_tp1)}` : null,
          item.rec_tp2 ? `TP2: ${formatAccounting(item.rec_tp2)}` : null,
        ]
          .filter(Boolean)
          .join(' / ') || '--';

      const isLinkedToRealTrade = linkedTxTickers.has(item.ticker);
      const isLinkedToPaperTrade = paperTradeTickers.has(item.ticker);

      const technique = item.journal_entry_id
        ? journalEntries.find((j) => j.id === item.journal_entry_id)
        : null;
      const techniqueName = technique
        ? escapeHTML(technique.entry_reason)
        : '--';

      let buyOrLiveHTML = '';
      let paperOrPaperMarkerHTML = '';

      if (isLinkedToRealTrade) {
        buyOrLiveHTML =
          '<span class="marker-live" title="This idea is linked to a live trade.">✔ Live</span>';
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
                        data-journal-id="${item.journal_entry_id || ''}"
                        title="Create Buy Order from this Idea">Buy</button>
                `;
      }

      if (isLinkedToPaperTrade) {
        paperOrPaperMarkerHTML =
          ' <span class="marker-paper" title="This idea is linked to a paper trade.">✔ Paper</span>';
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
      const actionButtonsHTML =
        buyOrLiveHTML + paperOrPaperMarkerHTML + deleteButtonHTML;

      html += `
                <tr> 
                    <td>${escapeHTML(item.ticker)}</td> 
                    <td style="white-space: normal; min-width: 150px;">${techniqueName}</td>
                    <td class="numeric">${entryRange}</td> 
                    <td class_numeric">${currentPrice ? formatAccounting(currentPrice) : '--'}</td> 
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
 * Renders the "Techniques / Methods" (Open) table.
 * @param {any[]} journalEntries - Array of *pre-filtered* journal entries (qty 0, status OPEN).
 * @returns {string} HTML string.
 */
export function _renderModalTechniques_Open(journalEntries) {
  let html = '';
  const paperTradeTitle = 'Techniques / Methods'; // Hardcoded title

  html += `<h4 style="margin-top: 1rem;">${paperTradeTitle} (${journalEntries.length})</h4>`;
  if (journalEntries.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="center-align">Chart</th>
                    <th>Chart Type / Notes</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;
    journalEntries.forEach((entry) => {
      let chartThumbnail = '--';
      if (entry.image_path) {
        chartThumbnail = `<img src="${escapeHTML(entry.image_path)}" alt="Technique Chart" class="technique-image-thumbnail">`;
      }

      let notesDisplay = escapeHTML(entry.notes) || '--';
      if (notesDisplay.startsWith('Chart Type:')) {
        const match = notesDisplay.match(/^Chart Type: (.*?)\n\n(.*)$/s);
        if (match) {
          notesDisplay = `<strong>${match[1]}</strong><br>${match[2].replace(/\n/g, '<br>')}`;
        } else {
          notesDisplay = notesDisplay.replace(/\n/g, '<br>');
        }
      } else {
        notesDisplay = notesDisplay.replace(/\n/g, '<br>');
      }

      const actionButtons = `
                <button class="develop-trade-idea-btn" data-journal-id="${entry.id}" data-ticker="${escapeHTML(entry.ticker)}" data-entry="${entry.entry_price}" data-tp1="${entry.target_price || ''}" data-tp2="${entry.target_price_2 || ''}" data-sl="${entry.stop_loss_price || ''}" title="Develop Trade Idea from this Technique">Add Idea</button>
                <button class="edit-journal-technique-btn" data-journal-id="${entry.id}" title="Edit Technique">Edit</button>
                <button class="delete-journal-btn delete-btn" data-journal-id="${entry.id}" title="Archive Technique">X</button>
            `;

      html += `
                <tr>
                    <td style="white-space: normal; min-width: 150px;">${escapeHTML(entry.entry_reason) || '--'}</td>
                    <td class="center-align">${chartThumbnail}</td> 
                    <td style="white-space: normal; min-width: 200px;">${notesDisplay}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No ${paperTradeTitle.toLowerCase()} are being tracked for this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Completed Techniques" (Closed) table.
 * @param {any[]} journalEntries - Array of *pre-filtered* journal entries (qty 0, status != OPEN).
 * @returns {string} HTML string.
 */
export function _renderModalTechniques_Closed(journalEntries) {
  let html = `<h4 style="margin-top: 1rem;">Completed Techniques (${journalEntries.length})</h4>`;
  if (journalEntries.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Exit Date</th> 
                    <th class="center-align">Chart</th>
                    <th>Chart Type / Notes</th>
                    <th>Status</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;
    journalEntries.forEach((entry) => {
      const statusDisplay =
        entry.status === 'EXECUTED' && entry.linked_trade_id
          ? `Executed (Tx #${entry.linked_trade_id})`
          : escapeHTML(entry.status);

      let chartThumbnail = '--';
      if (entry.image_path) {
        chartThumbnail = `<img src="${escapeHTML(entry.image_path)}" alt="Technique Chart" class="technique-image-thumbnail">`;
      }

      let notesDisplay = escapeHTML(entry.notes) || '--';
      if (notesDisplay.startsWith('Chart Type:')) {
        const match = notesDisplay.match(/^Chart Type: (.*?)\n\n(.*)$/s);
        if (match) {
          notesDisplay = `<strong>${match[1]}</strong><br>${match[2].replace(/\n/g, '<br>')}`;
        } else {
          notesDisplay = notesDisplay.replace(/\n/g, '<br>');
        }
      } else {
        notesDisplay = notesDisplay.replace(/\n/g, '<br>');
      }

      const actionButtons = `
                <button class="edit-journal-technique-btn" data-journal-id="${entry.id}" title="Edit Technique">Edit</button>
                <button class="delete-journal-btn delete-btn" data-journal-id="${entry.id}" title="Archive Technique">X</button>
            `;

      html += `
                <tr class="text-muted">
                    <td style="white-space: normal; min-width: 150px;">${escapeHTML(entry.entry_reason) || '--'}</td>
                    <td>${escapeHTML(entry.exit_date) || '--'}</td> 
                    <td class="center-align">${chartThumbnail}</td> 
                    <td style="white-space: normal; min-width: 200px;">${notesDisplay}</td>
                    <td>${statusDisplay}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No completed techniques linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Tracked Paper Trades" (Open) table.
 * @param {any[]} journalEntries - Array of *pre-filtered* journal entries (qty > 0, status OPEN).
 * @returns {string} HTML string.
 */
export function _renderModalPaperTrades_Open(journalEntries) {
  let html = `<h4 style="margin-top: 1rem;">Tracked Paper Trades (${journalEntries.length})</h4>`;
  if (journalEntries.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> 
                    <th>Ticker</th> 
                    <th class="numeric">Entry $</th> 
                    <th class="numeric">Qty</th> 
                    <th class="numeric">Current $</th> 
                    <th class="numeric">Unrealized P/L</th> 
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;

    journalEntries.forEach((entry) => {
      const priceData = state.priceCache.get(entry.ticker);
      let currentPL = 0;
      let plClass = '';

      if (
        priceData &&
        typeof priceData.price === 'number' &&
        priceData.price > 0
      ) {
        if (entry.direction === 'BUY') {
          currentPL = (priceData.price - entry.entry_price) * entry.quantity;
        } else {
          currentPL = (entry.entry_price - priceData.price) * entry.quantity;
        }
        plClass = currentPL >= 0 ? 'positive' : 'negative';
      }

      const currentPriceDisplay =
        priceData && typeof priceData.price === 'number'
          ? formatAccounting(priceData.price)
          : priceData?.price || '--';

      const actionButtons = `
                <button class="journal-edit-btn" data-id="${entry.id}" title="Edit Entry">✏️</button>
                <button class="journal-delete-btn delete-btn" data-id="${entry.id}" title="Delete Entry">🗑️</button>
            `;

      html += `
                <tr>
                    <td>${formatDate(entry.entry_date)}</td>
                    <td>${escapeHTML(entry.ticker)}</td>
                    <td class="numeric">${formatAccounting(entry.entry_price)}</td>
                    <td class="numeric">${formatQuantity(entry.quantity)}</td>
                    <td class-="numeric">${currentPriceDisplay}</td>
                    <td class="numeric ${plClass}">${formatAccounting(currentPL)}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No open paper trades linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Completed Paper Trades" (Closed/Executed) table.
 * @param {any[]} journalEntries - Array of *pre-filtered* journal entries (qty > 0, status != OPEN).
 * @returns {string} HTML string.
 */
export function _renderModalPaperTrades_Closed(journalEntries) {
  let html = `<h4 style="margin-top: 1rem;">Completed Paper Trades (${journalEntries.length})</h4>`;
  if (journalEntries.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Entry Date</th> 
                    <th>Exit Date</th> 
                    <th>Ticker</th> 
                    <th class="numeric">Entry $</th> 
                    <th class="numeric">Exit $</th> 
                    <th class="numeric">Qty</th> 
                    <th class="numeric">Realized P/L</th> 
                    <th>Status</th>
                    <th class="center-align">Actions</th>
                </tr>
            </thead><tbody>`;
    journalEntries.forEach((entry) => {
      const pl = entry.pnl ?? 0;
      const plClass = pl >= 0 ? 'positive' : 'negative';
      const statusText =
        entry.status === 'EXECUTED'
          ? `Executed (Tx #${entry.linked_trade_id})`
          : escapeHTML(entry.status);

      const actionButtons = `
                <button class="journal-edit-btn" data-id="${entry.id}" title="Edit Entry">✏️</button>
                <button class="journal-delete-btn delete-btn" data-id="${entry.id}" title="Delete Entry">🗑️</button>
            `;

      html += `
                <tr class="text-muted">
                    <td>${formatDate(entry.entry_date)}</td>
                    <td>${formatDate(entry.exit_date)}</td>
                    <td>${escapeHTML(entry.ticker)}</td>
                    <td class="numeric">${formatAccounting(entry.entry_price)}</td>
                    <td class="numeric">${formatAccounting(entry.exit_price)}</td>
                    <td class="numeric">${formatQuantity(entry.quantity)}</td>
                    <td class="numeric ${plClass}">${formatAccounting(pl)}</td>
                    <td>${statusText}</td>
                    <td class="center-align actions-cell">${actionButtons}</td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No completed paper trades linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Linked Real Trades" (Open) table.
 * @param {any[]} openRealTrades - Array of open transaction objects.
 * @returns {string} HTML string.
 */
export function _renderModalRealTrades_Open(openRealTrades) {
  let html = `<h4 style="margin-top: 1rem;">Linked Real Trades (Open) (${openRealTrades.length})</h4>`;
  if (openRealTrades.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> <th>Ticker</th> <th class="numeric">Entry $</th> <th class="numeric">Rem. Qty</th> <th class="numeric">Current $</th> <th class="numeric">Unrealized P/L</th> 
                    <th class="center-align actions-cell">Actions</th>
                </tr>
            </thead><tbody>`;
    openRealTrades.forEach((entry) => {
      const pnl = entry.unrealized_pnl;
      const pnlClass =
        pnl !== null && pnl !== undefined
          ? pnl >= 0
            ? 'positive'
            : 'negative'
          : '';
      const pnlDisplay =
        pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
      const currentPriceDisplay = entry.current_price
        ? formatAccounting(entry.current_price)
        : '--';

      html += `
                <tr>
                    <td>${escapeHTML(entry.transaction_date) || 'N/A'}</td> 
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td> 
                    <td class="numeric">${formatAccounting(entry.price)}</td> 
                    <td class="numeric">${formatQuantity(entry.quantity_remaining)}</td> 
                    <td class="numeric">${currentPriceDisplay}</td> 
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td> 
                    <td class="center-align actions-cell">
                        <button class="sell-from-lot-btn-source" 
                            data-buy-id="${entry.id}" 
                            data-ticker="${escapeHTML(entry.ticker)}" 
                            data-exchange="${escapeHTML(entry.exchange)}" 
                            data-quantity="${entry.quantity_remaining}"
                            title="Sell from this lot">Sell</button>
                    </td>
                </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<p>No open real-money trades linked to this source.</p>`;
  }
  return html;
}

/**
 * Renders the "Linked Real Trades" (History) table.
 * @param {any[]} closedRealTrades - Array of SELL transaction objects.
 * @returns {string} HTML string.
 */
export function _renderModalRealTrades_Closed(closedRealTrades) {
  let html = `<h4 style="margin-top: 1rem;">Linked Real Trades (History) (${closedRealTrades.length})</h4>`;
  if (closedRealTrades.length > 0) {
    html += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Date</th> <th>Ticker</th> <th>Type</th> <th class="numeric">Price</th> <th class="numeric">Qty</th> <th class="numeric">Realized P/L</th> <th>Status</th>
                </tr>
            </thead><tbody>`;

    closedRealTrades.forEach((entry) => {
      let pnl = entry.realized_pnl; // This comes from the backend calculation
      let statusDisplay = 'SELL';

      const pnlClass =
        pnl !== null && pnl !== undefined
          ? pnl >= 0
            ? 'positive'
            : 'negative'
          : '';
      const pnlDisplay =
        pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
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
 * Renders the "Linked Documents" section and its "Add" form.
 * @param {any[]} documents - Array of document objects.
 * @param {object} source - The parent advice source.
 * @returns {string} HTML string.
 */
export function _renderModalDocuments(documents, source) {
  let html = `<h4 style="margin-top: 1rem;">Linked Documents (${documents.length})</h4>`;
  if (documents.length > 0) {
    html += `<ul class="linked-items-list">`;
    documents.forEach((doc) => {
      const titleDisplay = escapeHTML(doc.title) || 'Untitled Document';
      const typeDisplay = doc.document_type
        ? `(${escapeHTML(doc.document_type)})`
        : '';
      const descDisplay = doc.description
        ? `- ${escapeHTML(doc.description)}`
        : '';
      html += `<li style="display: flex; justify-content: space-between; align-items: center;"> <span><a href="${escapeHTML(doc.external_link)}" target="_blank">${titleDisplay}</a> ${typeDisplay} ${descDisplay}</span> <button class="delete-document-button delete-btn" data-doc-id="${doc.id}" title="Delete Document Link" style="padding: 2px 5px; font-size: 0.8em;">X</button> </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>No documents linked.</p>`;
  }
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
    const sortedNotes = [...sourceNotes].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    sortedNotes.forEach((note) => {
      const escapedNoteContent = escapeHTML(note.note_content);
      const createdDateStr = new Date(note.created_at).toLocaleString();
      const updatedDateStr = new Date(note.updated_at).toLocaleString();
      const editedMarker =
        note.updated_at > note.created_at ? ` (edited ${updatedDateStr})` : '';
      html += `<li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--container-border);" data-note-id="${note.id}"> <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;"> <small><i>${createdDateStr}${editedMarker}</i></small> <div class="note-actions"> <button class="edit-source-note-button" title="Edit Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">Edit</button> <button class="delete-source-note-button delete-btn" data-note-id="${note.id}" title="Delete Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">X</button> </div> </div> <div class="note-content-display">${escapedNoteContent.replace(/\n/g, '<br>')}</div> <div class="note-content-edit" style="display: none;"> <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box;">${escapedNoteContent}</textarea> <div style="text-align: right; margin-top: 5px;"> <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button> <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button> </div> </div> </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>No notes added.</p>`;
  }
  html += `<form class="add-source-note-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Note</h5> <textarea class="add-note-content-textarea" placeholder="Enter your note..." required rows="3" style="width: 100%; box-sizing: border-box; margin-bottom: 5px;"></textarea> <div style="text-align: right;"> <button type="submit" class="add-source-note-button">Add Note</button> </div> </form>`;
  return html;
}
