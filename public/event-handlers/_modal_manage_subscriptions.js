// public/event-handlers/_modal_manage_subscriptions.js
/**
 * @file Initializes event handlers for the "Manage Subscriptions" PANEL.
 * @module event-handlers/_modal_manage_subscriptions
 */

import { state, updateState } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { handleResponse } from '../api/api-helpers.js';
import { fetchAndStoreAdviceSources, fetchAllAdviceSourcesForUser } from './_journal_settings.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';

/**
 * Fetches all global sources and populates the subscription PANEL.
 * @async
 * @param {string|number} holderId - The account holder ID.
 * @param {string} holderName - The account holder's name.
 * @returns {Promise<void>}
 */
export async function populateSubscriptionPanel(holderId, holderName) {
    const title = document.getElementById('subscriptions-panel-title');
    const container = document.getElementById('subscriptions-panel-list-container');
    
    // --- FIX: Button is gone, no need to find it ---
    if (!title || !container) {
        return showToast('Error: Subscription panel elements not found.', 'error');
    }

    // --- MODIFICATION: Store holderId on the list container ---
    title.textContent = `Manage Subscribed Sources for ${holderName}`;
    (/** @type {HTMLElement} */(container)).dataset.holderId = String(holderId); 
    container.innerHTML = '<p>Loading available sources...</p>';
    // --- END MODIFICATION ---

    try {
        // Fetch all sources and their link status for this user
        const response = await fetch(`/api/accounts/holders/${holderId}/sources`);
        const allSources = await handleResponse(response);

        if (!Array.isArray(allSources)) {
            throw new Error("Invalid data received from server.");
        }

        if (allSources.length === 0) {
            container.innerHTML = '<p>No global advice sources have been created by any user yet.</p>';
            return;
        }

        // Group by type
        const grouped = allSources.reduce((acc, source) => {
            const type = source.type || 'Other';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(source);
            return acc;
        }, {});

        // Render checkboxes grouped by type
        let html = '';
        for (const type of Object.keys(grouped).sort()) {
            html += `<h4 style="margin-top: 10px; margin-bottom: 5px; border-bottom: 1px solid var(--container-border);">${type}s</h4>`;
            grouped[type].forEach(source => {
                const isChecked = source.is_linked ? 'checked' : '';
                html += `
                    <div class="form-group-with-checkbox">
                        <input type="checkbox" class="subscription-checkbox" id="sub-check-${source.id}" data-source-id="${source.id}" ${isChecked}>
                        <label for="sub-check-${source.id}" style="cursor: pointer; font-weight: normal; color: var(--text-color);">${source.name}</label>
                    </div>
                `;
            });
        }
        container.innerHTML = html;

    } catch (error) {
        // @ts-ignore
        container.innerHTML = `<p style="color: var(--negative-color);">Error: ${error.message}</p>`;
        // @ts-ignore
        showToast(`Error: ${error.message}`, 'error');
    }
}

/**
 * Saves the user's source subscriptions.
 * This is now exported and called by the main saveSettings function.
 * @async
 * @returns {Promise<void>}
 */
export async function saveSubscriptions() {
    const container = document.getElementById('subscriptions-panel-list-container');
    if (!container) return;

    // --- MODIFICATION: Read holderId from container's dataset ---
    const holderId = (/** @type {HTMLElement} */(container)).dataset.holderId;
    
    // If no holderId is set, this panel was never opened, so do nothing.
    if (!holderId) {
        console.log("[saveSubscriptions] No holderId set on panel, skipping save.");
        return Promise.resolve();
    }
    // --- END MODIFICATION ---

    const checkboxes = container.querySelectorAll('.subscription-checkbox:checked');
    const sourceIds = Array.from(checkboxes).map(cb => (/** @type {HTMLElement} */(cb)).dataset.sourceId);

    try {
        const response = await fetch(`/api/accounts/holders/${holderId}/sources`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceIds: sourceIds })
        });
        await handleResponse(response);

        // If we just modified the *currently selected* user, refresh their sources
        if (holderId === String(state.selectedAccountHolderId)) {
            await fetchAndStoreAdviceSources();
            populateAllAdviceSourceDropdowns();
        }
        
        // Refresh the Advice Sources list in the Data Management tab
        const userSources = await fetchAllAdviceSourcesForUser(holderId);
        renderAdviceSourceManagementList(userSources);
        
        // --- MODIFICATION: Clear the holderId from the dataset after saving ---
        delete (/** @type {HTMLElement} */(container)).dataset.holderId;
        console.log("[saveSubscriptions] Subscriptions updated!");
        // --- END MODIFICATION ---

    } catch (error) {
        // @ts-ignore
        showToast(`Error saving subscriptions: ${error.message}`, 'error');
        // We re-throw the error so the main saveSettings can be aware of it if needed
        throw error;
    }
}

/**
 * Initializes event listeners for the "Manage Subscriptions" PANEL.
 * This function is now EMPTY because the save button was removed.
 * @returns {void}
 */
export function initializeSubscriptionPanelHandlers() {
    // --- REMOVED: Save button listener ---
}