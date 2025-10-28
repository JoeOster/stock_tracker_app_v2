// /public/event-handlers/_research.js
// Version Updated (Add Edit/Save/Cancel for Source Notes)
/**
 * @file Handles initialization and interaction for the Research page (formerly Journal).
 * @module event-handlers/_research
 */

import { state } from '../state.js';
import { loadJournalPage } from './_journal.js'; // Still needed for Paper Trading tab
import { fetchAndStoreAdviceSources } from './_journal_settings.js'; // For Sources tab
// Updated imports: Added updateSourceNote
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js'; // For Journal table
// Updated imports: Added addSourceNote, delete functions, updateSourceNote
import {
    addDocument, addWatchlistItem, fetchSourceDetails, addSourceNote,
    deleteWatchlistItem, deleteDocument, deleteSourceNote, updateSourceNote
} from '../api.js';

/**
 * Renders the list of advice sources into the sources panel.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
function renderSourcesList(panelElement, sources) {
    // ... (implementation remains the same) ...
    panelElement.innerHTML = '';
    if (!sources || sources.length === 0) {
        panelElement.innerHTML = '<p>No advice sources defined yet for this account holder. Add sources via Settings -> Data Management -> Advice Sources.</p>';
        return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'sources-list-container';
    listContainer.id = 'sources-list';

    // Sort sources alphabetically before rendering
    const sortedSources = [...sources].sort((a, b) => a.name.localeCompare(b.name));


    sortedSources.forEach(source => {
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'source-item clickable-source';
        sourceDiv.dataset.sourceId = String(source.id);
        sourceDiv.style.cursor = 'pointer';
        sourceDiv.style.borderBottom = '1px solid var(--container-border)';
        sourceDiv.style.marginBottom = '1rem';
        sourceDiv.style.paddingBottom = '1rem';

        let basicInfoHTML = `
            <strong><span class="source-name">${source.name || 'Unnamed Source'}</span></strong> (<span class="source-type">${source.type || 'N/A'}</span>)
        `;
        sourceDiv.innerHTML = `<div class="source-basic-info">${basicInfoHTML}</div><div class="source-details-content" style="display: none; margin-top: 10px; padding-left: 20px;"></div>`;

        listContainer.appendChild(sourceDiv);
    });

    panelElement.appendChild(listContainer);
}

/**
 * Renders the detailed view for a selected advice source, including linked items and notes.
 * @param {HTMLElement} sourceElement - The specific source item div that was clicked.
 * @param {object} details - The fetched details object.
 * @param {object} details.source - The advice source data.
 * @param {any[]} details.journalEntries - Linked journal entries.
 * @param {any[]} details.watchlistItems - Linked watchlist items.
 * @param {any[]} details.documents - Linked documents.
 * @param {any[]} details.sourceNotes - Linked source notes.
 * @returns {void}
 */
function renderSourceDetails(sourceElement, details) {
    const detailsContainer = /** @type {HTMLElement} */ (sourceElement.querySelector('.source-details-content'));
    if (!detailsContainer) return;

    // Toggle visibility if already populated
    if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) {
        /** @type {HTMLElement} */ (detailsContainer).style.display = detailsContainer.style.display === 'none' ? 'block' : 'none';
        return;
    }

    let detailsHTML = '';
    const source = details.source;

    // --- Helper to escape HTML ---
    const escapeHTML = (str) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';


    // 1. Source Contact Info & Description
    detailsHTML += `<div class="source-contact-info" style="margin-bottom: 1rem; border-bottom: 1px dashed var(--container-border); padding-bottom: 1rem;">`;
    detailsHTML += `<p><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
    if (source.url) detailsHTML += `<p><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;
    if (source.contact_person) detailsHTML += `<p><strong>Contact:</strong> ${escapeHTML(source.contact_person)}</p>`;
    if (source.contact_email) detailsHTML += `<p><strong>Email:</strong> ${escapeHTML(source.contact_email)}</p>`;
    if (source.contact_phone) detailsHTML += `<p><strong>Phone:</strong> ${escapeHTML(source.contact_phone)}</p>`;
    if (source.contact_app_type) detailsHTML += `<p><strong>App:</strong> ${escapeHTML(source.contact_app_type)}: ${escapeHTML(source.contact_app_handle) || 'N/A'}</p>`;
    else if (source.contact_app) detailsHTML += `<p><strong>App (Old):</strong> ${escapeHTML(source.contact_app)}</p>`; // Display old field if new ones are empty
    detailsHTML += `</div>`;

    // 2. Linked Journal Entries (Table)
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
        detailsHTML += `<p>No journal entries linked to this source.</p>`;
    }

    // 3. Linked Watchlist Items
    detailsHTML += `<h4 style="margin-top: 1rem;">Linked Watchlist Items (${details.watchlistItems.length})</h4>`;
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
        detailsHTML += `<p>No watchlist items currently linked to this source.</p>`;
    }
    // Add Watchlist Item Form
    detailsHTML += `
        <form class="add-watchlist-item-form" data-source-id="${source.id}" style="margin-top: 10px; display: flex; gap: 5px; align-items: center;">
             <input type="text" class="add-watchlist-ticker-input" placeholder="Ticker" required style="flex-grow: 1; max-width: 150px;">
             <button type="submit" class="add-watchlist-ticker-button" style="flex-shrink: 0;">Add Ticker</button>
        </form>`;

    // 4. Linked Documents
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
                 <textarea class="add-doc-desc-input" placeholder="Description (Optional)" rows="2" style="grid-column: span 2;"></textarea>
                 <button type="submit" class="add-document-button" style="grid-column: 2 / 3; justify-self: end;">Add Link</button>
             </div>
        </form>`;

    // 5. Source Notes (Includes Edit button and structure)
    detailsHTML += `<h4 style="margin-top: 1rem;">Notes (${details.sourceNotes.length})</h4>`;
    if (details.sourceNotes.length > 0) {
        detailsHTML += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`;
        details.sourceNotes.forEach(note => {
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
                        <textarea class="edit-note-textarea" rows="3" style="width: 100%; box-sizing: border-box;">${escapedNoteContent}</textarea> {/* Use escaped content for initial value */}
                        <div style="text-align: right; margin-top: 5px;">
                            <button class="cancel-edit-note-button cancel-btn" style="padding: 3px 6px; font-size: 0.8em; margin-right: 5px;">Cancel</button>
                            <button class="save-edit-note-button" style="padding: 3px 6px; font-size: 0.8em;">Save</button>
                        </div>
                    </div>
                </li>`;
        });
        detailsHTML += `</ul>`;
    } else {
        detailsHTML += `<p>No notes added for this source yet.</p>`;
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


    detailsContainer.innerHTML = detailsHTML;
    /** @type {HTMLElement} */ (detailsContainer).style.display = 'block'; // Ensure it's visible
    delete detailsContainer.dataset.isLoading;
}


/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;

/**
 * Removes the old click listener and attaches a new one for the sources list.
 * @param {HTMLElement} sourcesListContainer - The container element (`#sources-list`).
 * @returns {void}
 */
function initializeSourcesListClickListener(sourcesListContainer) {
    // Remove the previous listener if it exists
    if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
        console.log("Removed previous sources list click listener."); // Debug log
    } else {
        console.log("No previous sources list click listener to remove."); // Debug log
    }


    // Define the new handler
    /** @type {EventListener} */
    const newClickHandler = async (e) => {
        // console.log("Click detected inside sources list."); // Debug log
        const target = /** @type {HTMLElement} */ (e.target);
        const holderId = state.selectedAccountHolderId;
        const sourceElement = /** @type {HTMLElement} */ (target.closest('.clickable-source'));
        const sourceId = sourceElement?.dataset.sourceId;

        // Helper to refresh details view
        const refreshDetails = async () => {
             console.log("Attempting to refresh details for source:", sourceId); // Debug log
            if (sourceElement && sourceId && holderId !== 'all') {
                const detailsContainer = /** @type {HTMLElement} */ (sourceElement.querySelector('.source-details-content'));
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<p><i>Refreshing details...</i></p>';
                    detailsContainer.dataset.isLoading = 'true';
                    try {
                        const refreshedDetails = await fetchSourceDetails(sourceId, holderId);
                        renderSourceDetails(sourceElement, refreshedDetails);
                         console.log("Details refreshed successfully."); // Debug log
                    } catch (err) {
                        showToast(`Error refreshing details: ${err.message}`, 'error');
                         detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error refreshing details.</p>';
                         delete detailsContainer.dataset.isLoading;
                    }
                } else {
                     console.warn("Could not find details container to refresh."); // Debug log
                }
            } else {
                 console.warn("Cannot refresh details - missing sourceElement, sourceId, or holderId."); // Debug log
            }
        };

        // --- Toggle Details View ---
        const isLinkClicked = target.closest('a');
        const isFormButton = target.closest('form button[type="submit"]');
        const isNoteActionButton = target.closest('.note-actions button, .note-content-edit button');

        if (sourceElement && !isLinkClicked && !isFormButton && !isNoteActionButton) {
            console.log("Toggling details view for source:", sourceId); // Debug log
            const detailsContainer = /** @type {HTMLElement} */ (sourceElement.querySelector('.source-details-content'));
            if (!sourceId || !detailsContainer || holderId === 'all') { /* ... error handling ... */ return; }
            if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) {
                 /** @type {HTMLElement} */ (detailsContainer).style.display = detailsContainer.style.display === 'none' ? 'block' : 'none'; return;
            }
            try {
                detailsContainer.innerHTML = '<p><i>Loading details...</i></p>';
                /** @type {HTMLElement} */ (detailsContainer).style.display = 'block';
                detailsContainer.dataset.isLoading = 'true';
                const details = await fetchSourceDetails(sourceId, holderId);
                renderSourceDetails(sourceElement, details);
            } catch (error) { /* ... error handling ... */ }
        }

        // --- Handle Add Forms ---
        const addWatchlistForm = /** @type {HTMLFormElement} */ (target.closest('.add-watchlist-item-form'));
        if (addWatchlistForm && target.closest('.add-watchlist-ticker-button')) {
            e.preventDefault(); console.log("Add watchlist button clicked."); // Debug log
            /* ... add watchlist logic ... */
            await refreshDetails(); // Refresh after add
        }
        const addDocForm = /** @type {HTMLFormElement} */ (target.closest('.add-document-form'));
        if (addDocForm && target.closest('.add-document-button')) {
            e.preventDefault(); console.log("Add document button clicked."); // Debug log
            /* ... add document logic ... */
            await refreshDetails(); // Refresh after add
        }
        const addNoteForm = /** @type {HTMLFormElement} */ (target.closest('.add-source-note-form'));
        if (addNoteForm && target.closest('.add-source-note-button')) {
            e.preventDefault(); console.log("Add note button clicked."); // Debug log
            /* ... add note logic ... */
            await refreshDetails(); // Refresh after add
        }

        // --- Handle Delete Buttons ---
        const deleteWatchlistBtn = /** @type {HTMLButtonElement} */ (target.closest('.delete-watchlist-item-button'));
        const deleteDocumentBtn = /** @type {HTMLButtonElement} */ (target.closest('.delete-document-button'));
        const deleteNoteBtn = /** @type {HTMLButtonElement} */ (target.closest('.delete-source-note-button'));
        if (deleteWatchlistBtn || deleteDocumentBtn || deleteNoteBtn) {
            e.stopPropagation(); console.log("Delete button clicked."); // Debug log
             if (!sourceId || holderId === 'all') return showToast('Cannot delete. Context missing.', 'error');
            let confirmTitle = 'Confirm Deletion'; let confirmBody = 'Are you sure?';
            /** @type {() => Promise<void>} */ let deleteAction = async () => {};
            if (deleteWatchlistBtn) { const itemId = deleteWatchlistBtn.dataset.itemId; if (!itemId) return; confirmTitle = 'Delete Watchlist Item?'; deleteAction = async () => { await deleteWatchlistItem(itemId); showToast('Watchlist item removed.', 'success'); }; }
            else if (deleteDocumentBtn) { const docId = deleteDocumentBtn.dataset.docId; if (!docId) return; confirmTitle = 'Delete Document Link?'; deleteAction = async () => { await deleteDocument(docId); showToast('Document link deleted.', 'success'); }; }
            else if (deleteNoteBtn) { const noteLi = target.closest('li[data-note-id]'); const noteId = noteLi?.dataset.noteId; if (!noteId) return; confirmTitle = 'Delete Note?'; deleteAction = async () => { await deleteSourceNote(sourceId, noteId, holderId); showToast('Note deleted.', 'success'); }; }
            showConfirmationModal(confirmTitle, confirmBody, async () => { try { await deleteAction(); await refreshDetails(); } catch (error) { showToast(`Delete failed: ${error.message}`, 'error'); } });
        }

        // --- Handle Edit/Save/Cancel Note Buttons ---
        const noteLi = /** @type {HTMLElement} */ (target.closest('li[data-note-id]'));
        if (noteLi) {
            const noteId = noteLi.dataset.noteId;
            const displayDiv = /** @type {HTMLElement} */ (noteLi.querySelector('.note-content-display'));
            const editDiv = /** @type {HTMLElement} */ (noteLi.querySelector('.note-content-edit'));
            const editBtn = /** @type {HTMLButtonElement} */ (noteLi.querySelector('.edit-source-note-button'));
            const saveBtn = /** @type {HTMLButtonElement} */ (noteLi.querySelector('.save-edit-note-button'));
            const cancelBtn = /** @type {HTMLButtonElement} */ (noteLi.querySelector('.cancel-edit-note-button'));
            const textarea = /** @type {HTMLTextAreaElement} */ (editDiv?.querySelector('.edit-note-textarea')); // Added null check
            const noteActions = /** @type {HTMLElement} */ (noteLi.querySelector('.note-actions'));

            if (!noteId || !displayDiv || !editDiv || !editBtn || !saveBtn || !cancelBtn || !textarea || !noteActions) {
                 console.warn("Missing elements for note action:", { noteId, displayDiv, editDiv, editBtn, saveBtn, cancelBtn, textarea, noteActions }); // Debug log
                 return; // Exit if elements are missing
            }

            if (target === editBtn) {
                 e.stopPropagation(); console.log("Edit note button clicked for note:", noteId); // Debug log
                 displayDiv.style.display = 'none';
                 noteActions.style.display = 'none';
                 editDiv.style.display = 'block';
                 textarea.focus();
                 textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            } else if (target === cancelBtn) {
                 e.stopPropagation(); console.log("Cancel edit note button clicked for note:", noteId); // Debug log
                 editDiv.style.display = 'none';
                 displayDiv.style.display = 'block';
                 noteActions.style.display = '';
                 // Reset textarea from display (convert <br> back to \n)
                 textarea.value = displayDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');
            } else if (target === saveBtn) {
                 e.stopPropagation(); console.log("Save note button clicked for note:", noteId); // Debug log
                 const newContent = textarea.value.trim();
                 if (!newContent) { return showToast('Note content cannot be empty.', 'error'); }
                 if (!sourceId || holderId === 'all') { return showToast('Cannot save note. Context missing.', 'error'); }

                 saveBtn.disabled = true;
                 cancelBtn.disabled = true;
                 try {
                     await updateSourceNote(sourceId, noteId, holderId, newContent);
                     showToast('Note updated.', 'success');
                     await refreshDetails(); // Refresh to show new content and timestamp
                 } catch (error) {
                     showToast(`Error updating note: ${error.message}`, 'error');
                     // Re-enable buttons only on error, check if they still exist
                     const currentSaveBtn = noteLi.querySelector('.save-edit-note-button');
                     const currentCancelBtn = noteLi.querySelector('.cancel-edit-note-button');
                     if (currentSaveBtn) /** @type {HTMLButtonElement} */(currentSaveBtn).disabled = false;
                     if (currentCancelBtn) /** @type {HTMLButtonElement} */(currentCancelBtn).disabled = false;
                 }
                 // No finally block needed here as refreshDetails handles UI reset on success
            }
        }
    };

    // Attach the new handler and store its reference
    sourcesListContainer.addEventListener('click', newClickHandler);
    /** @type {HTMLElement & { _clickHandler?: EventListener }} */ (sourcesListContainer)._clickHandler = newClickHandler;
    console.log("Attached new sources list click listener."); // Debug log

}

/**
 * Loads data and renders content based on the active sub-tab for the Research page.
 * @returns {Promise<void>} A promise that resolves when the content is loaded and rendered.
 */
async function loadResearchPage() {
    // ... (implementation remains the same, including call to initializeSourcesListClickListener) ...
    const activeSubTabButton = document.querySelector('#research-page-container .research-sub-tabs .sub-tab.active');
    const activeSubTabId = activeSubTabButton?.dataset.subTab;
    const sourcesPanel = /** @type {HTMLDivElement} */ (document.getElementById('research-sources-panel'));
    const paperTradingPanel = /** @type {HTMLDivElement} */ (document.getElementById('research-paper-trading-panel'));
    const actionPlanPanel = /** @type {HTMLDivElement} */ (document.getElementById('research-action-plan-panel'));
    // Clear panels or show loading
    if (sourcesPanel) sourcesPanel.innerHTML = '<p>Loading sources...</p>';
    if (paperTradingPanel) paperTradingPanel.innerHTML = '<p>Loading paper trading data...</p>';
    if (actionPlanPanel) actionPlanPanel.innerHTML = '<p><i>Action Plan content to be developed...</i></p>';

    switch (activeSubTabId) {
        case 'research-action-plan-panel':
            if (actionPlanPanel) { actionPlanPanel.innerHTML = `<h3>Action Plan</h3><p><i>Content for Action Plan to be developed...</i></p>`; }
            break;
        case 'research-paper-trading-panel':
            if (paperTradingPanel) { /* ... Re-inject structure ... */ }
            await loadJournalPage();
            break;
        case 'research-sources-panel':
            if (sourcesPanel) {
                sourcesPanel.innerHTML = '<p>Loading sources...</p>';
                await fetchAndStoreAdviceSources();
                renderSourcesList(sourcesPanel, state.allAdviceSources);
                const sourcesListContainer = /** @type {HTMLElement} */ (document.getElementById('sources-list'));
                if (sourcesListContainer) {
                    initializeSourcesListClickListener(sourcesListContainer); // Initialize listener AFTER list is rendered
                } else { console.warn("Could not find #sources-list container to attach listener after rendering."); }
            }
            break;
        default:
            console.warn(`Unknown research sub-tab ID: ${activeSubTabId}`);
            if (actionPlanPanel) actionPlanPanel.innerHTML = '<p>Please select a sub-tab.</p>';
    }
}


/**
 * Initializes event handlers for the Research page (top-level tabs).
 * @returns {void}
 */
export function initializeResearchHandlers() {
    // ... (implementation remains the same) ...
    console.log("Initializing Research page handlers...");
    initializeResearchSubTabHandlers();
    initializeJournalHandlers(); // Still needed for Paper Trading sub-tab content
    console.log("Research page handlers initialized.");
}

export { loadResearchPage };

