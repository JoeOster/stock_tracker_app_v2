// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_research_sources_modal.js
/**
 * @file Orchestrates the rendering of the Source Details modal by calling partial HTML functions.
 * @module event-handlers/_research_sources_modal
 */

import {
  _renderModalProfile,
  _renderModalActionsPanel,
  _renderModalSummaryStats,
  _renderModalTradeIdeas,
  _renderModalRealTrades,
  _renderModalPaperTrades_Open,
  _renderModalPaperTrades_Closed,
  _renderModalDocuments,
  _renderModalNotes,
} from './_research_sources_modal_html.js';
import { state } from '../state.js'; // Needed for price cache

/**
 * Generates the complete HTML content for the Source Details modal.
 * @param {object} details - The aggregated data from the API.
 * @returns {string} The full HTML string for the modal's content.
 */
export function generateSourceDetailsHTML(details) {
  // Destructure all the data we need
  const {
    source,
    summaryStats,
    watchlistItems,
    linkedTransactions,
    journalEntries,
    documents,
    sourceNotes,
  } = details;

  // --- Create sets for efficient lookups ---
  // Tickers from open 'BUY' transactions
  const linkedTxTickers = new Set(
    linkedTransactions
      .filter(
        (tx) => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0
      )
      .map((tx) => tx.ticker)
  );

  // Tickers from open 'journal_entries' (paper trades)
  const paperTradeTickers = new Set(
    journalEntries
      .filter((entry) => entry.status === 'OPEN')
      .map((entry) => entry.ticker)
  );

  // --- Render all partials ---
  const profileHtml = _renderModalProfile(source);
  const actionsHtml = _renderModalActionsPanel(source);
  const summaryHtml = _renderModalSummaryStats(summaryStats);

  // --- *** THIS IS THE FIX: Pass journalEntries to _renderModalTradeIdeas *** ---
  const tradeIdeasHtml = _renderModalTradeIdeas(
    watchlistItems,
    linkedTxTickers,
    paperTradeTickers,
    source,
    journalEntries // <-- ADDED
  );
  // --- *** END FIX *** ---

  const realTradesHtml = _renderModalRealTrades(linkedTransactions);
  const paperOpenHtml = _renderModalPaperTrades_Open(
    journalEntries,
    source.type
  );
  const paperClosedHtml = _renderModalPaperTrades_Closed(
    journalEntries,
    source.type
  );
  const documentsHtml = _renderModalDocuments(documents, source);
  const notesHtml = _renderModalNotes(sourceNotes, source);

  // --- Assemble the final HTML ---
  return `
        <div class="modal-grid">
            <div class="modal-grid-left">
                ${profileHtml}
            </div>
            <div class="modal-grid-right">
                ${actionsHtml}
            </div>
        </div>
        
        ${summaryHtml}

        <div class="modal-section">
            ${tradeIdeasHtml}
        </div>
        
        <div class="modal-section">
            ${paperOpenHtml}
        </div>
        
        <div class="modal-section">
            ${paperClosedHtml}
        </div>

        <div class="modal-section">
            ${realTradesHtml}
        </div>
        
        <div class="modal-grid-bottom">
            <div class="modal-grid-left">
                ${documentsHtml}
            </div>
            <div class="modal-grid-right">
                ${notesHtml}
            </div>
        </div>
    `;
}
