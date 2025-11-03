// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/public/event-handlers/_research_sources_modal_html.js
/**
 * @file Generates the HTML content for the source details modal.
 * @module event-handlers/_research_sources_modal_html
 */

import { generateTable } from '../ui/renderers/_tabs.js';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercentage,
  getProfitLoss,
  getProfitLossPercent,
  safeAccess,
} from '../ui/formatters.js';

/**
 * Generates the full HTML for the source details modal content.
 * @param {object} details - The fetched details for the source.
 * @returns {string} HTML string.
 */
export function generateSourceDetailsHTML(details) {
  const {
    source,
    journalEntries,
    watchlistIdeas,
    linkedTransactions,
    sourceNotes,
    linkedDocuments,
  } = details;

  // --- 1. Render Main Actions Panel ---
  const actionsPanel = _renderModalActionsPanel(source, journalEntries);

  // --- 2. Render Techniques (Journal Entries) ---
  const openTechniques = _renderJournalEntriesTable(
    journalEntries,
    'Techniques / Methods (Open)',
    'OPEN'
  );
  const closedTechniques = _renderJournalEntriesTable(
    journalEntries,
    'Techniques / Methods (Closed)',
    'CLOSED'
  );

  // --- 3. Render Trade Ideas (Watchlist) ---
  const tradeIdeas = _renderWatchlistTable(watchlistIdeas);

  // --- 4. Render Linked Real Trades ---
  const realTrades = _renderLinkedTransactionsTable(linkedTransactions);

  // --- 5. Render Notes & Documents ---
  const notesPanel = _renderNotesPanel(sourceNotes, source.id);
  const docsPanel = _renderDocumentsPanel(linkedDocuments, source.id);

  return `
    <div class="source-modal-actions-panel">
      ${actionsPanel}
    </div>
    <hr>
    ${openTechniques}
    ${closedTechniques}
    <hr>
    ${tradeIdeas}
    <hr>
    ${realTrades}
    <hr>
    <div class.source-modal-sub-panels">
      ${notesPanel}
      ${docsPanel}
    </div>
  `;
}

/**
 * --- (Private) ---
 * Renders the main panel for actions like adding ideas or techniques.
 * @param {any} source - The source object.
 * @param {any[]} journalEntries - List of journal entries.
 * @returns {string} HTML string for the actions panel.
 */
function _renderModalActionsPanel(source, journalEntries) {
  let mainActionButton = '';
  const sourceName = source.name.replace(/"/g, '&quot;');

  if (source.type === 'Person' || source.type === 'Group') {
    // People/Groups generate Trade Ideas
    mainActionButton = `
      <button 
        id="add-idea-from-source-btn" 
        class="action-button" 
        data-source-id="${source.id}"
        data-source-name="${sourceName}"
      >
        <i class="fas fa-lightbulb"></i> Add Trade Idea
      </button>
    `;
  } else {
    // Books/Websites/etc. generate Techniques
    mainActionButton = `
      <button 
        id="add-technique-btn" 
        class="action-button"
        data-source-id="${source.id}"
        data-source-name="${sourceName}"
      >
        <i class="fas fa-book-open"></i> Add Technique
      </button>
    `;
  }

  return `
    <div class="profile-header">
      <img src="${
        source.image_path || './images/contacts/default.png'
      }" alt="${source.name}" class="profile-image-large">
      <div class="profile-info">
        <h2 class="profile-name">${source.name}</h2>
        <p class="profile-meta">Type: ${source.type} | Tags: ${
          source.tags || 'None'
        }</p>
        <p class="profile-description">${source.description || ''}</p>
        ${
          source.url
            ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="profile-link">Visit Link <i class="fas fa-external-link-alt"></i></a>`
            : ''
        }
      </div>
      <div class="profile-actions">
        ${mainActionButton}
      </div>
    </div>
  `;
}

/**
 * --- (Private) ---
 * Renders the table of open and closed journal entries (techniques).
 * @param {any[]} journalEntries - The list of journal entries.
 * @param {string} title - The title for the table section.
 * @param {'OPEN' | 'CLOSED'} status - The status to filter by.
 * @returns {string} HTML string for the journal entries table.
 */
function _renderJournalEntriesTable(journalEntries, title, status) {
  const entries = journalEntries.filter((j) => j.status === status);
  if (entries.length === 0) {
    return `
      <div class="source-group-heading">${title} (0)</div>
      <p style="margin-top:0;"><i>No ${status.toLowerCase()} techniques.</i></p>
    `;
  }

  // --- *** THIS IS THE FIX (Item #1) *** ---
  const columns = [
    'Date',
    'Type',
    // --- MODIFIED: Added Description, shortened Ticker ---
    'Description',
    'Tkr',
    // --- END MODIFIED ---
    'Qty',
    'Entry',
    'TP1',
    'SL',
    'P/L',
    'Img',
    'Actions',
  ];
  // --- *** END FIX *** ---

  /**
   * @param {any} j - Journal entry object.
   * @returns {(string | number | null)[]}
   */
  const rowGenerator = (j) => {
    const pl = getProfitLoss(j);
    const plPercent = getProfitLossPercent(j);
    const plClass =
      pl > 0 ? 'positive-color' : pl < 0 ? 'negative-color' : 'neutral-color';
    const plText =
      j.status === 'OPEN' && j.current_price
        ? `${formatCurrency(pl)} (${formatPercentage(plPercent)})`
        : j.status === 'CLOSED'
          ? `${formatCurrency(j.realized_pl)} (${formatPercentage(
              j.realized_pl_percent
            )})`
          : '---';

    const imageIcon = j.image_path
      ? `<img src="${j.image_path}" alt="Chart" class="technique-image-thumbnail" style="width: 30px; height: 30px; cursor: pointer;">`
      : '---';

    // --- *** THIS IS THE FIX (Item #1) *** ---
    return [
      formatDate(j.entry_date),
      j.ticker === 'N/A' ? 'Tech' : 'Trade',
      // --- ADDED: Populate the Description column ---
      j.entry_reason
        ? `<span title="${j.entry_reason}">${j.entry_reason.substring(
            0,
            25
          )}...</span>`
        : '---',
      // --- MODIFIED: Show '---' for Tech, Ticker for Trade ---
      j.ticker === 'N/A' ? '---' : j.ticker,
      // --- END MODIFIED ---
      formatNumber(j.quantity),
      formatCurrency(j.entry_price),
      formatCurrency(j.target_price),
      formatCurrency(j.stop_loss_price),
      `<span class="${plClass}">${plText}</span>`,
      imageIcon,
      `
        <button
          class="icon-button develop-trade-idea-btn"
          title="Add Trade Idea from this Technique"
          data-journal-id="${j.id}"
          data-ticker="${j.ticker}"
          data-entry="${j.entry_price || ''}"
          data-tp1="${j.target_price || ''}"
          data-tp2="${j.target_price_2 || ''}"
          data-sl="${j.stop_loss_price || ''}"
        >
          <i class="fas fa-arrow-right"></i>
        </button>
        <button
          class="icon-button edit-journal-technique-btn"
          title="Edit Technique"
          data-journal-id="${j.id}"
        >
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button
          class="icon-button delete-journal-btn"
          title="Archive Technique"
          data-journal-id="${j.id}"
        >
          <i class="fas fa-archive"></i>
        </button>
      `,
    ];
    // --- *** END FIX *** ---
  };

  return `
    <div class="source-group-heading">${title} (${entries.length})</div>
    ${generateTable(columns, entries, rowGenerator)}
  `;
}

/**
 * --- (Private) ---
 * Renders the table of watchlist ideas.
 * @param {any[]} watchlistIdeas - The list of watchlist ideas.
 * @returns {string} HTML string for the watchlist table.
 */
function _renderWatchlistTable(watchlistIdeas) {
  const ideas = watchlistIdeas.filter((i) => i.status === 'PENDING');
  if (ideas.length === 0) {
    return `
      <div class="source-group-heading">Trade Ideas (0)</div>
      <p style="margin-top:0;"><i>No pending trade ideas from this source.</i></p>
    `;
  }

  const columns = [
    'Ticker',
    'Entry Low',
    'Entry High',
    'TP1',
    'TP2',
    'SL',
    'Actions',
  ];

  /**
   * @param {any} i - Watchlist idea object.
   * @returns {(string | number | null)[]}
   */
  const rowGenerator = (i) => {
    const sourceName = i.source_name
      ? i.source_name.replace(/"/g, '&quot;')
      : '';
    return [
      i.ticker,
      formatCurrency(i.rec_entry_low),
      formatCurrency(i.rec_entry_high),
      formatCurrency(i.rec_tp1),
      formatCurrency(i.rec_tp2),
      formatCurrency(i.rec_stop_loss),
      `
        <button
          class="icon-button create-buy-order-btn"
          title="Convert to Real Trade"
          data-ticker="${i.ticker}"
          data-entry-low="${i.rec_entry_low || ''}"
          data-entry-high="${i.rec_entry_high || ''}"
          data-tp1="${i.rec_tp1 || ''}"
          data-tp2="${i.rec_tp2 || ''}"
          data-sl="${i.rec_stop_loss || ''}"
          data-source-id="${i.advice_source_id}"
          data-source-name="${sourceName}"
        >
          <i class="fas fa-dollar-sign"></i>
        </button>
        <button
          class="icon-button create-paper-trade-btn"
          title="Convert to Paper Trade"
          data-ticker="${i.ticker}"
          data-entry-low="${i.rec_entry_low || ''}"
          data-entry-high="${i.rec_entry_high || ''}"
          data-tp1="${i.rec_tp1 || ''}"
          data-tp2="${i.rec_tp2 || ''}"
          data-sl="${i.rec_stop_loss || ''}"
          data-source-id="${i.advice_source_id}"
        >
          <i class="fas fa-clipboard"></i>
        </button>
        <button
          class="icon-button delete-watchlist-item-button"
          title="Archive Idea"
          data-item-id="${i.id}"
        >
          <i class="fas fa-archive"></i>
        </button>
      `,
    ];
  };

  return `
    <div class="source-group-heading">Trade Ideas (${ideas.length})</div>
    ${generateTable(columns, ideas, rowGenerator)}
  `;
}

/**
 * --- (Private) ---
 * Renders the table of linked real transactions.
 * @param {any[]} linkedTransactions - The list of linked transactions.
 * @returns {string} HTML string for the transactions table.
 */
function _renderLinkedTransactionsTable(linkedTransactions) {
  const openLots = linkedTransactions.filter((t) => t.status === 'OPEN');
  if (openLots.length === 0) {
    return `
      <div class="source-group-heading">Linked Real Trades (0)</div>
      <p style="margin-top:0;"><i>No open trades linked to this source.</i></p>
    `;
  }

  const columns = ['Buy Date', 'Ticker', 'Qty', 'Entry', 'P/L', 'Actions'];

  /**
   * @param {any} t - Transaction object.
   * @returns {(string | number | null)[]}
   */
  const rowGenerator = (t) => {
    const pl = (t.current_price - t.price) * t.quantity;
    const plPercent = (t.current_price - t.price) / t.price;
    const plClass =
      pl > 0 ? 'positive-color' : pl < 0 ? 'negative-color' : 'neutral-color';
    const plText = `${formatCurrency(pl)} (${formatPercentage(plPercent)})`;

    return [
      formatDate(t.date),
      t.ticker,
      formatNumber(t.quantity),
      formatCurrency(t.price),
      `<span class="${plClass}">${plText}</span>`,
      `
        <button
          class="icon-button sell-from-lot-btn-source"
          title="Sell from this Lot"
          data-buy-id="${t.id}"
        >
          <i class="fas fa-hand-holding-usd"></i>
        </button>
      `,
    ];
  };

  return `
    <div class="source-group-heading">Linked Real Trades (${openLots.length})</div>
    ${generateTable(columns, openLots, rowGenerator)}
  `;
}

/**
 * --- (Private) ---
 * Renders the panel for source-specific notes.
 * @param {any[]} sourceNotes - The list of notes.
 * @param {string} sourceId - The ID of the source.
 * @returns {string} HTML string for the notes panel.
 */
function _renderNotesPanel(sourceNotes, sourceId) {
  const notesList =
    sourceNotes.length > 0
      ? sourceNotes
          .map(
            (note) => `
    <li data-note-id="${note.id}">
      <div class="note-meta">
        <span>${formatDate(note.created_at)}</span>
        <div class="note-actions">
          <button class="icon-button-small edit-source-note-button" title="Edit"><i class="fas fa-pencil-alt"></i></button>
          <button class="icon-button-small delete-source-note-button" title="Delete" data-note-id="${
            note.id
          }"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="note-content-display">${note.content.replace(
        /\n/g,
        '<br>'
      )}</div>
      <div class="note-content-edit" style="display: none;">
        <textarea class="edit-note-textarea">${note.content}</textarea>
        <div class="edit-note-actions">
          <button class="small-button cancel-edit-note-button">Cancel</button>
          <button class="small-button save-edit-note-button">Save</button>
        </div>
      </div>
    </li>
  `
          )
          .join('')
      : '<li><i>No notes for this source.</i></li>';

  return `
    <div class="panel">
      <h4 class="panel-title">Notes</h4>
      <ul class="source-notes-list">
        ${notesList}
      </ul>
      <form class="add-note-form" data-source-id="${sourceId}">
        <textarea class_name="add-note-content-textarea" placeholder="Add a new note..." rows="2"></textarea>
        <button type="submit" class="small-button add-source-note-button">Add Note</button>
      </form>
    </div>
  `;
}

/**
 * --- (Private) ---
 * Renders the panel for linked documents.
 * @param {any[]} linkedDocuments - The list of documents.
 * @param {string} sourceId - The ID of the source.
 * @returns {string} HTML string for the documents panel.
 */
function _renderDocumentsPanel(linkedDocuments, sourceId) {
  const docsList =
    linkedDocuments.length > 0
      ? linkedDocuments
          .map(
            (doc) => `
    <li data-doc-id="${doc.id}">
      <a href="${doc.url}" target="_blank" rel="noopener noreferrer" title="${
        doc.url
      }">
        <i class="fas ${
          doc.url.includes('google.com') ? 'fa-file-alt' : 'fa-link'
        }"></i>
        ${doc.description || doc.url.substring(0, 40) + '...'}
      </a>
      <button class="icon-button-small delete-document-button" title="Delete Link" data-doc-id="${
        doc.id
      }">
        <i class="fas fa-trash"></i>
      </button>
    </li>
  `
          )
          .join('')
      : '<li><i>No documents linked.</i></li>';

  return `
    <div class="panel">
      <h4 class="panel-title">Linked Documents</h4>
      <ul class="source-docs-list">
        ${docsList}
      </ul>
      <form class="add-document-form" data-source-id="${sourceId}">
        <input type="text" class="add-doc-url" placeholder="URL (e.g., http://...)" required>
        <input type="text" class="add-doc-desc" placeholder="Description (optional)">
        <button type="submit" class="small-button add-document-button">Add Link</button>
      </form>
    </div>
  `;
}
