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
  // --- MODIFIED: Import new/renamed functions ---
  _renderModalTechniques_Open,
  _renderModalTechniques_Closed,
  _renderModalRealTrades_Open,
  _renderModalRealTrades_Closed,
  // --- END MODIFIED ---
  _renderModalDocuments,
  _renderModalNotes,
} from './_research_sources_modal_html.js';

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

  // --- MODIFIED: Split journal entries into Techniques and Paper Trades ---
  const techniques = journalEntries.filter(
    (j) => !j.quantity || j.quantity === 0
  );
  // const paperTrades = journalEntries.filter((j) => j.quantity > 0);
  // --- END MODIFIED ---

  // Tickers from open 'journal_entries' (paper trades)
  const paperTradeTickers = new Set();
  // const paperTradeTickers = new Set(
  //   paperTrades
  //     .filter((entry) => entry.status === 'OPEN')
  //     .map((entry) => entry.ticker)
  // );

  // --- Render all partials ---
  const profileHtml = _renderModalProfile(source);
  const actionsHtml = _renderModalActionsPanel(source);
  const summaryHtml = _renderModalSummaryStats(summaryStats);

  // --- MODIFIED: Build sections based on new logic ---

  // 1. Techniques (Book/Website only)
  let techniquesHtml = '';
  if (source.type === 'Book' || source.type === 'Website') {
    const openTechniques = techniques.filter((t) => t.status === 'OPEN');
    const closedTechniques = techniques.filter(
      (t) => t.status !== 'OPEN' // e.g., 'CLOSED', 'CANCELLED'
    );
    // Note: Techniques don't have a "historical" section, just open/closed.
    techniquesHtml =
      _renderModalTechniques_Open(openTechniques) +
      _renderModalTechniques_Closed(closedTechniques);
  }

  // 2. Trade Ideas (All source types)
  const tradeIdeasHtml = _renderModalTradeIdeas(
    watchlistItems,
    linkedTxTickers,
    paperTradeTickers,
    source,
    journalEntries // Pass *all* journal entries so ideas can find their technique
  );

  // 3. Paper Trades (All source types)
  // const openPaperTrades = paperTrades.filter((p) => p.status === 'OPEN');
  // const closedPaperTrades = paperTrades.filter(
  //   (p) => p.status !== 'OPEN' // e.g., 'CLOSED', 'EXECUTED'
  // );

  // const paperOpenHtml = _renderModalPaperTrades_Open(openPaperTrades);
  // const paperClosedHtml = _renderModalPaperTrades_Closed(closedPaperTrades);

  // 4. Real Trades (All source types)
  const openRealTrades = linkedTransactions.filter(
    (tx) => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001
  );
  const closedRealTrades = linkedTransactions.filter(
    (tx) => tx.transaction_type === 'SELL'
  );

  const realOpenHtml = _renderModalRealTrades_Open(openRealTrades);
  const realClosedHtml = _renderModalRealTrades_Closed(closedRealTrades);

  // 5. Documents and Notes (All source types)
  const documentsHtml = _renderModalDocuments(documents, source);
  const notesHtml = _renderModalNotes(sourceNotes, source);
  // --- END MODIFICATION ---

  // --- *** THIS IS THE FIX: Assemble the final HTML in the requested order *** ---
  return `
        <div class="modal-grid">
            <div class="modal-grid-left">
                ${profileHtml}
            </div>
            <div class="modal-grid-right">
                ${actionsHtml}
                ${summaryHtml}
            </div>
        </div>

        <div class="modal-section">
            ${techniquesHtml}
        </div>
        
        <div class="modal-section">
            ${tradeIdeasHtml}
        </div>
        
        <div class="modal-section">
            ${realOpenHtml}
        </div>
        
        <hr style="margin: 2rem 0 1rem 0;">

        <div class="modal-section">
            ${realClosedHtml}
        </div>
        
        <div class="modal-grid-bottom">
            <div class="modal-grid-left">
                ${documentsHtml}
            </div>
            <div class="modal-grid-right">
                ${notesHtml}
            }
        </div>
    `;
  // --- *** END FIX *** ---
}
