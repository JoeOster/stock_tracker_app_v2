// public/event-handlers/_research_sources_modal.js
/**
 * @file Assembles the HTML for the Source Details modal content.
 * @module event-handlers/_research_sources_modal
 */

import {
    _renderModalProfile,
    _renderModalActionsPanel, // --- MODIFIED ---
    _renderModalSummaryStats,
    _renderModalTradeIdeas,
    _renderModalRealTrades,
    _renderModalPaperTrades_Open,
    _renderModalPaperTrades_Closed,
    _renderModalDocuments,
    _renderModalNotes
} from './_research_sources_modal_html.js';

/**
 * Renders the detailed view HTML for a selected advice source inside the modal.
 * Assembles partial HTML strings from _research_sources_modal_html.js
 * @param {object} details - The fetched details object.
 * @returns {string} The HTML string for the details content.
 */
export function generateSourceDetailsHTML(details) {
    const {
        source, journalEntries, watchlistItems,
        linkedTransactions, documents, sourceNotes, summaryStats
    } = details;

    // --- Create Sets for checking links ---
    // Only consider a trade "Live" if there is an OPEN BUY lot.
    const openBuyTransactions = (linkedTransactions || []).filter(
        tx => tx.transaction_type === 'BUY' && tx.quantity_remaining > 0.00001
    );
    const linkedTxTickers = new Set(openBuyTransactions.map(tx => tx.ticker));
    const paperTradeTickers = new Set(journalEntries.map(entry => entry.ticker));

    // --- Assemble HTML Sections ---
    let detailsHTML = '<div class="source-details-grid">';
    
    // Top Grid: Profile and (Conditional) Add Idea/Technique Form
    detailsHTML += _renderModalProfile(source);

    // --- MODIFIED: Render the new universal actions panel ---
    detailsHTML += _renderModalActionsPanel(source);
    // --- END MODIFIED ---

    detailsHTML += '</div>'; // End source-details-grid

    // Summary Stats
    detailsHTML += _renderModalSummaryStats(summaryStats);
    detailsHTML += '<hr style="margin: 1.5rem 0;">';

    // --- REORDERED LINKED SECTIONS ---
    detailsHTML += _renderModalPaperTrades_Open(journalEntries, source.type); // Techniques / Methods
    detailsHTML += _renderModalTradeIdeas(watchlistItems, linkedTxTickers, paperTradeTickers, source); // Trade Ideas
    detailsHTML += _renderModalRealTrades(linkedTransactions); // Linked Real Trades (Open & History)
    
    detailsHTML += '<hr style="margin: 1.5rem 0;">';
    detailsHTML += _renderModalPaperTrades_Closed(journalEntries, source.type); // Completed Techniques
    
    detailsHTML += '<hr style="margin: 1.5rem 0;">';
    detailsHTML += _renderModalDocuments(documents, source); // Documents
    detailsHTML += _renderModalNotes(sourceNotes, source); // Notes
    // --- END REORDER ---

    return detailsHTML;
}