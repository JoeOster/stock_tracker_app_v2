// /public/event-handlers/_research_sources.js
/**
 * @file Contains functions for rendering and handling interactions within the "Sources" sub-tab of the Research page.
 * @module event-handlers/_research_sources
 */

import { state } from '../state.js';
import { showToast, showConfirmationModal } from '../ui/helpers.js';
import { formatAccounting, formatQuantity } from '../ui/formatters.js';
import {
    addDocument, addWatchlistItem, fetchSourceDetails, addSourceNote,
    deleteWatchlistItem, deleteDocument, deleteSourceNote, updateSourceNote,
    addJournalEntry, executeJournalEntry, updatePricesForView, // Added Journal/Price functions
    refreshLedger // Added refreshLedger
} from '../api.js';
import { getCurrentESTDateString } from '../ui/datetime.js';

/**
 * Renders the list of advice sources into the sources panel.
 * @param {HTMLDivElement} panelElement - The panel element to render into.
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
export function renderSourcesList(panelElement, sources) {
    // ... (implementation remains the same as before) ...
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

    // --- 3. Linked Watchlist Items (Conditional) ---
    if (showWatchlist) {
        // ... (Watchlist rendering remains the same) ...
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

    // --- 4. Linked Documents ---
    // ... (remains the same) ...
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

    // --- Algorithm Placeholder (Conditional) ---
    if (showAlgorithm) {
        // ... (remains the same) ...
        detailsHTML += `<h4 style="margin-top: 1rem;">Algorithm Parameters</h4>`;
        detailsHTML += `<div style="background-color: var(--info-panel-bg); padding: 15px; border-radius: 4px; border: 1px solid var(--container-border);">`;
        detailsHTML += `<p><i>Algorithm details and parameters placeholder. (To be implemented)</i></p>`;
        // Add input fields for algo params here later
        detailsHTML += `</div>`;
    }

    // --- 5. Source Notes ---
    // ... (remains the same) ...
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

/** @type {EventListener | null} */
let currentSourcesListClickHandler = null;

/**
 * Initializes or re-initializes the event listener for the sources list container.
 * Handles toggling details, adding/deleting child items (watchlist, docs, notes),
 * editing notes, handling the quick add idea form, and the regular add idea button.
 * @param {HTMLElement} sourcesListContainer - The container element (`#sources-list`).
 * @returns {void}
 */
export function initializeSourcesListClickListener(sourcesListContainer) {
    // ... (Remove previous listener logic) ...
     if (currentSourcesListClickHandler) {
        sourcesListContainer.removeEventListener('click', currentSourcesListClickHandler);
    }

    /** @type {EventListener} */
    const newClickHandler = async (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const holderId = state.selectedAccountHolderId;
        const sourceElement = /** @type {HTMLElement | null} */ (target.closest('.clickable-source'));
        const sourceId = sourceElement?.dataset.sourceId;

        /** @type {() => Promise<void>} */
        const refreshDetails = async () => { /* ... refreshDetails implementation ... */
            // console.log("Attempting to refresh details for source:", sourceId); // Debug log
            if (sourceElement && sourceId && holderId !== 'all') {
                const detailsContainer = /** @type {HTMLElement | null} */ (sourceElement.querySelector('.source-details-content'));
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<p><i>Refreshing details...</i></p>';
                    detailsContainer.style.display = 'block'; // Ensure visible while refreshing
                    detailsContainer.dataset.isLoading = 'true';
                    try {
                        const refreshedDetails = await fetchSourceDetails(sourceId, holderId);
                        renderSourceDetails(sourceElement, refreshedDetails);
                        // console.log("Details refreshed successfully."); // Debug log
                    } catch (err) {
                         // Explicitly cast error to Error type
                         const error = /** @type {Error} */ (err);
                         showToast(`Error refreshing details: ${error.message}`, 'error');
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

        // --- Interactive Element Checks ---
        const isLinkClicked = target.closest('a');
        const isFormSubmitButton = target.matches('form button[type="submit"]');
        const isFormResetButton = target.matches('form button[type="reset"]'); // Added check for reset
        const isDeleteButton = target.closest('.delete-btn');
        const isNoteActionButton = target.closest('.note-actions button, .note-content-edit button');
        const isAddIdeaButton = target.matches('.add-idea-from-source-btn');

        // --- Toggle Details View ---
        if (sourceElement && sourceElement.contains(target) &&
            !target.closest('.source-details-content') &&
            !isLinkClicked && !isFormSubmitButton && !isFormResetButton && !isNoteActionButton && !isAddIdeaButton && !isDeleteButton) {
            // ... (toggle logic) ...
            // console.log("Toggling details view for source:", sourceId); // Debug log
             const detailsContainer = /** @type {HTMLElement | null} */ (sourceElement.querySelector('.source-details-content'));
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
                 // Explicitly cast error to Error type
                 const err = /** @type {Error} */ (error);
                 showToast(`Error loading details: ${err.message}`, 'error');
                 detailsContainer.innerHTML = '<p style="color: var(--negative-color);">Error loading details.</p>';
                 delete detailsContainer.dataset.isLoading; // Remove flag on error
             }
        }
        // --- Handle Add Idea Button Click (Navigation) ---
        else if (isAddIdeaButton && sourceId) {
            // ... (Navigation logic - remains the same) ...
             e.stopPropagation(); // Prevent detail toggle if button is inside header
            // 1. Switch main Research sub-tab to Paper Trading
            const researchSubTabs = document.querySelector('.research-sub-tabs');
            const paperTradingTabButton = researchSubTabs?.querySelector('[data-sub-tab="research-paper-trading-panel"]');
            if (paperTradingTabButton instanceof HTMLElement) {
                paperTradingTabButton.click(); // Simulate click to switch tab and load content
                // Use setTimeout to allow DOM updates from tab switch (loading journal template) to complete
                setTimeout(() => {
                    // 2. Switch nested Journal sub-tab to Add Entry
                    const paperTradingPanel = document.getElementById('research-paper-trading-panel');
                    const journalSubTabs = paperTradingPanel?.querySelector('.journal-sub-tabs');
                    const addEntryTabButton = journalSubTabs?.querySelector('[data-sub-tab="journal-add-panel"]');
                    if(addEntryTabButton instanceof HTMLElement) {
                        addEntryTabButton.click(); // Switch to the add form tab within paper trading
                    } else {
                        console.warn("Could not find 'Add Entry' sub-tab button within Paper Trading panel.");
                    }

                    // 3. Pre-fill and focus form elements
                    const adviceSourceSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('journal-advice-source'));
                    const tickerInput = /** @type {HTMLInputElement|null} */ (document.getElementById('journal-ticker'));

                    if (adviceSourceSelect) {
                        adviceSourceSelect.value = sourceId; // Pre-select the source
                        // Check if the value was actually set (option exists)
                        if (adviceSourceSelect.value !== sourceId) {
                             console.warn(`Could not pre-select advice source ID ${sourceId}. Option might be missing.`);
                             showToast('Could not pre-select advice source.', 'error');
                        }
                    } else {
                         console.warn("Could not find advice source dropdown (#journal-advice-source) to pre-fill.");
                    }

                    if (tickerInput) {
                        tickerInput.focus(); // Focus the ticker input for quick entry
                    }
                    // Use optional chaining for dataset access
                    const sourceName = target.dataset?.sourceName ?? 'this source';
                     showToast(`Adding idea from source: ${sourceName}`, 'info');
                }, 150); // Increased delay slightly to ensure journal template injection finishes
            } else {
                 console.error("Could not find Paper Trading tab button to switch.");
                 showToast('UI Error: Could not switch to Paper Trading tab.', 'error');
            }
        }
        // --- Handle Quick Add Idea Form Submission ---
        else if (target.matches('.quick-add-save-btn')) {
            // ... (Quick add logic - remains the same) ...
             e.preventDefault();
            const form = /** @type {HTMLFormElement | null} */ (target.closest('.quick-add-idea-form'));
            if (!form || holderId === 'all') {
                 if (holderId === 'all') showToast("Please select a specific account holder.", "error");
                 return;
            }
            const formSourceId = form.dataset.sourceId;
            if (!formSourceId) return showToast('Source ID missing from form.', 'error');

            // Get values
            const tickerInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-ticker'));
            const quantityInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-quantity'));
            const entryPriceInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-entry-price'));
            const target1Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-target1'));
            const target2Input = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-target2'));
            const stoplossInput = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-stoploss'));
            const implementCheckbox = /** @type {HTMLInputElement | null} */ (form.querySelector('.quick-add-implement'));
            const saveButton = /** @type {HTMLButtonElement} */ (target); // The button that was clicked

            // Ensure elements exist before accessing value
            if (!tickerInput || !quantityInput || !entryPriceInput || !target1Input || !target2Input || !stoplossInput || !implementCheckbox) {
                console.error("Quick add form is missing elements.");
                return showToast("Form error.", "error");
            }


            const ticker = tickerInput.value.trim().toUpperCase();
            const quantityStr = quantityInput.value;
            const entryPriceStr = entryPriceInput.value;
            const target1Str = target1Input.value;
            const target2Str = target2Input.value;
            const stoplossStr = stoplossInput.value;
            const implementTrade = implementCheckbox.checked;

            // Validation
            if (!ticker) return showToast('Ticker is required.', 'error');
            const quantity = parseFloat(quantityStr);
            const entryPrice = parseFloat(entryPriceStr);
            if (implementTrade && (isNaN(quantity) || quantity <= 0)) return showToast('Quantity is required to implement the trade.', 'error');
            if (isNaN(entryPrice) || entryPrice <= 0) return showToast('Entry Price is required and must be positive.', 'error');
            // Allow 0 quantity if not implementing
             if (!implementTrade && (isNaN(quantity) || quantity < 0)) return showToast('Quantity must be zero or positive.', 'error');


            const target1 = target1Str ? parseFloat(target1Str) : null;
            const target2 = target2Str ? parseFloat(target2Str) : null;
            const stoploss = stoplossStr ? parseFloat(stoplossStr) : null;
            // Add more price validation if needed (T1>Entry, T2>T1, SL<Entry)
            if (target1 !== null && target1 <= entryPrice) return showToast('Target 1 must be greater than Entry Price.', 'error');
            if (target1 !== null && target2 !== null && target2 <= target1) return showToast('Target 2 must be greater than Target 1.', 'error');
            if (target1 == null && target2 !== null && target2 <= entryPrice) return showToast('Target 2 must be greater than Entry Price.', 'error');
            if (stoploss !== null && stoploss >= entryPrice) return showToast('Stop Loss must be less than Entry Price.', 'error');


            saveButton.disabled = true;

             // Find a default exchange (e.g., the first one in the list, or one named 'Default')
             // Ensure state.allExchanges is populated (should be by settings load)
             const defaultExchange = state.allExchanges?.find(ex => ex.name.toLowerCase() === 'default') || state.allExchanges?.[0];
             if (!defaultExchange) {
                 saveButton.disabled = false; // Re-enable button
                 return showToast('No exchanges defined. Please add one in Settings.', 'error');
             }

            const journalEntryData = {
                account_holder_id: holderId,
                advice_source_id: formSourceId,
                entry_date: getCurrentESTDateString(), // Use current date for quick add
                ticker: ticker,
                exchange: defaultExchange.name, // Use the determined default exchange
                direction: 'BUY', // Assuming BUY for now
                quantity: quantity || 0, // Default to 0 if not implementing and not provided
                entry_price: entryPrice,
                target_price: target1,
                target_price_2: target2,
                stop_loss_price: stoploss,
                entry_reason: `Quick Add from source ${sourceElement?.querySelector('.source-name')?.textContent || sourceId}`,
            };

            try {
                if (implementTrade) {
                    // Fetch current price to use as execution price
                    await updatePricesForView(getCurrentESTDateString(), [ticker]);
                    const currentPriceData = state.priceCache.get(ticker);
                    const executionPrice = (currentPriceData && typeof currentPriceData.price === 'number') ? currentPriceData.price : null;

                    if (executionPrice === null || isNaN(executionPrice) || executionPrice <= 0) {
                         throw new Error(`Could not fetch a valid current price for ${ticker} to implement.`);
                    }
                    // Override journal entry price with execution price when implementing
                    journalEntryData.entry_price = executionPrice;

                    // 1. Add Journal Entry
                    const newEntry = await addJournalEntry(journalEntryData);
                    // 2. Execute it
                    const executionData = { execution_date: getCurrentESTDateString(), execution_price: executionPrice, account_holder_id: holderId };
                    const executeResult = await executeJournalEntry(newEntry.id, executionData);

                    showToast(`Implemented BUY for ${ticker} @ ${formatAccounting(executionPrice)}. Tx ID: ${executeResult.transactionId}`, 'success', 7000);
                    await refreshLedger(); // Refresh ledger since a transaction was created

                } else {
                    // Just save the journal entry
                    await addJournalEntry(journalEntryData);
                    showToast(`Idea for ${ticker} saved.`, 'success');
                }
                form.reset(); // Clear the form
                await refreshDetails(); // Refresh source details to show new linked entry

            } catch (error) {
                 // Explicitly cast error to Error type
                 const err = /** @type {Error} */ (error);
                 showToast(`Error saving idea: ${err.message}`, 'error', 7000);
            } finally {
                saveButton.disabled = false;
            }
        }
        // --- Handle Quick Add Idea Form Clear Button ---
        else if (isFormResetButton && target.matches('.quick-add-clear-btn')) {
             const form = /** @type {HTMLFormElement | null} */ (target.closest('.quick-add-idea-form'));
             if (form) {
                 form.reset(); // Use standard form reset
             }
        }
        // --- Handle Other Add Forms ---
        else if (holderId !== 'all' && isFormSubmitButton) {
            // ... (Add Watchlist, Add Document, Add Note logic) ...
            const addWatchlistForm = /** @type {HTMLFormElement | null} */ (target.closest('.add-watchlist-item-form'));
             const addDocForm = /** @type {HTMLFormElement | null} */ (target.closest('.add-document-form'));
             const addNoteForm = /** @type {HTMLFormElement | null} */ (target.closest('.add-source-note-form'));

             if (addWatchlistForm) {
                // ... add watchlist logic ...
                e.preventDefault();
                const formSourceId = addWatchlistForm.dataset.sourceId;
                const tickerInput = /** @type {HTMLInputElement | null} */ (addWatchlistForm.querySelector('.add-watchlist-ticker-input'));
                if(!tickerInput) return; // Type guard
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
                    // Explicitly cast error to Error type
                     const err = /** @type {Error} */ (error);
                     showToast(`Error adding watchlist item: ${err.message}`, 'error');
                } finally {
                    target.disabled = false;
                }
             } else if (addDocForm) {
                 // ... add document logic ...
                 e.preventDefault();
                const formSourceId = addDocForm.dataset.sourceId;
                const linkInput = /** @type {HTMLInputElement | null} */ (addDocForm.querySelector('.add-doc-link-input'));
                const titleInput = /** @type {HTMLInputElement | null} */ (addDocForm.querySelector('.add-doc-title-input'));
                const typeInput = /** @type {HTMLInputElement | null} */ (addDocForm.querySelector('.add-doc-type-input'));
                const descriptionTextarea = /** @type {HTMLTextAreaElement | null} */ (addDocForm.querySelector('.add-doc-desc-input'));

                // Type guards
                if(!linkInput || !titleInput || !typeInput || !descriptionTextarea) return;

                const link = linkInput.value.trim();
                const title = titleInput.value.trim();
                const type = typeInput.value.trim();
                const description = descriptionTextarea.value.trim();

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
                     // Explicitly cast error to Error type
                     const err = /** @type {Error} */ (error);
                     showToast(`Error adding document: ${err.message}`, 'error');
                } finally {
                    target.disabled = false;
                }
             } else if (addNoteForm) {
                 // ... add note logic ...
                 e.preventDefault();
                const formSourceId = addNoteForm.dataset.sourceId;
                const contentTextarea = /** @type {HTMLTextAreaElement | null} */ (addNoteForm.querySelector('.add-note-content-textarea'));
                if(!contentTextarea) return; // Type guard
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
                    // Explicitly cast error to Error type
                     const err = /** @type {Error} */ (error);
                     showToast(`Error adding note: ${err.message}`, 'error');
                } finally {
                    target.disabled = false;
                }
             }
        } else if (isFormSubmitButton && holderId === 'all') {
            showToast("Please select a specific account holder first.", "info");
        }

        // --- Handle Delete Buttons ---
        else if (isDeleteButton) {
            // ... (delete logic - remains the same) ...
             e.stopPropagation(); // Prevent detail view toggle
            // Ensure we have source context and a specific holder selected
             if (!sourceId || holderId === 'all') return showToast('Cannot delete. Context missing or "All Accounts" selected.', 'error');

            let confirmTitle = 'Confirm Deletion';
            let confirmBody = 'Are you sure? This cannot be undone.';
            /** @type {() => Promise<void>} */
            let deleteAction = async () => {};

            const deleteWatchlistBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-watchlist-item-button'));
            const deleteDocumentBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-document-button'));
            const deleteNoteBtn = /** @type {HTMLButtonElement | null} */ (target.closest('.delete-source-note-button'));

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
            } else {
                return; // Not one of the expected delete buttons
            }


            showConfirmationModal(confirmTitle, confirmBody, async () => {
                try {
                    await deleteAction();
                    await refreshDetails(); // Refresh the details view after successful deletion
                } catch (error) {
                    // Explicitly cast error to Error type
                     const err = /** @type {Error} */ (error);
                     showToast(`Delete failed: ${err.message}`, 'error');
                }
            });
        }

        // --- Handle Edit/Save/Cancel Note Buttons ---
        else if (isNoteActionButton) {
            // ... (edit/save/cancel note logic - remains the same) ...
            const noteLi = /** @type {HTMLElement | null} */ (target.closest('li[data-note-id]'));
            if (noteLi && sourceId && holderId !== 'all') { // Ensure we have context
                 const noteId = noteLi.dataset.noteId;
                 const displayDiv = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-content-display'));
                 const editDiv = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-content-edit'));
                 const editBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.edit-source-note-button'));
                 const saveBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.save-edit-note-button'));
                 const cancelBtn = /** @type {HTMLButtonElement | null} */ (noteLi.querySelector('.cancel-edit-note-button'));
                 const textarea = /** @type {HTMLTextAreaElement | null} */ (editDiv?.querySelector('.edit-note-textarea'));
                 const noteActions = /** @type {HTMLElement | null} */ (noteLi.querySelector('.note-actions')); // Container for edit/delete buttons

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
                         // Explicitly cast error to Error type
                         const err = /** @type {Error} */ (error);
                         showToast(`Error updating note: ${err.message}`, 'error');
                         // Re-enable buttons only on error, check if they still exist within the *current* DOM structure
                         const currentSaveBtn = noteLi.querySelector('.save-edit-note-button');
                         const currentCancelBtn = noteLi.querySelector('.cancel-edit-note-button');
                         if (currentSaveBtn instanceof HTMLButtonElement) currentSaveBtn.disabled = false;
                         if (currentCancelBtn instanceof HTMLButtonElement) currentCancelBtn.disabled = false;
                     }
                     // No finally needed here as refreshDetails handles UI reset on success
                 }
            }
        }

    }; // End of newClickHandler

    sourcesListContainer.addEventListener('click', newClickHandler);
    currentSourcesListClickHandler = newClickHandler;
}