// public/event-handlers/_research_sources_modal.js
/**
 * @file Assembles the HTML for the Source Details modal content.
 * @module event-handlers/_research_sources_modal
 */

import {
    _renderModalProfile,
    _renderModalAddIdeaForm,
    _renderModalSummaryStats,
    _renderModalTradeIdeas,
    _renderModalRealTrades,
    _renderModalPaperTrades,
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
    const linkedTxTickers = new Set(linkedTransactions.map(tx => tx.ticker));
    const paperTradeTickers = new Set(journalEntries.map(entry => entry.ticker));

    // --- Assemble HTML Sections ---
    let detailsHTML = '<div class="source-details-grid">';
    
    // Top Grid: Profile and Add Idea Form
    detailsHTML += _renderModalProfile(source);
    detailsHTML += _renderModalAddIdeaForm(source);
    detailsHTML += '</div>'; // End source-details-grid

    // Summary Stats
    detailsHTML += _renderModalSummaryStats(summaryStats);
    detailsHTML += '<hr style="margin: 1.5rem 0;">';

    // Linked Sections
    detailsHTML += _renderModalTradeIdeas(watchlistItems, linkedTxTickers, paperTradeTickers, source);
    detailsHTML += _renderModalRealTrades(linkedTransactions);
    detailsHTML += _renderModalPaperTrades(journalEntries);
    detailsHTML += _renderModalDocuments(documents, source);
    detailsHTML += _renderModalNotes(sourceNotes, source);

    return detailsHTML;
}