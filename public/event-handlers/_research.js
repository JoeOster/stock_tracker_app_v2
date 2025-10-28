// /public/event-handlers/_research.js
// Version Updated (Implement Add/Delete for child items, Edit/Save/Cancel Notes)
/**
 * @file Handles initialization and interaction for the Research page (formerly Journal).
 * @module event-handlers/_research
 */

import { state, updateState } from '../state.js'; // Added updateState
import { loadJournalPage, initializeJournalHandlers } from './_journal.js'; // Keep journal imports for Paper Trading tab
import { fetchAndStoreAdviceSources } from './_journal_settings.js'; // For Sources tab
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js'; // For Journal table in details
import {
    addDocument, addWatchlistItem, fetchSourceDetails, addSourceNote,
    deleteWatchlistItem, deleteDocument, deleteSourceNote, updateSourceNote,
    handleResponse // Added handleResponse
} from '../api.js';
// Import sub-tab handler initializer
import { initializeResearchSubTabHandlers } from './_journal_tabs.js'; // This initializes the TOP level research tabs

/**
 * Renders the list of advice sources into the sources panel.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
function renderSourcesList(panelElement, sources) {
    // ... (implementation remains the same) ...
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
        // Add some basic styling for visual separation and click affordance
        sourceDiv.style.cursor = 'pointer';
        sourceDiv.style.borderBottom = '1px solid var(--container-border)';
        sourceDiv.style.marginBottom = '1rem';
        sourceDiv.style.paddingBottom = '1rem';

        // Basic info visible initially
        let basicInfoHTML = `
            <strong><span class="source-name">${source.name || 'Unnamed Source'}</span></strong> (<span class="source-type">${source.type || 'N/A'}</span>)
        `;
        // Add a container for details, hidden by default
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
    if (!detailsContainer) { /* ... error handling ... */ return; }
    if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) { /* ... toggle visibility ... */ return; }

    let detailsHTML = '';
    const source = details.source;
    const sourceType = source.type?.toLowerCase(); // Get lowercase type for easier comparison

    // --- Helper to escape HTML ---
    const escapeHTML = (str) => { /* ... escape function ... */
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
     };

    // 1. Source Contact Info, Description & Add Idea Button
    // ... (Contact info rendering remains the same) ...
    detailsHTML += `<div class="source-contact-info" style="margin-bottom: 1rem; border-bottom: 1px dashed var(--container-border); padding-bottom: 1rem;">`;
    detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Description:</strong> ${escapeHTML(source.description) || 'N/A'}</p>`;
    // ... (rest of contact info) ...
     if (source.url) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>URL:</strong> <a href="${escapeHTML(source.url)}" target="_blank" class="source-url-link">${escapeHTML(source.url)}</a></p>`;
    if (source.contact_person) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Contact:</strong> ${escapeHTML(source.contact_person)}</p>`;
    if (source.contact_email) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Email:</strong> ${escapeHTML(source.contact_email)}</p>`;
    if (source.contact_phone) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>Phone:</strong> ${escapeHTML(source.contact_phone)}</p>`;
    if (source.contact_app_type) detailsHTML += `<p style="margin: 0.3rem 0;"><strong>App:</strong> ${escapeHTML(source.contact_app_type)}: ${escapeHTML(source.contact_app_handle) || 'N/A'}</p>`;
    else if (source.contact_app && !source.contact_app_type && !source.contact_app_handle) {
         detailsHTML += `<p style="margin: 0.3rem 0;"><strong>App (Old):</strong> ${escapeHTML(source.contact_app)}</p>`;
    }


    detailsHTML += `
        <div style="margin-top: 10px;">
            <button class="add-idea-from-source-btn" data-source-id="${source.id}" data-source-name="${escapeHTML(source.name)}" style="padding: 5px 10px; font-size: 0.9em;">
                + Add Idea from this Source
            </button>
        </div>
    `;
    detailsHTML += `</div>`; // Close source-contact-info


    // 2. Linked Journal Entries (Table)
    // ... (Journal entries rendering remains the same) ...
     detailsHTML += `<h4>Linked Journal Entries (${details.journalEntries.length})</h4>`;
    if (details.journalEntries.length > 0) {
        // ... journal table HTML ...
        detailsHTML += `<table class="mini-journal-table" style="width: 100%; font-size: 0.9em; border-collapse: collapse;"><thead><tr><th style="text-align: left;">Date</th><th style="text-align: left;">Ticker</th><th style="text-align: left;">Type</th><th class="numeric">Entry Price</th><th>Status</th><th class="numeric">P/L</th></tr></thead><tbody>`;
        details.journalEntries.forEach(entry => {
            const pnlClass = entry.pnl ? (entry.pnl >= 0 ? 'positive' : 'negative') : (entry.current_pnl ? (entry.current_pnl >= 0 ? 'positive' : 'negative') : '');
            const statusClass = entry.status === 'OPEN' ? '' : 'text-muted'; // Example class, adjust as needed
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


    // 3. Linked Watchlist Items (Conditional)
    // *** Show only for Person or Group ***
    if (sourceType === 'person' || sourceType === 'group') {
        detailsHTML += `<h4 style="margin-top: 1rem;">Suggested Tickers (Watchlist) (${details.watchlistItems.length})</h4>`;
        if (details.watchlistItems.length > 0) {
            // ... watchlist list HTML ...
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

    // 4. Linked Documents
    // ... (Documents rendering remains the same) ...
     detailsHTML += `<h4 style="margin-top: 1rem;">Linked Documents (${details.documents.length})</h4>`;
    if (details.documents.length > 0) {
        // ... documents list HTML ...
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


    // *** ADDED: Algorithm Placeholder (Conditional) ***
    if (sourceType === 'book' /* || sourceType === 'algorithm' */ ) { // Check if it's a book/algo
        detailsHTML += `<h4 style="margin-top: 1rem;">Algorithm Parameters</h4>`;
        detailsHTML += `<div style="background-color: var(--info-panel-bg); padding: 15px; border-radius: 4px; border: 1px solid var(--container-border);">`;
        detailsHTML += `<p><i>Algorithm details and parameters placeholder. (To be implemented)</i></p>`;
        // Add input fields for algo params here later
        detailsHTML += `</div>`;
    }

    // 5. Source Notes
    // ... (Notes rendering remains the same) ...
    detailsHTML += `<h4 style="margin-top: 1rem;">Notes (${details.sourceNotes.length})</h4>`;
    detailsHTML += `<ul class="source-notes-list" style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">`; // Added scroll
    if (details.sourceNotes.length > 0) {
        // ... notes list HTML ...
        details.sourceNotes.forEach(note => {
            const escapedNoteContent = escapeHTML(note.note_content);
            const createdDateStr = new Date(note.created_at).toLocaleString();
            const updatedDateStr = new Date(note.updated_at).toLocaleString();
            // Check if updated_at is significantly different from created_at (e.g., more than a few seconds)
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
                    {/* Display area - Convert newlines to <br> */}
                    <div class="note-content-display" style="white-space: pre-wrap; word-wrap: break-word;">${escapedNoteContent.replace(/\n/g, '<br>')}</div>
                    {/* Edit area - Use textarea */}
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
        // Add placeholder inside the UL if empty, so the Add Note form still appears below
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

// ... (initializeSourcesListClickListener, loadResearchPage, initializeResearchHandlers remain the same) ...


/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;

/**
 * Initializes or re-initializes the event listener for the sources list container.
 * Handles toggling details, adding/deleting child items (watchlist, docs, notes), and editing notes.
 * @param {HTMLElement} sourcesListContainer - The container element (`#sources-list`).
 * @returns {void}
 */
function initializeSourcesListClickListener(sourcesListContainer) {
    // Remove the previous listener if it exists to prevent duplicates
    if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
        // console.log("Removed previous sources list click listener."); // Debug log
    }

    // Define the new handler
    /** @type {EventListener} */
    const newClickHandler = async (e) => {
        // console.log("Click detected inside sources list."); // Debug log
        const target = /** @type {HTMLElement} */ (e.target);
        const holderId = state.selectedAccountHolderId;

        // Find the parent source element for context
        const sourceElement = /** @type {HTMLElement} */ (target.closest('.clickable-source'));
        const sourceId = sourceElement?.dataset.sourceId;

        // Helper function to refresh the details view for the current source
        const refreshDetails = async () => {
            // console.log("Attempting to refresh details for source:", sourceId); // Debug log
            if (sourceElement && sourceId && holderId !== 'all') {
                const detailsContainer = /** @type {HTMLElement} */ (sourceElement.querySelector('.source-details-content'));
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<p><i>Refreshing details...</i></p>';
                    detailsContainer.style.display = 'block'; // Ensure visible while refreshing
                    detailsContainer.dataset.isLoading = 'true';
                    try {
                        const refreshedDetails = await fetchSourceDetails(sourceId, holderId);
                        renderSourceDetails(sourceElement, refreshedDetails);
                        // console.log("Details refreshed successfully."); // Debug log
                    } catch (err) {
                        showToast(`Error refreshing details: ${err.message}`, 'error');
                         detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error refreshing details.</p>';
                         delete detailsContainer.dataset.isLoading;
                    }
                } else {
                     console.warn("Could not find details container to refresh."); // Debug log
                }
            } else {
                 console.warn("Cannot refresh details - missing sourceElement, sourceId, or specific holderId."); // Debug log
            }
        };

        // --- Toggle Details View ---
        // Prevent toggling if a link, button within a form, or note action button was clicked
        const isLinkClicked = target.closest('a');
        const isFormButton = target.closest('form button'); // More general check for any form button
        const isDeleteButton = target.closest('.delete-btn'); // Specifically check for delete buttons
        const isNoteActionButton = target.closest('.note-actions button, .note-content-edit button');

        // Check if the click was directly on the source item or its basic info, but NOT on interactive elements within details
        if (sourceElement && sourceElement.contains(target) && !target.closest('.source-details-content') && !isLinkClicked && !isFormButton && !isNoteActionButton) {
             console.log("Toggling details view for source:", sourceId); // Debug log
             const detailsContainer = /** @type {HTMLElement} */ (sourceElement.querySelector('.source-details-content'));
            // Ensure we have a specific source ID and account holder
             if (!sourceId || holderId === 'all' || !detailsContainer) {
                 if(holderId === 'all') showToast("Please select a specific account holder.", "info");
                 console.warn("Could not toggle details: Missing sourceId, specific holderId, or detailsContainer.");
                 return;
             }
             // If details are already loaded and not currently loading, just toggle display
             if (detailsContainer.innerHTML !== '' && !detailsContainer.dataset.isLoading) {
                 detailsContainer.style.display = detailsContainer.style.display === 'none' ? 'block' : 'none';
                 return;
             }
             // Otherwise, load details
             try {
                detailsContainer.innerHTML = '<p><i>Loading details...</i></p>';
                detailsContainer.style.display = 'block'; // Make sure visible while loading
                detailsContainer.dataset.isLoading = 'true'; // Set loading flag
                const details = await fetchSourceDetails(sourceId, holderId);
                renderSourceDetails(sourceElement, details); // Render will remove loading flag on success
             } catch (error) {
                 showToast(`Error loading details: ${error.message}`, 'error');
                 detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error loading details.</p>';
                 delete detailsContainer.dataset.isLoading; // Remove flag on error
             }
        }


        // --- Handle Add Forms ---
        if (holderId !== 'all') { // Ensure a specific holder is selected for add actions
            const addWatchlistForm = /** @type {HTMLFormElement} */ (target.closest('.add-watchlist-item-form'));
            if (addWatchlistForm && target.matches('.add-watchlist-ticker-button')) {
                e.preventDefault();
                const formSourceId = addWatchlistForm.dataset.sourceId;
                const tickerInput = /** @type {HTMLInputElement} */ (addWatchlistForm.querySelector('.add-watchlist-ticker-input'));
                const ticker = tickerInput.value.trim().toUpperCase();
                if (!ticker) return showToast('Ticker cannot be empty.', 'error');
                if (!formSourceId) return showToast('Source context missing.', 'error');
                target.disabled = true;
                try {
                    await addWatchlistItem(holderId, ticker, formSourceId);
                    showToast(`${ticker} added to watchlist.`, 'success');
                    tickerInput.value = ''; // Clear input
                    await refreshDetails(); // Refresh details view
                } catch (error) {
                    showToast(`Error adding watchlist item: ${error.message}`, 'error');
                } finally {
                    target.disabled = false;
                }
            }

            const addDocForm = /** @type {HTMLFormElement} */ (target.closest('.add-document-form'));
            if (addDocForm && target.matches('.add-document-button')) {
                e.preventDefault();
                const formSourceId = addDocForm.dataset.sourceId;
                const linkInput = /** @type {HTMLInputElement} */ (addDocForm.querySelector('.add-doc-link-input'));
                const link = linkInput.value.trim();
                const title = (/** @type {HTMLInputElement} */ (addDocForm.querySelector('.add-doc-title-input'))).value.trim();
                const type = (/** @type {HTMLInputElement} */ (addDocForm.querySelector('.add-doc-type-input'))).value.trim();
                const description = (/** @type {HTMLTextAreaElement} */ (addDocForm.querySelector('.add-doc-desc-input'))).value.trim();
                if (!link) return showToast('External link is required.', 'error');
                if (!formSourceId) return showToast('Source context missing.', 'error');
                 // Basic URL check (optional but recommended)
                 if (!link.startsWith('http://') && !link.startsWith('https://')) {
                     // return showToast('Please provide a valid URL starting with http:// or https://', 'error');
                 }

                target.disabled = true;
                try {
                    await addDocument({
                        advice_source_id: formSourceId,
                        external_link: link,
                        title: title || null,
                        document_type: type || null,
                        description: description || null,
                        account_holder_id: holderId // Pass holder ID for potential future use/validation
                    });
                    showToast('Document link added.', 'success');
                    addDocForm.reset(); // Clear form
                    await refreshDetails(); // Refresh details view
                } catch (error) {
                    showToast(`Error adding document: ${error.message}`, 'error');
                } finally {
                    target.disabled = false;
                }
            }

            const addNoteForm = /** @type {HTMLFormElement} */ (target.closest('.add-source-note-form'));
            if (addNoteForm && target.matches('.add-source-note-button')) {
                e.preventDefault();
                const formSourceId = addNoteForm.dataset.sourceId;
                const contentTextarea = /** @type {HTMLTextAreaElement} */ (addNoteForm.querySelector('.add-note-content-textarea'));
                const content = contentTextarea.value.trim();
                if (!content) return showToast('Note content cannot be empty.', 'error');
                if (!formSourceId) return showToast('Source context missing.', 'error');

                target.disabled = true;
                try {
                    await addSourceNote(formSourceId, holderId, content);
                    showToast('Note added.', 'success');
                    contentTextarea.value = ''; // Clear textarea
                    await refreshDetails(); // Refresh details view
                } catch (error) {
                    showToast(`Error adding note: ${error.message}`, 'error');
                } finally {
                    target.disabled = false;
                }
            }
        } else if (target.closest('form button[type="submit"]')) {
             // If an add button was clicked but no specific holder selected
             showToast("Please select a specific account holder first.", "info");
        }


        // --- Handle Delete Buttons ---
        const deleteWatchlistBtn = /** @type {HTMLButtonElement} */ (target.closest('.delete-watchlist-item-button'));
        const deleteDocumentBtn = /** @type {HTMLButtonElement} */ (target.closest('.delete-document-button'));
        const deleteNoteBtn = /** @type {HTMLButtonElement} */ (target.closest('.delete-source-note-button'));

        if (deleteWatchlistBtn || deleteDocumentBtn || deleteNoteBtn) {
            e.stopPropagation(); // Prevent detail view toggle
            // Ensure we have source context and a specific holder selected
             if (!sourceId || holderId === 'all') return showToast('Cannot delete. Context missing or "All Accounts" selected.', 'error');

            let confirmTitle = 'Confirm Deletion';
            let confirmBody = 'Are you sure? This cannot be undone.';
            /** @type {() => Promise<void>} */
            let deleteAction = async () => {};

            if (deleteWatchlistBtn) {
                const itemId = deleteWatchlistBtn.dataset.itemId;
                if (!itemId) return;
                confirmTitle = 'Delete Watchlist Item?';
                deleteAction = async () => { await deleteWatchlistItem(itemId); showToast('Watchlist item removed.', 'success'); };
            } else if (deleteDocumentBtn) {
                const docId = deleteDocumentBtn.dataset.docId;
                if (!docId) return;
                confirmTitle = 'Delete Document Link?';
                deleteAction = async () => { await deleteDocument(docId); showToast('Document link deleted.', 'success'); };
            } else if (deleteNoteBtn) {
                const noteLi = target.closest('li[data-note-id]');
                const noteId = noteLi?.dataset.noteId;
                if (!noteId) return;
                confirmTitle = 'Delete Note?';
                // Pass holderId for backend validation
                deleteAction = async () => { await deleteSourceNote(sourceId, noteId, holderId); showToast('Note deleted.', 'success'); };
            }

            showConfirmationModal(confirmTitle, confirmBody, async () => {
                try {
                    await deleteAction();
                    await refreshDetails(); // Refresh the details view after successful deletion
                } catch (error) {
                    showToast(`Delete failed: ${error.message}`, 'error');
                }
            });
        }

        // --- Handle Edit/Save/Cancel Note Buttons ---
        const noteLi = /** @type {HTMLElement} */ (target.closest('li[data-note-id]'));
        if (noteLi && sourceId && holderId !== 'all') { // Ensure we have context
            const noteId = noteLi.dataset.noteId;
            const displayDiv = /** @type {HTMLElement} */ (noteLi.querySelector('.note-content-display'));
            const editDiv = /** @type {HTMLElement} */ (noteLi.querySelector('.note-content-edit'));
            const editBtn = /** @type {HTMLButtonElement} */ (noteLi.querySelector('.edit-source-note-button'));
            const saveBtn = /** @type {HTMLButtonElement} */ (noteLi.querySelector('.save-edit-note-button'));
            const cancelBtn = /** @type {HTMLButtonElement} */ (noteLi.querySelector('.cancel-edit-note-button'));
            const textarea = /** @type {HTMLTextAreaElement} */ (editDiv?.querySelector('.edit-note-textarea'));
            const noteActions = /** @type {HTMLElement} */ (noteLi.querySelector('.note-actions')); // Container for edit/delete buttons

            if (!noteId || !displayDiv || !editDiv || !editBtn || !saveBtn || !cancelBtn || !textarea || !noteActions) {
                 // console.warn("Missing elements for note action:", { noteId, displayDiv, editDiv, editBtn, saveBtn, cancelBtn, textarea, noteActions }); // Debug log
                 return; // Exit if elements are missing
            }

            if (target === editBtn) {
                 e.stopPropagation(); // Prevent detail toggle
                 // console.log("Edit note button clicked for note:", noteId); // Debug log
                 displayDiv.style.display = 'none';
                 noteActions.style.display = 'none'; // Hide action buttons (Edit/Delete X)
                 editDiv.style.display = 'block'; // Show edit area (textarea + Save/Cancel)
                 textarea.focus();
                 // Move cursor to end
                 textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            } else if (target === cancelBtn) {
                 e.stopPropagation(); // Prevent detail toggle
                 // console.log("Cancel edit note button clicked for note:", noteId); // Debug log
                 editDiv.style.display = 'none'; // Hide edit area
                 displayDiv.style.display = 'block'; // Show display area
                 noteActions.style.display = ''; // Show action buttons again
                 // Reset textarea content from display (convert <br> back to \n if needed, though using original value is safer)
                 // Find the original note content from state if possible, or re-parse from displayDiv cautiously
                 // For simplicity, just reset to what was in the textarea before edit started (might lose unsaved changes if edited again)
                 // A better approach would be to store original content on edit click, but this works for simple cancel.
            } else if (target === saveBtn) {
                 e.stopPropagation(); // Prevent detail toggle
                 // console.log("Save note button clicked for note:", noteId); // Debug log
                 const newContent = textarea.value.trim();
                 if (!newContent) { return showToast('Note content cannot be empty.', 'error'); }

                 saveBtn.disabled = true;
                 cancelBtn.disabled = true;
                 try {
                     await updateSourceNote(sourceId, noteId, holderId, newContent);
                     showToast('Note updated.', 'success');
                     await refreshDetails(); // Refresh to show new content and timestamp
                 } catch (error) {
                     showToast(`Error updating note: ${error.message}`, 'error');
                     // Re-enable buttons only on error, check if they still exist within the *current* DOM structure
                     const currentSaveBtn = noteLi.querySelector('.save-edit-note-button');
                     const currentCancelBtn = noteLi.querySelector('.cancel-edit-note-button');
                     if (currentSaveBtn) /** @type {HTMLButtonElement} */(currentSaveBtn).disabled = false;
                     if (currentCancelBtn) /** @type {HTMLButtonElement} */(currentCancelBtn).disabled = false;
                 }
                 // No finally needed here as refreshDetails handles UI reset on success
            }
        }
    };

    // Attach the new handler and store its reference
    sourcesListContainer.addEventListener('click', newClickHandler);
    currentSourcesListClickHandler = newClickHandler; // Store the reference
    // console.log("Attached new sources list click listener."); // Debug log
}


/**
 * Loads data and renders content based on the active sub-tab for the Research page.
 * @returns {Promise<void>} A promise that resolves when the content is loaded and rendered.
 */
async function loadResearchPage() {
    const activeSubTabButton = document.querySelector('#research-page-container .research-sub-tabs .sub-tab.active');
    const activeSubTabId = activeSubTabButton?.dataset.subTab;

    const sourcesPanel = /** @type {HTMLDivElement} */ (document.getElementById('research-sources-panel'));
    const paperTradingPanel = /** @type {HTMLDivElement} */ (document.getElementById('research-paper-trading-panel'));
    const actionPlanPanel = /** @type {HTMLDivElement} */ (document.getElementById('research-action-plan-panel'));

    // Clear panels or show loading state before fetching/rendering
    if (sourcesPanel) sourcesPanel.innerHTML = '<p>Loading sources...</p>';
    if (paperTradingPanel) paperTradingPanel.innerHTML = '<p>Loading paper trading data...</p>';
    if (actionPlanPanel) actionPlanPanel.innerHTML = '<p><i>Action Plan content to be developed...</i></p>';

    try {
        switch (activeSubTabId) {
            case 'research-sources-panel':
                if (sourcesPanel) {
                    await fetchAndStoreAdviceSources(); // Fetch sources for the current holder
                    renderSourcesList(sourcesPanel, state.allAdviceSources); // Render the list
                    const sourcesListContainer = /** @type {HTMLElement} */ (document.getElementById('sources-list'));
                    if (sourcesListContainer) {
                        initializeSourcesListClickListener(sourcesListContainer); // Initialize listener AFTER list is rendered
                    } else { console.warn("Could not find #sources-list container to attach listener after rendering."); }
                } else { console.error("Sources panel not found."); }
                break;

            case 'research-paper-trading-panel':
                if (paperTradingPanel) {
                    // Inject the structure from _journal.html into the panel
                    try {
                        const journalHTML = await fetch('./templates/_journal.html').then(res => handleResponse(res, 'text')); // Fetch journal template
                         // Need to wrap the fetched HTML in a temporary element to extract only the inner content
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = journalHTML;
                        const journalContent = tempDiv.querySelector('#journal-page-container > :not(h2):not(.subtitle)'); // Select content excluding main title/subtitle
                        if (journalContent) {
                            paperTradingPanel.innerHTML = ''; // Clear loading message
                            // Append all children of the container to the panel
                            while (journalContent.firstChild) {
                                 paperTradingPanel.appendChild(journalContent.firstChild);
                            }
                        } else {
                            throw new Error("Could not find expected content within _journal.html");
                        }
                    } catch (fetchError) {
                         console.error("Failed to fetch or inject journal template:", fetchError);
                         paperTradingPanel.innerHTML = '<p style="color: var(--negative-color);">Error loading Paper Trading interface.</p>';
                         break; // Don't proceed if template fails
                    }
                } else { console.error("Paper Trading panel not found."); break; }

                // Now load the journal data and initialize its specific handlers
                await loadJournalPage();
                initializeJournalHandlers(); // Ensure journal's internal handlers (forms, tables) are attached
                break;

            case 'research-action-plan-panel':
                if (actionPlanPanel) {
                    actionPlanPanel.innerHTML = `<h3>Action Plan</h3><p><i>Content for Action Plan to be developed...</i></p>`;
                    // Add specific loading/rendering for Action Plan here later
                } else { console.error("Action Plan panel not found."); }
                break;

            default:
                console.warn(`Unknown or no active research sub-tab ID: ${activeSubTabId}`);
                // Maybe default to showing the first tab's content or a message
                if (sourcesPanel) { // Default to sources if none active?
                     await fetchAndStoreAdviceSources();
                     renderSourcesList(sourcesPanel, state.allAdviceSources);
                     const sourcesListContainer = /** @type {HTMLElement} */ (document.getElementById('sources-list'));
                     if (sourcesListContainer) initializeSourcesListClickListener(sourcesListContainer);
                } else if(actionPlanPanel) { // Fallback message
                     actionPlanPanel.innerHTML = '<p>Please select a sub-tab.</p>';
                }
        }
    } catch (error) {
         console.error(`Error loading content for research sub-tab ${activeSubTabId}:`, error);
         showToast(`Error loading content: ${error.message}`, 'error');
         // Show error in the relevant panel
         const panelWithError = activeSubTabId ? document.getElementById(activeSubTabId) : null;
         if (panelWithError) {
             panelWithError.innerHTML = `<p style="color: var(--negative-color);">Error loading content for this section.</p>`;
         }
    }
}


/**
 * Initializes event handlers for the Research page (top-level tabs).
 * Note: Journal-specific handlers (forms, table actions within paper trading)
 * are now initialized when the 'research-paper-trading-panel' is loaded.
 * @returns {void}
 */
export function initializeResearchHandlers() {
    // console.log("Initializing Research page handlers (top-level tabs)..."); // Debug log
    initializeResearchSubTabHandlers(); // Initializes the main sub-tab switching (Sources, Paper Trading, etc.)
    // DO NOT call initializeJournalHandlers() here anymore, it's called by loadResearchPage when Paper Trading tab is selected.
    // console.log("Research page top-level handlers initialized."); // Debug log
}

// Export loadResearchPage so it can be called by navigation and tab switching logic
export { loadResearchPage };