// public/event-handlers/_research_sources_render.js
/**
 * @file Renders UI elements for the Research Sources tab (cards and details).
 * @module event-handlers/_research_sources_render
 */

import { state } from '../state.js'; // Needed for exchange list in form
import { formatAccounting, formatQuantity } from '../ui/formatters.js';

// --- Helper to escape HTML ---
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
        // Card HTML no longer includes the .source-details-content div
        const cardHTML = `
            <div class="source-card clickable-source" data-source-id="${source.id}" style="cursor: pointer;">
                <div class="card-header">
                    <span style="font-size: 1.5em; margin-right: 5px;">ℹ️</span>
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
 * @param {object} details - The fetched details object.
 * @param {object} details.source - The advice source data.
 * @param {any[]} details.journalEntries - Array of linked journal entries.
 * @param {any[]} details.watchlistItems - Array of linked watchlist items.
 * @param {any[]} details.documents - Array of linked documents.
 * @param {any[]} details.sourceNotes - Array of linked source notes.
 * @returns {string} The HTML string for the details content.
 */
export function generateSourceDetailsHTML(details) {
    let detailsHTML = '';
    const source = details.source;

    // 1. Source Contact Info & Description
    detailsHTML += `<div class="source-contact-info" style="margin-bottom: 1rem; border-bottom: 1px dashed var(--container-border); padding-bottom: 1rem;">`;
    detailsHTML += `<h5>Contact & Info</h5>`;
    detailsHTML += `<p><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
    if (source.url) detailsHTML += `<p><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;
    if (source.contact_person) detailsHTML += `<p><strong>Contact:</strong> ${escapeHTML(source.contact_person)}</p>`;
    if (source.contact_email) detailsHTML += `<p><strong>Email:</strong> ${escapeHTML(source.contact_email)}</p>`;
    if (source.contact_phone) detailsHTML += `<p><strong>Phone:</strong> ${escapeHTML(source.contact_phone)}</p>`;
    if (source.contact_app_type) detailsHTML += `<p><strong>App:</strong> ${escapeHTML(source.contact_app_type)}: ${escapeHTML(source.contact_app_handle) || 'N/A'}</p>`;
    else if (source.contact_app && !source.contact_app_type && !source.contact_app_handle) detailsHTML += `<p><strong>App (Old):</strong> ${escapeHTML(source.contact_app)}</p>`;
    detailsHTML += `</div>`;

    // 2. Linked Journal Entries
    detailsHTML += `<h4>Linked Journal Entries (${details.journalEntries.length})</h4>`;
    if (details.journalEntries.length > 0) {
        detailsHTML += `<table class="mini-journal-table" style="width: 100%; font-size: 0.9em;"><thead><tr><th>Date</th><th>Ticker</th><th>Type</th><th>Entry Price</th><th>Status</th><th>P/L</th></tr></thead><tbody>`;
        details.journalEntries.forEach(entry => {
            const pnlClass = entry.pnl ? (entry.pnl >= 0 ? 'positive' : 'negative') : (entry.current_pnl ? (entry.current_pnl >= 0 ? 'positive' : 'negative') : '');
            const statusClass = entry.status === 'OPEN' ? '' : 'text-muted';
            let pnlDisplay = '--';
            if (entry.status === 'OPEN') {
                pnlDisplay = entry.current_pnl !== null && entry.current_pnl !== undefined ? formatAccounting(entry.current_pnl) : '--';
            } else {
                pnlDisplay = entry.pnl !== null && entry.pnl !== undefined ? formatAccounting(entry.pnl) : '--';
            }
            detailsHTML += `
                <tr class="${statusClass}">
                    <td>${escapeHTML(entry.entry_date) || 'N/A'}</td>
                    <td>${escapeHTML(entry.ticker) || 'N/A'}</td>
                    <td>${escapeHTML(entry.direction) || 'N/A'} (${formatQuantity(entry.quantity || 0)})</td>
                    <td class="numeric">${formatAccounting(entry.entry_price)}</td>
                    <td>${escapeHTML(entry.status) || 'N/A'}</td>
                    <td class="numeric ${pnlClass}">${pnlDisplay}</td>
                </tr>`;
        });
        detailsHTML += `</tbody></table>`;
    } else {
        detailsHTML += `<p>No journal entries linked.</p>`;
    }

    // 3. Linked Watchlist Items & Add Form
    detailsHTML += `<h4 style="margin-top: 1rem;">Watchlist Recommendations (${details.watchlistItems.length})</h4>`;
    if (details.watchlistItems.length > 0) {
        detailsHTML += `<ul class="linked-items-list">`;
        details.watchlistItems.forEach(item => {
            detailsHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${escapeHTML(item.ticker)} (Added: ${new Date(item.created_at).toLocaleDateString()})</span>
                    <button class="delete-watchlist-item-button delete-btn" data-item-id="${item.id}" title="Remove from Watchlist" style="padding: 2px 5px; font-size: 0.8em;">X</button>
                </li>`;
        });
        detailsHTML += `</ul>`;
    } else {
        detailsHTML += `<p>No watchlist items linked.</p>`;
    }
    // Add Watchlist Item Form (Modified for "Create Buy Order")
    detailsHTML += `
        <form class="add-watchlist-item-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);">
            <h5>Add Recommended Ticker</h5>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 10px 15px; align-items: end;">

                <div class="form-group" style="margin-bottom: 0;"><label for="add-wl-ticker-${source.id}" style="font-size: 0.8em; margin-bottom: 2px;">Ticker*</label><input type="text" id="add-wl-ticker-${source.id}" class="add-watchlist-ticker-input" placeholder="e.g., AAPL" required></div>
                <div class="form-group" style="margin-bottom: 0;"><label for="add-wl-tp1-${source.id}" style="font-size: 0.8em; margin-bottom: 2px;">Take Profit 1</label><input type="number" id="add-wl-tp1-${source.id}" class="add-watchlist-tp1-input" step="any" min="0.01" placeholder="Guideline"></div>
                <div class="form-group" style="margin-bottom: 0;"><label for="add-wl-tp2-${source.id}" style="font-size: 0.8em; margin-bottom: 2px;">Take Profit 2</label><input type="number" id="add-wl-tp2-${source.id}" class="add-watchlist-tp2-input" step="any" min="0.01" placeholder="Guideline"></div>
                <button type="submit" class="add-watchlist-ticker-button" style="padding: 8px 12px; grid-row: 1 / 3; align-self: end;">Add</button>

                <div class="form-group" style="margin-bottom: 0;"><label for="add-wl-rec-entry-${source.id}" style="font-size: 0.8em; margin-bottom: 2px;">Rec. Entry Price</label><input type="number" id="add-wl-rec-entry-${source.id}" class="add-watchlist-rec-entry-input" step="any" min="0.01" placeholder="Guideline"></div>
                <div class="form-group" style="grid-column: span 2; margin-bottom: 0;"><label for="add-wl-rec-datetime-${source.id}" style="font-size: 0.8em; margin-bottom: 2px;">Rec. Date/Time</label><input type="datetime-local" id="add-wl-rec-datetime-${source.id}" class="add-watchlist-rec-datetime-input"></div>


                <div class="form-group form-group-with-checkbox" style="grid-column: 1 / 4; margin-bottom: 0; margin-top: 5px;">
                    <input type="checkbox" id="add-wl-create-buy-${source.id}" class="add-watchlist-create-buy-checkbox" style="width: auto; margin-right: 5px;">
                    <label for="add-wl-create-buy-${source.id}" style="margin-bottom: 0; font-weight: normal; color: var(--text-color);">Create Buy Order</label>
                </div>

                

            </div>
        </form>`;


    // 4. Linked Documents & Add Form
    detailsHTML += `<h4 style="margin-top: 1rem;">Linked Documents (${details.documents.length})</h4>`;
    if (details.documents.length > 0) {
        detailsHTML += `<ul class="linked-items-list">`;
         details.documents.forEach(doc => {
            const titleDisplay = escapeHTML(doc.title) || 'Untitled Document';
            const typeDisplay = doc.document_type ? `(${escapeHTML(doc.document_type)})` : '';
            const descDisplay = doc.description ? `- ${escapeHTML(doc.description)}` : '';
            detailsHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center;">
                    <span><a href="${escapeHTML(doc.external_link)}" target="_blank">${titleDisplay}</a> ${typeDisplay} ${descDisplay}</span>
                    <button class="delete-document-button delete-btn" data-doc-id="${doc.id}" title="Delete Document Link" style="padding: 2px 5px; font-size: 0.8em;">X</button>
                </li>`;
        });
        detailsHTML += `</ul>`;
    } else {
        detailsHTML += `<p>No documents linked.</p>`;
    }
    // Add Document Form
    detailsHTML += `
        <form class="add-document-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);">
            <h5>Add New Document Link</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" class="add-doc-title-input" placeholder="Title (Optional)" style="grid-column: span 2;">
                <input type="text" class="add-doc-type-input" placeholder="Type (e.g., Chart)">
                <input type="url" class="add-doc-link-input" placeholder="External Link (http://...)" required>
                <textarea class="add-doc-desc-input" placeholder="Description (Optional)" rows="2" style="grid-column: span 2;"></textarea>
                <button type="submit" class="add-document-button" style="grid-column: 2 / 3; justify-self: end;">Add Link</button>
            </div>
        </form>`;

    // 5. Source Notes & Add Form
    detailsHTML += `<h4 style="margin-top: 1rem;">Notes (${details.sourceNotes.length})</h4>`;
     if (details.sourceNotes.length > 0) {
        detailsHTML += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
        // Sort notes by created_at descending (newest first)
        const sortedNotes = [...details.sourceNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        sortedNotes.forEach(note => {
            const escapedNoteContent = escapeHTML(note.note_content);
            const createdDateStr = new Date(note.created_at).toLocaleString();
            const updatedDateStr = new Date(note.updated_at).toLocaleString();
            const editedMarker = note.updated_at > note.created_at ? ` (edited ${updatedDateStr})` : '';

            detailsHTML += `
                <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--container-border);" data-note-id="${note.id}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <small><i>${createdDateStr}${editedMarker}</i></small>
                         <div class="note-actions">
                            <button class="edit-source-note-button" title="Edit Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">Edit</button>
                            <button class="delete-source-note-button delete-btn" data-note-id="${note.id}" title="Delete Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">X</button>
                         </div>
                    </div>
                    <div class="note-content-display">${escapedNoteContent.replace(/\n/g, '<br>')}</div>
                    <div class="note-content-edit" style="display: none;">
                        <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box;">${escapedNoteContent}</textarea>
                        <div style="text-align: right; margin-top: 5px;">
                            <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button>
                            <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button>
                        </div>
                    </div>
                </li>`;
        });
        detailsHTML += `</ul>`;
    } else {
        detailsHTML += `<p>No notes added.</p>`;
    }
    // Add Note Form
    detailsHTML += `
        <form class="add-source-note-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);">
            <h5>Add New Note</h5>
            <textarea class="add-note-content-textarea" placeholder="Enter your note..." required rows="3" style="width: 100%; box-sizing: border-box; margin-bottom: 5px;"></textarea>
            <div style="text-align: right;">
                <button type="submit" class="add-source-note-button">Add Note</button>
            </div>
        </form>`;


    return detailsHTML;
}