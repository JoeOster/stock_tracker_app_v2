// public/ui/journal-settings.js
// Version Updated (Apply standard button classes in list)
/**
 * @file Contains UI rendering functions specifically for journal-related settings.
 * @module ui/journal-settings
 */

import { state } from '../state.js';

/**
 * Renders the list of advice sources in the settings modal for management.
 * Assumes state.allAdviceSources contains the fetched data.
 * @returns {void}
 */
export function renderAdviceSourceManagementList() {
    const list = document.getElementById('advice-source-list');
    if (!list) return;
    list.innerHTML = '';

    if (!state.allAdviceSources || state.allAdviceSources.length === 0) {
        list.innerHTML = '<li>No advice sources defined yet for this account holder.</li>';
        return;
    }

    const sortedSources = [...state.allAdviceSources].sort((a, b) => a.name.localeCompare(b.name));

    sortedSources.forEach(source => {
        const li = document.createElement('li');
        li.dataset.id = String(source.id);
        const escapeHTML = (str) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';

        // Removed editDiv content from here for brevity, assume it's correct

        li.innerHTML = `
            <div class="source-display">
                <strong><span class="source-name">${escapeHTML(source.name)}</span></strong> (<span class="source-type">${escapeHTML(source.type)}</span>)
                ${source.description ? `<br><small class="source-description">${escapeHTML(source.description)}</small>` : ''}
                ${source.url ? `<br><small>URL: <a href="${escapeHTML(source.url)}" target="_blank" class="source-url">${escapeHTML(source.url)}</a></small>` : ''}
                ${source.contact_person ? `<br><small>Contact: <span class="source-contact-person">${escapeHTML(source.contact_person)}</span></small>` : ''}
                ${source.contact_email ? `<br><small>Email: <span class="source-contact-email">${escapeHTML(source.contact_email)}</span></small>` : ''}
                ${source.contact_phone ? `<br><small>Phone: <span class="source-contact-phone">${escapeHTML(source.contact_phone)}</span></small>` : ''}
                ${source.contact_app ? `<br><small>App: <span class="source-contact-app">${escapeHTML(source.contact_app)}</span></small>` : ''}
            </div>
            <div class="source-edit" style="display: none;">
                {/* --- Edit form inputs here --- */}
                <input type="text" class="edit-source-name" value="${escapeHTML(source.name)}">
                <select class="edit-source-type">
                    <option value="Person" ${source.type === 'Person' ? 'selected' : ''}>Person</option>
                    <option value="Book" ${source.type === 'Book' ? 'selected' : ''}>Book</option>
                    <option value="Website" ${source.type === 'Website' ? 'selected' : ''}>Website</option>
                    <option value="Group" ${source.type === 'Group' ? 'selected' : ''}>Group</option>
                    <option value="Service" ${source.type === 'Service' ? 'selected' : ''}>Service</option>
                    <option value="Class" ${source.type === 'Class' ? 'selected' : ''}>Class</option>
                    <option value="Other" ${source.type === 'Other' ? 'selected' : ''}>Other</option>
                </select>
                <input type="text" class="edit-source-description" value="${escapeHTML(source.description || '')}" placeholder="Description">
                <input type="url" class="edit-source-url" value="${escapeHTML(source.url || '')}" placeholder="URL">
                <input type="text" class="edit-source-contact-person" value="${escapeHTML(source.contact_person || '')}" placeholder="Contact Person">
                <input type="email" class="edit-source-contact-email" value="${escapeHTML(source.contact_email || '')}" placeholder="Contact Email">
                <input type="tel" class="edit-source-contact-phone" value="${escapeHTML(source.contact_phone || '')}" placeholder="Contact Phone">
                <input type="text" class="edit-source-contact-app" value="${escapeHTML(source.contact_app || '')}" placeholder="Contact App/Handle">
            </div>
            <div>
                <button class="edit-source-btn" data-id="${source.id}">Edit</button>
                <button class="save-source-btn" data-id="${source.id}" style="display: none;">Save</button>
                {/* *** START MODIFICATION: Add .cancel-btn class *** */}
                <button class="cancel-source-btn cancel-btn" data-id="${source.id}" style="display: none;">Cancel</button>
                {/* *** END MODIFICATION *** */}
                {/* *** START MODIFICATION: Add .delete-btn class *** */}
                <button class="delete-source-btn delete-btn" data-id="${source.id}">Delete</button>
                {/* *** END MODIFICATION *** */}
            </div>
        `;
        list.appendChild(li);
    });
}