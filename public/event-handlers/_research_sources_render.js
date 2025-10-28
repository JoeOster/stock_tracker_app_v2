// /public/event-handlers/_research_sources_render.js
/**
 * @file Contains functions for rendering the UI elements within the "Sources" sub-tab of the Research page.
 * @module event-handlers/_research_sources_render
 */

import { state } from '../state.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';

/**
 * Escapes HTML special characters in a string.
 * @param {string | null | undefined} str - The string to escape.
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
 * Renders the list of advice sources into the sources panel.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
export function renderSourcesList(panelElement, sources) {
    panelElement.innerHTML = ''; // Clear previous content
    if (!sources || sources.length === 0) {
        panelElement.innerHTML = '<p>No advice sources defined yet for this account holder. Add sources via Settings -> Data Management -> Advice Sources.</p>';
        return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'sources-list-container';
    listContainer.id = 'sources-list'; // Give it an ID for easier selection

    // Sort sources alphabetically before rendering
    const sortedSources = [...sources].sort((a, b) => a.name.localeCompare(b.name));

    sortedSources.forEach(source => {
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'source-item clickable-source'; // Keep clickable-source class
        sourceDiv.dataset.sourceId = String(source.id);
        sourceDiv.style.cursor = 'pointer';
        sourceDiv.style.borderBottom = '1px solid var(--container-border)';
        sourceDiv.style.marginBottom = '1rem';
        sourceDiv.style.paddingBottom = '1rem';

        // Basic info visible initially
        let basicInfoHTML = `
            <strong><span class="source-name">${escapeHTML(source.name) || 'Unnamed Source'}</span></strong> (<span class="source-type">${escapeHTML(source.type) || 'N/A'}</span>)
        `;
        // Add a container for details, hidden by default
        sourceDiv.innerHTML = `<div class="source-basic-info">${basicInfoHTML}</div><div class="source-details-content" style="display: none; margin-top: 10px; padding-left: 20px;"></div>`;

        listContainer.appendChild(sourceDiv);
    });

    panelElement.appendChild(listContainer);
}

/**
 * Renders the detailed view for a selected advice source, including linked items, notes, and conditional forms.
 * @param {HTMLElement} sourceElement - The specific source item div that was clicked.
 * @param {object} details - The fetched details object.
 * @param {object} details.source - The advice source data.
 * @param {any[]} details.journalEntries - Linked journal entries.
 * @param {any[]} details.watchlistItems - Linked watchlist items.
 * @param {any[]} details.documents - Linked documents.
 * @param {any[]} details.sourceNotes - Linked source notes.
 * @returns {void}
 */
export function renderSourceDetails(sourceElement, details) {
    const detailsContainer = /** @type {HTMLElement | null} */ (sourceElement.querySelector('.source-details-content'));
    if (!detailsContainer) {
        console.error("renderSourceDetails: Could not find details container within source element.");
        return;
    }

    // Toggle visibility if already populated (and not currently loading)
    if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) {
        detailsContainer.style.display = detailsContainer.style.display === 'none' ? 'block' : 'none';
        return;
    }

    let detailsHTML = '';
    const source = details.source;
    const sourceType = source.type?.toLowerCase(); // Get lowercase type
    const showWatchlist = sourceType === 'person' || sourceType === 'group';
    const showAlgorithm = sourceType === 'book'; // Assuming 'book' means algorithm for now
    const showQuickAdd = sourceType === 'person' || sourceType === 'group';

    // --- 1. Source Contact Info & Description ---
    detailsHTML += `<div class="source-contact-info" style="margin-bottom: 1rem; border-bottom: 1px dashed var(--container-border); padding-bottom: 1rem;">`;
    detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
    // ... (rest of contact info rendering: URL, Person, Email, Phone, App) ...
     if (source.url) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;
    if (source.contact_person) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Contact:</strong> ${escapeHTML(source.contact_person)}</p>`;
    if (source.contact_email) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Email:</strong> ${escapeHTML(source.contact_email)}</p>`;
    if (source.contact_phone) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Phone:</strong> ${escapeHTML(source.contact_phone)}</p>`;
    if (source.contact_app_type) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>App:</strong> ${escapeHTML(source.contact_app_type)}: ${escapeHTML(source.contact_app_handle) || 'N/A'}</p>`;
    else if (source.contact_app && !source.contact_app_type && !source.contact_app_handle) {
         detailsHTML += `<p style="margin: 0.3rem 0;"><strong>App (Old):</strong> ${escapeHTML(source.contact_app)}</p>`;
    }


    // --- Conditionally Add "Add Idea" Button or Quick Add Form ---
    if (showQuickAdd) {
        // Quick Add Form HTML
        detailsHTML += `
            <form class="quick-add-idea-form" data-source-id="${source.id}" style="margin-top: 15px; padding: 15px; border: 1px solid var(--container-border); border-radius: 8px; background-color: var(--info-panel-bg);">
                <h5>Quick Add Trade Idea</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                    <input type="text" class="quick-add-ticker" placeholder="Ticker*" required style="grid-column: span 2;">
                    <input type="number" class="quick-add-quantity" placeholder="Quantity*" step="any" min="0.00001">
                    <input type="number" class="quick-add-entry-price" placeholder="Entry Price*" step="any" min="0.01">
                    <input type="number" class="quick-add-target1" placeholder="Target 1" step="any" min="0.01">
                    <input type="number" class="quick-add-target2" placeholder="Target 2" step="any" min="0.01">
                    <input type="number" class="quick-add-stoploss" placeholder="Stop Loss" step="any" min="0.01" style="grid-column: span 2;">
                    <div class="form-group-with-checkbox" style="grid-column: 1 / -1; justify-content: flex-start; margin-top: 5px;">
                         <input type="checkbox" id="quick-add-implement-${source.id}" class="quick-add-implement">
                         <label for="quick-add-implement-${source.id}">Implement Trade Now (Creates BUY Transaction)</label>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                    <button type="reset" class="quick-add-clear-btn cancel-btn">Clear</button>
                    <button type="submit" class="quick-add-save-btn">Save Idea</button>
                </div>
            </form>
        `;
    } else {
        // Regular "Add Idea" Button HTML
        detailsHTML += `
            <div style="margin-top: 10px;">
                <button class="add-idea-from-source-btn" data-source-id="${source.id}" data-source-name="${escapeHTML(source.name)}" style="padding: 5px 10px; font-size: 0.9em;">
                    + Add Idea from this Source
                </button>
            </div>
        `;
    }
    detailsHTML += `</div>`; // Close source-contact-info

    // --- 2. Linked Journal Entries ---
    detailsHTML += `<h4>Linked Journal Entries (${details.journalEntries.length})</h4>`;
    if (details.journalEntries.length > 0) {
        detailsHTML += `<table class="mini-journal-table" style="width: 100%; font-size: 0.9em; border-collapse: collapse;"><thead><tr><th style="text-align: left;">Date</th><th style="text-align: left;">Ticker</th><th style="text-align: left;">Type</th><th class="numeric">Entry Price</th><th>Status</th><th class="numeric">P/L</th></tr></thead><tbody>`;
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
        detailsHTML += `<p>No journal entries linked to this source.</p>`;
    }

    // --- 3. Linked Watchlist Items (Conditional) ---
    if (showWatchlist) {
        detailsHTML += `<h4 style="margin-top: 1rem;">Suggested Tickers (Watchlist) (${details.watchlistItems.length})</h4>`;
        if (details.watchlistItems.length > 0) {
             detailsHTML += `<ul class="linked-items-list" style="list-style: none; padding: 0;">`;
             details.watchlistItems.forEach(item => {
                 detailsHTML += `
                     <li style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--container-border);">
                         <span>${escapeHTML(item.ticker)} (Added: ${new Date(item.created_at).toLocaleDateString()})</span>
                         <button class="delete-watchlist-item-button delete-btn" data-item-id="${item.id}" title="Remove from Watchlist" style="padding: 2px 5px; font-size: 0.8em;">X</button>
                     </li>`;
             });
             detailsHTML += `</ul>`;
        } else {
            detailsHTML += `<p>No tickers suggested or added to watchlist from this source yet.</p>`;
        }
        // Add Watchlist Item Form
        detailsHTML += `
            <form class="add-watchlist-item-form" data-source-id="${source.id}" style="margin-top: 10px; display: flex; gap: 5px; align-items: center;">
                 <input type="text" class="add-watchlist-ticker-input" placeholder="Ticker" required style="flex-grow: 1; max-width: 150px; padding: 5px 8px; font-size: 0.9em;">
                 <button type="submit" class="add-watchlist-ticker-button" style="flex-shrink: 0; padding: 5px 8px; font-size: 0.9em;">Add Ticker</button>
            </form>`;
    }

    // --- 4. Linked Documents ---
    detailsHTML += `<h4 style="margin-top: 1rem;">Linked Documents (${details.documents.length})</h4>`;
    if (details.documents.length > 0) {
        detailsHTML += `<ul class="linked-items-list" style="list-style: none; padding: 0;">`;
        details.documents.forEach(doc => {
            const titleDisplay = escapeHTML(doc.title) || 'Untitled Document';
            const typeDisplay = doc.document_type ? `(${escapeHTML(doc.document_type)})` : '';
            const descDisplay = doc.description ? `- ${escapeHTML(doc.description)}` : '';
            detailsHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--container-border);">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;"><a href="${escapeHTML(doc.external_link)}" target="_blank">${titleDisplay}</a> ${typeDisplay} ${descDisplay}</span>
                    <button class="delete-document-button delete-btn" data-doc-id="${doc.id}" title="Delete Document Link" style="padding: 2px 5px; font-size: 0.8em; flex-shrink: 0;">X</button>
                </li>`;
        });
        detailsHTML += `</ul>`;
    } else {
        detailsHTML += `<p>No documents linked directly to this source.</p>`;
    }
    // Add Document Form
    detailsHTML += `
        <form class="add-document-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);">
            <h5>Add New Document Link</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                 <input type="text" class="add-doc-title-input" placeholder="Title (Optional)" style="grid-column: span 2;">
                 <input type="text" class="add-doc-type-input" placeholder="Type (e.g., Chart)">
                 <input type="url" class="add-doc-link-input" placeholder="External Link (http://...)" required>
                 <textarea class="add-doc-desc-input" placeholder="Description (Optional)" rows="2" style="grid-column: span 2; resize: vertical; min-height: 40px;"></textarea>
                 <button type="submit" class="add-document-button" style="grid-column: 2 / 3; justify-self: end;">Add Link</button>
             </div>
        </form>`;

    // --- Algorithm Placeholder (Conditional) ---
    if (showAlgorithm) {
        detailsHTML += `<h4 style="margin-top: 1rem;">Algorithm Parameters</h4>`;
        detailsHTML += `<div style="background-color: var(--info-panel-bg); padding: 15px; border-radius: 4px; border: 1px solid var(--container-border);">`;
        detailsHTML += `<p><i>Algorithm details and parameters placeholder. (To be implemented)</i></p>`;
        detailsHTML += `</div>`;
    }

    // --- 5. Source Notes ---
    detailsHTML += `<h4 style="margin-top: 1rem;">Notes (${details.sourceNotes.length})</h4>`;
    detailsHTML += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
    if (details.sourceNotes.length > 0) {
        details.sourceNotes.forEach(note => {
            const escapedNoteContent = escapeHTML(note.note_content);
            const createdDateStr = new Date(note.created_at).toLocaleString();
            const updatedDateStr = new Date(note.updated_at).toLocaleString();
            const editedMarker = (new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 5000) ? ` (edited ${updatedDateStr})` : '';

            detailsHTML += `
                <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--container-border);" data-note-id="${note.id}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <small><i>${createdDateStr}${editedMarker}</i></small>
                        <div class="note-actions">
                             <button class="edit-source-note-button" title="Edit Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">Edit</button>
                             <button class="delete-source-note-button delete-btn" data-note-id="${note.id}" title="Delete Note" style="padding: 2px 5px; font-size: 0.8em; margin-left: 5px;">X</button>
                         </div>
                    </div>
                    <div class="note-content-display" style="white-space: pre-wrap; word-wrap: break-word;">${escapedNoteContent.replace(/\n/g, '<br>')}</div>
                    <div class="note-content-edit" style="display: none;">
                        <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box; resize: vertical; min-height: 60px;">${escapedNoteContent}</textarea>
                        <div style="text-align: right; margin-top: 5px;">
                            <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button>
                            <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button>
                        </div>
                    </div>
                </li>`;
        });
    } else {
        detailsHTML += `<li style="list-style: none; color: var(--text-muted-color);">No notes added for this source yet.</li>`;
    }
    detailsHTML += `</ul>`; // Close source-notes-list UL

    // Add Note Form
    detailsHTML += `
        <form class="add-source-note-form" data-source-id="${source.id}" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--container-border);">
            <h5>Add New Note</h5>
            <textarea class="add-note-content-textarea" placeholder="Enter your note..." required rows="3" style="width: 100%; box-sizing: border-box; margin-bottom: 5px; resize: vertical; min-height: 60px;"></textarea>
            <div style="text-align: right;">
                 <button type="submit" class="add-source-note-button">Add Note</button>
            </div>
        </form>`;


    detailsContainer.innerHTML = detailsHTML;
    detailsContainer.style.display = 'block';
    delete detailsContainer.dataset.isLoading;
}