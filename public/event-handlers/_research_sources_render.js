// public/event-handlers/_research_sources_render.js
/**
 * @file Renders UI elements for the Research Sources tab (cards and details modal).
 * @module event-handlers/_research_sources_render
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
 * Renders the list of advice sources into a card grid.
 * @param {HTMLDivElement} panelElement - The panel element (#research-sources-panel).
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
export function renderSourcesList(panelElement, sources) {
    // ... (This function remains unchanged) ...
    const gridContainer = /** @type {HTMLDivElement | null} */(panelElement.querySelector('#sources-cards-grid'));

    if (!gridContainer) {
        console.error("renderSourcesList: Could not find #sources-cards-grid container.");
        panelElement.innerHTML = '<p style="color: var(--negative-color);">Error: UI container for source cards not found.</p>';
        return;
    }

    gridContainer.innerHTML = ''; // Clear previous content

    const sortedSources = Array.isArray(sources)
        ? [...sources].sort((a, b) => a.name.localeCompare(b.name))
        : [];

    if (sortedSources.length === 0) {
        gridContainer.innerHTML = '<p>No advice sources defined yet for this account holder. Add sources via Settings -> Data Management -> Advice Sources.</p>';
        return;
    }

    sortedSources.forEach(source => {
        // Prepare Image Thumbnail
        const imagePath = source.image_path ? escapeHTML(source.image_path) : '/images/contacts/default_avatar.png'; // Default path
        const imageThumbnailHTML = `<img src="${imagePath}" alt="" class="source-list-thumbnail">`;
        const fallbackIconHTML = '<span style="font-size: 1.5em; margin-right: 5px;">ℹ️</span>'; // Simple info icon as fallback

        const cardHTML = `
            <div class="source-card clickable-source" data-source-id="${source.id}" style="cursor: pointer;">
                <div class="card-header">
                    ${source.image_path ? imageThumbnailHTML : fallbackIconHTML}
                    <h3 class="source-name" style="margin: 0;">${escapeHTML(source.name)}</h3>
                    <small style="margin-left: auto;" class="source-type">(${escapeHTML(source.type)})</small>
                </div>
                <div class="card-body" style="font-size: 0.9em; min-height: 60px;">
                    <p style="margin: 0; color: var(--text-muted-color); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2;">
                        ${escapeHTML(source.description) || (source.contact_person ? `Contact: ${escapeHTML(source.contact_person)}` : 'Click to view details...')}
                    </p>
                </div>
            </div>
        `;
        gridContainer.innerHTML += cardHTML;
    });
}

/**
 * Renders the detailed view HTML for a selected advice source inside the modal.
* Includes profile, summary stats, trade ideas, open/closed journal entries, documents, and notes.
 * @param {object} details - The fetched details object.
 * @param {object} details.source - The advice source data.
 * @param {any[]} details.journalEntries - Array of linked journal entries (includes calculated current_pnl).
 * @param {any[]} details.watchlistItems - Array of linked watchlist items (recommended trades).
 * @param {any[]} details.documents - Array of linked documents.
 * @param {any[]} details.sourceNotes - Array of linked source notes.
 * @param {object} details.summaryStats - Calculated summary statistics. // <-- ADDED THIS LINE
 * @param {number} details.summaryStats.totalTrades
 * @param {number} details.summaryStats.totalInvestment
 * @param {number} details.summaryStats.totalUnrealizedPL
 * @param {number} details.summaryStats.totalRealizedPL
 * @returns {string} The HTML string for the details content.
 */
export function generateSourceDetailsHTML(details) {
    let detailsHTML = '';
    const source = details.source;
    const stats = details.summaryStats; // Get the summary stats

    // Get current local datetime for default value
    const now = new Date();
    // Adjust for local timezone offset to get YYYY-MM-DDTHH:MM format for the input
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    // --- Start Grid Layout for Top Section ---
    detailsHTML += '<div class="source-details-grid">';

    // --- Profile Section (Left Column) ---
    // ... (Profile HTML remains unchanged) ...
    detailsHTML += '<div class="source-profile-section">';
    detailsHTML += `<h4>Profile</h4>`;
    const imagePath = source.image_path ? escapeHTML(source.image_path) : '/images/contacts/default_avatar.png'; // Default path
    detailsHTML += `<img src="${imagePath}" alt="${escapeHTML(source.name)}" class="profile-image">`;
    detailsHTML += `<p><strong>Name:</strong> ${escapeHTML(source.name)}</p>`;
    detailsHTML += `<p><strong>Type:</strong> ${escapeHTML(source.type)}</p>`;
    detailsHTML += `<p><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
    if (source.url) detailsHTML += `<p><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;
    detailsHTML += `<h5 style="margin-top: 1rem;">Contact Info</h5>`;
    if (source.contact_person) detailsHTML += `<p><strong>Person:</strong> ${escapeHTML(source.contact_person)}</p>`;
    if (source.contact_email) detailsHTML += `<p><strong>Email:</strong> ${escapeHTML(source.contact_email)}</p>`;
    if (source.contact_phone) detailsHTML += `<p><strong>Phone:</strong> ${escapeHTML(source.contact_phone)}</p>`;
    let appIconHTML = '';
    const appType = source.contact_app_type?.toLowerCase();
    const appHandle = escapeHTML(source.contact_app_handle);
    if (appType === 'signal') { appIconHTML = `<img src="/images/logos/signal.png" alt="Signal" class="contact-app-icon"> `; }
    else if (appType === 'whatsapp') { appIconHTML = `<img src="/images/logos/whatsapp.jpeg" alt="WhatsApp" class="contact-app-icon"> `; }
    if (source.contact_app_type) { detailsHTML += `<p><strong>App:</strong> ${appIconHTML}${escapeHTML(source.contact_app_type)}: ${appHandle || 'N/A'}</p>`; }
    else if (source.contact_app) { detailsHTML += `<p><strong>App (Old):</strong> ${escapeHTML(source.contact_app)}</p>`; }
    detailsHTML += '</div>';

    // --- Add Recommended Ticker Form (Right Column) ---
    // ... (Add Ticker Form HTML remains unchanged) ...
    detailsHTML += '<div class="add-ticker-section">';
    detailsHTML += `<h5>Add Trade Idea</h5>`;
    detailsHTML += `
        <form class="add-watchlist-item-form" data-source-id="${source.id}">
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
    detailsHTML += '</div>'; // End add-ticker-section
    detailsHTML += '</div>'; // End source-details-grid

    // --- ADDED: Summary Statistics Header ---
    detailsHTML += `<div class="summary-container source-summary-header" style="margin-top: 1.5rem; justify-content: space-around;">`;
    detailsHTML += `<div class="summary-item"><h3>Total Ideas</h3><p>${stats.totalTrades}</p></div>`;
    detailsHTML += `<div class="summary-item"><h3>Investment (Open)</h3><p>${formatAccounting(stats.totalInvestment)}</p></div>`;
    detailsHTML += `<div class="summary-item"><h3>Unrealized P/L (Open)</h3><p class="${stats.totalUnrealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalUnrealizedPL)}</p></div>`;
    detailsHTML += `<div class="summary-item"><h3>Realized P/L (Closed)</h3><p class="${stats.totalRealizedPL >= 0 ? 'positive' : 'negative'}">${formatAccounting(stats.totalRealizedPL)}</p></div>`;
    detailsHTML += `</div>`;
    // --- END ADDITION ---

    // --- Separator ---
    detailsHTML += '<hr style="margin: 1.5rem 0;">';

    // --- Linked Sections Below Grid ---

    // 1. Recommended Trades (Watchlist Items) - New Table Format
    detailsHTML += `<h4 style="margin-top: 1rem;">Trade Ideas (${details.watchlistItems.length})</h4>`;
    if (details.watchlistItems.length > 0) {
        // ... (Watchlist Table HTML generation remains unchanged) ...
        detailsHTML += `<div style="max-height: 200px; overflow-y: auto;"><table class="recommended-trades-table mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr> <th>Ticker</th> <th>Date Added</th> <th class="numeric">Entry Range</th> <th class="numeric">Current $</th> <th class="numeric">Dist. to Entry</th> <th class="numeric">Guidelines (SL/TP1/TP2)</th> <th class="center-align">Actions</th> </tr>
            </thead><tbody>`;
        details.watchlistItems.forEach(item => { /* ... populate rows ... */
            const currentPriceData = state.priceCache.get(item.ticker); const currentPrice = (currentPriceData && typeof currentPriceData.price === 'number') ? currentPriceData.price : null;
            let entryRange = '--'; if (item.rec_entry_low !== null && item.rec_entry_high !== null) { entryRange = `${formatAccounting(item.rec_entry_low, false)} - ${formatAccounting(item.rec_entry_high, false)}`; } else if (item.rec_entry_low !== null) { entryRange = `${formatAccounting(item.rec_entry_low, false)}+`; } else if (item.rec_entry_high !== null) { entryRange = `Up to ${formatAccounting(item.rec_entry_high, false)}`; }
            let distance = '--'; let distClass = ''; if (currentPrice !== null && item.rec_entry_low !== null) { const distPercent = ((currentPrice - item.rec_entry_low) / item.rec_entry_low) * 100; distClass = distPercent >= 0 ? 'positive' : 'negative'; if (item.rec_entry_high !== null && currentPrice <= item.rec_entry_high) { distClass = 'positive'; distance = `In Range (${distPercent.toFixed(1)}%)`; } else { distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`; } } else if (currentPrice !== null && item.rec_entry_high !== null) { const distPercent = ((currentPrice - item.rec_entry_high) / item.rec_entry_high) * 100; distClass = distPercent > 0 ? 'negative' : 'positive'; distance = `${distPercent > 0 ? '+' : ''}${distPercent.toFixed(1)}%`; }
            const recLimits = [ item.rec_stop_loss ? `SL: ${formatAccounting(item.rec_stop_loss, false)}` : null, item.rec_tp1 ? `TP1: ${formatAccounting(item.rec_tp1, false)}` : null, item.rec_tp2 ? `TP2: ${formatAccounting(item.rec_tp2, false)}` : null ].filter(Boolean).join(' / ') || '--';
            const suggestedPrice = item.rec_entry_high || item.rec_entry_low || '';
            detailsHTML += `
                <tr> <td>${escapeHTML(item.ticker)}</td> <td>${new Date(item.created_at).toLocaleDateString()}</td> <td class="numeric">${entryRange}</td> <td class="numeric">${currentPrice ? formatAccounting(currentPrice) : '--'}</td> <td class="numeric ${distClass}">${distance}</td> <td class="numeric">${recLimits}</td>
                    <td class="center-align actions-cell"> <button class="create-buy-order-btn" data-ticker="${escapeHTML(item.ticker)}" data-price="${suggestedPrice}" data-source-id="${source.id}" data-source-name="${escapeHTML(source.name)}" title="Create Buy Order from this Idea" style="padding: 2px 5px; font-size: 0.8em; margin-right: 5px;">Buy</button> <button class="delete-watchlist-item-button delete-btn" data-item-id="${item.id}" title="Remove Recommendation" style="padding: 2px 5px; font-size: 0.8em;">X</button> </td>
                </tr>`;
        });
        detailsHTML += `</tbody></table></div>`;
    } else {
        detailsHTML += `<p>No trade ideas linked.</p>`;
    }


    // --- MODIFIED: Split Journal Entries into Two Tables ---
    const openJournalEntries = details.journalEntries.filter(entry => entry.status === 'OPEN');
    const closedJournalEntries = details.journalEntries.filter(entry => ['CLOSED', 'EXECUTED'].includes(entry.status));

    // 2a. Open Journal Entries Table (Unrealized P/L)
    detailsHTML += `<h4 style="margin-top: 1rem;">Open Paper Trades (${openJournalEntries.length})</h4>`;
    if (openJournalEntries.length > 0) {
        detailsHTML += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Entry Date</th> <th>Ticker</th> <th class="numeric">Entry $</th> <th class="numeric">Qty</th> <th class="numeric">Current $</th> <th class="numeric">Unrealized P/L</th> <th class="numeric">Guidelines (SL/TP1/TP2)</th> <th>Status</th>
                </tr>
            </thead><tbody>`;
        openJournalEntries.forEach(entry => {
            // @ts-ignore - current_pnl is added by backend/API
            const pnl = entry.current_pnl;
            const pnlClass = pnl !== null && pnl !== undefined ? (pnl >= 0 ? 'positive' : 'negative') : '';
            const pnlDisplay = pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
            // @ts-ignore - current_price is added by backend/API
            const currentPriceDisplay = entry.current_price ? formatAccounting(entry.current_price) : '--';

            const recLimits = [
                // @ts-ignore
                entry.stop_loss_price ? `SL: ${formatAccounting(entry.stop_loss_price, false)}` : null,
                // @ts-ignore
                entry.target_price ? `TP1: ${formatAccounting(entry.target_price, false)}` : null,
                // @ts-ignore
                entry.target_price_2 ? `TP2: ${formatAccounting(entry.target_price_2, false)}` : null
            ].filter(Boolean).join(' / ') || '--';

            detailsHTML += `
                <tr>
                    <td>${escapeHTML(entry.entry_date) || 'N/A'}</td> <td>${escapeHTML(entry.ticker) || 'N/A'}</td> <td class="numeric">${formatAccounting(entry.entry_price)}</td> <td class="numeric">${formatQuantity(entry.quantity)}</td> <td class="numeric">${currentPriceDisplay}</td> <td class="numeric ${pnlClass}">${pnlDisplay}</td> <td class="numeric">${recLimits}</td> <td>${escapeHTML(entry.status)}</td>
                </tr>`;
        });
        detailsHTML += `</tbody></table></div>`;
    } else {
        detailsHTML += `<p>No open paper trades linked.</p>`;
    }

    // 2b. Closed Journal Entries Table (Realized P/L)
    detailsHTML += `<h4 style="margin-top: 1rem;">Closed Paper Trades (${closedJournalEntries.length})</h4>`;
    if (closedJournalEntries.length > 0) {
        detailsHTML += `<div style="max-height: 200px; overflow-y: auto;"><table class="mini-journal-table" style="width: 100%; font-size: 0.9em;">
            <thead>
                <tr>
                    <th>Entry Date</th> <th>Exit Date</th> <th>Ticker</th> <th class="numeric">Entry $</th> <th class="numeric">Exit $</th> <th class="numeric">Qty</th> <th class="numeric">Realized P/L</th> <th>Status</th>
                </tr>
            </thead><tbody>`;
        closedJournalEntries.forEach(entry => {
            // @ts-ignore
            const pnl = entry.pnl;
            const pnlClass = pnl !== null && pnl !== undefined ? (pnl >= 0 ? 'positive' : 'negative') : '';
            const pnlDisplay = pnl !== null && pnl !== undefined ? formatAccounting(pnl) : '--';
            const statusDisplay = entry.status === 'EXECUTED' && entry.linked_trade_id ? `Executed (Tx #${entry.linked_trade_id})` : escapeHTML(entry.status);

            detailsHTML += `
                <tr class="text-muted">
                    <td>${escapeHTML(entry.entry_date) || 'N/A'}</td> <td>${escapeHTML(entry.exit_date) || '--'}</td> <td>${escapeHTML(entry.ticker) || 'N/A'}</td> <td class="numeric">${formatAccounting(entry.entry_price)}</td> <td class="numeric">${entry.exit_price ? formatAccounting(entry.exit_price) : '--'}</td> <td class="numeric">${formatQuantity(entry.quantity)}</td> <td class="numeric ${pnlClass}">${pnlDisplay}</td> <td>${statusDisplay}</td>
                </tr>`;
        });
        detailsHTML += `</tbody></table></div>`;
    } else {
        detailsHTML += `<p>No closed or executed paper trades linked.</p>`;
    }
    // --- END JOURNAL TABLE SPLIT ---

    // 3. Linked Documents & Add Form
    // ... (Documents HTML remains unchanged) ...
     detailsHTML += `<h4 style="margin-top: 1rem;">Linked Documents (${details.documents.length})</h4>`;
    if (details.documents.length > 0) {
        detailsHTML += `<ul class="linked-items-list">`;
         details.documents.forEach(doc => { /* ... populate list items ... */
            const titleDisplay = escapeHTML(doc.title) || 'Untitled Document'; const typeDisplay = doc.document_type ? `(${escapeHTML(doc.document_type)})` : ''; const descDisplay = doc.description ? `- ${escapeHTML(doc.description)}` : '';
            detailsHTML += `<li style="display: flex; justify-content: space-between; align-items: center;"> <span><a href="${escapeHTML(doc.external_link)}" target="_blank">${titleDisplay}</a> ${typeDisplay} ${descDisplay}</span> <button class="delete-document-button delete-btn" data-doc-id="${doc.id}" title="Delete Document Link" style="padding: 2px 5px; font-size: 0.8em;">X</button> </li>`;
        });
        detailsHTML += `</ul>`;
    } else { detailsHTML += `<p>No documents linked.</p>`; }
    detailsHTML += `<form class="add-document-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Document Link</h5> <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"> <input type="text" class="add-doc-title-input" placeholder="Title (Optional)" style="grid-column: span 2;"> <input type="text" class="add-doc-type-input" placeholder="Type (e.g., Chart)"> <input type="url" class="add-doc-link-input" placeholder="External Link (http://...)" required> <textarea class="add-doc-desc-input" placeholder="Description (Optional)" rows="2" style="grid-column: span 2;"></textarea> <button type="submit" class="add-document-button" style="grid-column: 2 / 3; justify-self: end;">Add Link</button> </div> </form>`;

    // 4. Source Notes & Add Form
    // ... (Notes HTML remains unchanged) ...
    detailsHTML += `<h4 style="margin-top: 1rem;">Notes (${details.sourceNotes.length})</h4>`;
     if (details.sourceNotes.length > 0) {
        detailsHTML += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
        const sortedNotes = [...details.sourceNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        sortedNotes.forEach(note => { /* ... populate list items with edit/delete ... */
            const escapedNoteContent = escapeHTML(note.note_content); const createdDateStr = new Date(note.created_at).toLocaleString(); const updatedDateStr = new Date(note.updated_at).toLocaleString(); const editedMarker = note.updated_at > note.created_at ? ` (edited ${updatedDateStr})` : '';
             detailsHTML += `<li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--container-border);" data-note-id="${note.id}"> <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;"> <small><i>${createdDateStr}${editedMarker}</i></small> <div class="note-actions"> <button class="edit-source-note-button" title="Edit Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">Edit</button> <button class="delete-source-note-button delete-btn" data-note-id="${note.id}" title="Delete Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">X</button> </div> </div> <div class="note-content-display">${escapedNoteContent.replace(/\n/g, '<br>')}</div> <div class="note-content-edit" style="display: none;"> <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box;">${escapedNoteContent}</textarea> <div style="text-align: right; margin-top: 5px;"> <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button> <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button> </div> </div> </li>`;
        });
        detailsHTML += `</ul>`;
    } else { detailsHTML += `<p>No notes added.</p>`; }
    detailsHTML += `<form class="add-source-note-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);"> <h5>Add New Note</h5> <textarea class="add-note-content-textarea" placeholder="Enter your note..." required rows="3" style="width: 100%; box-sizing: border-box; margin-bottom: 5px;"></textarea> <div style="text-align: right;"> <button type="submit" class="add-source-note-button">Add Note</button> </div> </form>`;

    return detailsHTML;
}