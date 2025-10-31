// /public/event-handlers/_research.js
/**
 * @file Manages the "Research" page, including sub-tab switching and content loading.
 * @module event-handlers/_research
 */

import { state } from '../state.js';
import { initializeJournalHandlers, loadJournalPage } from './_journal.js';
import { initializeJournalSubTabHandlers, initializeResearchSubTabHandlers } from './_journal_tabs.js';
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
import { renderSourcesList, initializeSourcesListClickListener } from './_research_sources.js';
import { showToast } from '../ui/helpers.js';

/**
 * Loads data and renders content based on the active sub-tab for the Research page.
 * @async
 * @returns {Promise<void>}
 */
async function loadResearchPage() {
    const researchPageContainer = document.getElementById('research-page-container');
    if (!researchPageContainer) {
        console.error("[Research Loader] Research page container not found.");
        return;
    }

    const activeSubTabButton = researchPageContainer.querySelector('.research-sub-tabs .sub-tab.active');
    const activeSubTabId = activeSubTabButton instanceof HTMLElement ? activeSubTabButton.dataset.subTab : 'research-sources-panel';

    console.log(`[Research Loader] Preparing to load content for sub-tab: ${activeSubTabId}`);

    const sourcesPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-sources-panel'));
    const paperTradingPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-paper-trading-panel'));
    const actionPlanPanel = /** @type {HTMLDivElement | null} */ (document.getElementById('research-action-plan-panel'));

    try {
        // --- Prepare the Target Panel ---
        let targetPanel = null;
        if (activeSubTabId === 'research-sources-panel') {
            targetPanel = sourcesPanel;
            // --- MODIFIED: Simplified the logic for this panel ---
            if (targetPanel) {
                targetPanel.innerHTML = '<p>Loading sources...</p>';
            }
            // --- END MODIFICATION ---
        } else if (activeSubTabId === 'research-paper-trading-panel') {
            targetPanel = paperTradingPanel;
            if (targetPanel) {
                // Inject the full HTML from _journal.html
                // This ensures all required DOM elements for the journal are present.
                targetPanel.innerHTML = `
                    <h2>Trading Journal & Idea Tracker</h2>
                    <p class="subtitle">Log paper trades, track advice, and analyze strategy performance.</p>

                    <div class="summary-container">
                        <div class="summary-item">
                            <h3>Open Ideas</h3>
                            <p id="journal-open-count">--</p>
                        </div>
                        <div class="summary-item">
                            <h3>Avg. Open P/L</h3>
                            <p id="journal-open-pnl">--</p>
                        </div>
                        <div class="summary-item">
                            <h3>Closed Win Rate</h3>
                            <p id="journal-win-rate">--</p>
                        </div>
                         <div class="summary-item">
                            <h3>Avg. Gain/Loss</h3>
                            <p id="journal-avg-gain-loss">--</p>
                        </div>
                    </div>
                    <div class="sub-tabs journal-sub-tabs" style="margin-bottom: 1.5rem;">
                        <button class="sub-tab active" data-sub-tab="journal-add-panel">Add Entry</button>
                        <button class="sub-tab" data-sub-tab="journal-open-panel">Open Ideas</button>
                        <button class="sub-tab" data-sub-tab="journal-closed-panel">Closed Ideas</button>
                    </div>

                    <div class="sub-tab-content">

                        <div id="journal-add-panel" class="sub-tab-panel active">
                            <div id="add-journal-entry-container" class="info-panel" style="padding: 20px; border: 1px solid var(--container-border); border-radius: 8px;">
                                <h3>Add New Journal Entry / Idea</h3>
                                <form id="add-journal-entry-form" class="add-item-form-grid">
                                    <div class="form-group"> <label for="journal-entry-date">Entry Date*</label> <input type="date" id="journal-entry-date" required> </div>
                                    <div class="form-group"> <label for="journal-ticker">Ticker*</label> <input type="text" id="journal-ticker" placeholder="e.g., AAPL" required> </div>
                                    <div class="form-group"> <label for="journal-exchange">Exchange*</label> <select id="journal-exchange" required></select> </div>
                                    <div class="form-group"> <label for="journal-direction">Direction*</label> <select id="journal-direction" required> <option value="BUY" selected>BUY</option> </select> </div>
                                    <div class="form-group"> <label for="journal-quantity">Quantity*</label> <input type="number" id="journal-quantity" step="any" min="0" placeholder="e.g., 10" required> </div>
                                    <div class="form-group"> <label for="journal-entry-price">Entry Price*</label> <input type="number" id="journal-entry-price" step="any" min="0.01" placeholder="e.g., 150.25" required> </div>
                                    <div class="form-group"> <label for="journal-target-price">Target Price 1 (Take Profit)</label> <input type="number" id="journal-target-price" step="any" min="0.01" placeholder="Optional"> </div>
                                    <div class="form-group"> <label for="journal-target-price-2">Target Price 2 (Optional)</label> <input type="number" id="journal-target-price-2" step="any" min="0.01" placeholder="Optional 2nd target"> </div>
                                    <div class="form-group form-group-span-2"> <label for="journal-stop-loss-price">Stop Loss Price</label> <input type="number" id="journal-stop-loss-price" step="any" min="0.01" placeholder="Optional"> </div>
                                    <div class="form-group"> <label for="journal-advice-source" class="advice-source-select">Advice Source</label> <select id="journal-advice-source" class="advice-source-select"> <option value="">(None/Manual Entry)</option> </select> </div>
                                    <div class="form-group"> <label for="journal-advice-details">Quick Source Notes</label> <input type="text" id="journal-advice-details" placeholder="Brief note if no source selected"> </div>
                                    <div class="form-group form-group-span-2"> <label for="journal-entry-reason">Entry Reason</label> <input type="text" id="journal-entry-reason" placeholder="e.g., Bullish signal, News catalyst"> </div>
                                    <div class="form-group form-group-span-2"> <label for="journal-notes">General Notes</label> <textarea id="journal-notes" rows="2" placeholder="Additional thoughts or observations..."></textarea> </div>
                                    <div class="form-group form-group-span-2" style="text-align: right;"> <button type="submit" id="add-journal-entry-btn">Add Journal Entry</button> </div>
                                </form>
                            </div>
                        </div>

                        <div id="journal-open-panel" class="sub-tab-panel">
                            <h3>Open Ideas / Paper Trades</h3>
                             <div class="filter-bar" style="margin-bottom: 1rem;">
                                <input type="text" id="journal-open-filter-ticker" placeholder="Filter by Ticker...">
                            </div>
                            <table id="journal-open-table" class="journal-table">
                                <thead>
                                   <tr> <th data-sort="entry_date">Entry Date</th> <th data-sort="ticker">Ticker</th> <th class="numeric" data-sort="entry_price" data-type="numeric">Entry Price</th> <th class="numeric" data-sort="quantity" data-type="numeric">Qty</th> <th class="numeric" data-sort="target_price" data-type="numeric">Target 1</th> <th class="numeric" data-sort="target_price_2" data-type="numeric">Target 2</th> <th class="numeric" data-sort="stop_loss_price" data-type="numeric">Stop Loss</th> <th class="numeric" data-sort="current_price" data-type="numeric">Current Price</th> <th class="numeric" data-sort="current_pnl" data-type="numeric">Current P/L</th> <th data-sort="advice_source_id">Source</th> <th class="center-align">Actions</th> </tr>
                                </thead>
                                <tbody id="journal-open-body">
                                    <tr><td colspan="11">Loading open journal entries...</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div id="journal-closed-panel" class="sub-tab-panel">
                            <h3 style="margin-top: 2rem;">Closed / Executed Ideas</h3>
                             <div class="filter-bar" style="margin-bottom: 1rem;">
                                <input type="text" id="journal-closed-filter-ticker" placeholder="Filter by Ticker...">
                                <label for="journal-closed-filter-status">Status:</label>
                                <select id="journal-closed-filter-status">
                                    <option value="">All Closed/Executed</option>
                                    <option value="CLOSED">Closed Only</option>
                                    <option value="EXECUTED">Executed Only</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                            <table id="journal-closed-table" class="journal-table">
                                <thead>
                                   <tr> <th data-sort="entry_date">Entry Date</th> <th data-sort="exit_date">Exit Date</th> <th data-sort="ticker">Ticker</th> <th class="numeric" data-sort="entry_price" data-type="numeric">Entry Price</th> <th class="numeric" data-sort="exit_price" data-type="numeric">Exit Price</th> <th class="numeric" data-sort="quantity" data-type="numeric">Qty</th> <th class="numeric" data-sort="pnl" data-type="numeric">Realized P/L</th> <th data-sort="status">Status</th> <th data-sort="advice_source_id">Source</th> <th class="center-align">Actions</th> </tr>
                                </thead>
                                <tbody id="journal-closed-body">
                                     <tr><td colspan="10">Loading closed journal entries...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        } else if (activeSubTabId === 'research-action-plan-panel') {
            targetPanel = actionPlanPanel;
            if (targetPanel) {
                targetPanel.innerHTML = '<p><i>Action Plan content to be developed...</i></p>';
            }
        } else {
             console.warn(`[Research Loader] No valid sub-tab selected or found: ${activeSubTabId}.`);
             targetPanel = actionPlanPanel || sourcesPanel; // Fallback panel
             if(targetPanel) targetPanel.innerHTML = '<p>Please select a sub-tab.</p>';
        }

        if (!targetPanel) {
             console.error(`[Research Loader] Target panel for "${activeSubTabId}" not found in DOM.`);
             showToast('UI Error: Could not load panel content.', 'error');
             return;
        }
        // --- End Panel Preparation ---


        // --- Load Content into the Prepared Panel ---
        switch (activeSubTabId) {
            case 'research-sources-panel':
                if (sourcesPanel) {
                    await fetchAndStoreAdviceSources();
                    // --- MODIFIED: Pass panel, not grid. Listener is now attached to the panel. ---
                    renderSourcesList(sourcesPanel, state.allAdviceSources);
                    initializeSourcesListClickListener(sourcesPanel); 
                    // --- END MODIFICATION ---
                }
                break;

             case 'research-paper-trading-panel':
                 if (paperTradingPanel) {
                     // The structure is now guaranteed to exist from the step above
                     await loadJournalPage(); // Fetches data AND renders into the structure
                     initializeJournalSubTabHandlers(); // Initialize nested handlers
                     initializeJournalHandlers(); // Initialize journal actions (forms, buttons)
                 }
                 break;

             case 'research-action-plan-panel':
                 // Content already set
                 break;

             // Default case (no tab) handled during panel preparation
        }
    } catch (error) {
        console.error(`[Research Loader] Error loading content for ${activeSubTabId || 'default'}:`, error);
        showToast(`Failed to load content: ${error instanceof Error ? error.message : String(error)}`, 'error');
        const errorPanel = activeSubTabId ? document.getElementById(activeSubTabId) : (actionPlanPanel || sourcesPanel);
        if (errorPanel) {
            errorPanel.innerHTML = '<p style="color: var(--negative-color);">Error loading content.</p>';
        }
    }
}

/**
 * Initializes event handlers for the Research page's top-level sub-tabs.
 * @returns {void}
 */
export function initializeResearchHandlers() {
    console.log("[Research Init] Initializing Research page handlers...");
    // This initializes the click handler for the main "Sources" / "Paper Trading" / "Action Plan" tabs
    initializeResearchSubTabHandlers();
    // Handlers for content *within* the sub-tabs (like the journal)
    // are now initialized dynamically within loadResearchPage when that sub-tab is activated.
    console.log("[Research Init] Research page handlers initialized.");
}

// Export the main loader function
export { loadResearchPage };