// /public/event-handlers/_modal_manage_subscriptions.js
/**
 * @file Initializes event handlers for the "Manage Subscriptions" modal.
 * @module event-handlers/_modal_manage_subscriptions
 */

import { state, updateState } from '../state.js';
import { showToast } from '../ui/helpers.js';
import { handleResponse } from '../api/api-helpers.js';
import { fetchAndStoreAdviceSources } from './_journal_settings.js';
import { populateAllAdviceSourceDropdowns } from '../ui/dropdowns.js';
import { renderAdviceSourceManagementList } from '../ui/journal-settings.js';

/**
 * Fetches all global sources and populates the subscription modal.
 * @async
 * @param {string|number} holderId - The account holder ID.
 * @param {string} holderName - The account holder's name.
 * @returns {Promise<void>}
 */
export async function openAndPopulateSubscriptionModal(holderId, holderName) {
    const modal = document.getElementById('manage-subscriptions-modal');
    const title = document.getElementById('manage-subscriptions-title');
    const container = document.getElementById('subscription-list-container');
    
    if (!modal || !title || !container) {
        return showToast('Error: Subscription modal elements not found.', 'error');
    }

    // Set modal title and store holderId
    title.textContent = `Manage Subscribed Sources for ${holderName}`;
    modal.dataset.holderId = String(holderId);
    container.innerHTML = '<p>Loading available sources...</p>';
    modal.classList.add('visible');

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
 * @async
 * @returns {Promise<void>}
 */
async function saveSubscriptions() {
    const modal = document.getElementById('manage-subscriptions-modal');
    const saveBtn = document.getElementById('manage-subscriptions-save-btn');
    if (!modal || !saveBtn) return;

    const holderId = modal.dataset.holderId;
    if (!holderId) {
        return showToast('Error: No account holder ID associated with this action.', 'error');
    }

    const checkboxes = modal.querySelectorAll('.subscription-checkbox:checked');
    const sourceIds = Array.from(checkboxes).map(cb => (/** @type {HTMLElement} */(cb)).dataset.sourceId);

    saveBtn.disabled = true;
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
        
        // We also need to refresh the Settings modal's list
        const { fetchAllAdviceSourcesForUser } = await import('./_journal_settings.js');
        const userSources = await fetchAllAdviceSourcesForUser(holderId);
        renderAdviceSourceManagementList(userSources);

        showToast('Subscriptions updated!', 'success');
        modal.classList.remove('visible');

    } catch (error) {
        // @ts-ignore
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

/**
 * Initializes event listeners for the "Manage Subscriptions" modal.
 * @returns {void}
 */
export function initializeManageSubscriptionsModalHandler() {
    const saveBtn = document.getElementById('manage-subscriptions-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSubscriptions);
    }
}