// public/ui/journal-settings.js
/**
 * @file Contains UI rendering functions specifically for journal-related settings.
 * @module ui/journal-settings
 */

import { state } from '../state.js';

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
 * Renders the list of advice sources in the settings modal for management.
 * Assumes state.allAdviceSources contains the fetched data.
 * Includes icons and image thumbnails.
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

        // --- Prepare App Icon and Display ---
        let appIconHTML = '';
        const appType = source.contact_app_type?.toLowerCase();
        const appHandle = escapeHTML(source.contact_app_handle);
        let appDisplay = '';
        if (appType === 'signal') {
            appIconHTML = `<img src="/images/logos/signal.png" alt="Signal" class="contact-app-icon-small"> `;
        } else if (appType === 'whatsapp') {
            appIconHTML = `<img src="/images/logos/whatsapp.jpeg" alt="WhatsApp" class="contact-app-icon-small"> `;
        } // Add more icons here (Discord, Email, etc.) later if available

        if (source.contact_app_type) {
            appDisplay = `<br><small>App: ${appIconHTML}${escapeHTML(source.contact_app_type)}: <span class="source-contact-app-handle">${appHandle || 'N/A'}</span></small>`;
        } else if (source.contact_app) { // Fallback for old data
             appDisplay = `<br><small>App (Old): <span class="source-contact-app">${escapeHTML(source.contact_app)}</span></small>`;
        }

        // --- Prepare Image Thumbnail ---
        const imageThumbnailHTML = source.image_path
            ? `<img src="${escapeHTML(source.image_path)}" alt="Image" class="source-list-thumbnail">`
            : ''; // No fallback icon needed here, just empty string

        // --- Prepare Edit Form App Type Options ---
        const appTypeOptions = [
            { value: "", text: "(None)" },
            { value: "Signal", text: "Signal" },
            { value: "WhatsApp", text: "WhatsApp" },
            { value: "Discord", text: "Discord" },
            { value: "Email", text: "Email" },
            { value: "Phone", text: "Phone" },
            { value: "Other", text: "Other" }
        ];
        const editAppTypeSelectHTML = `
            <select class="edit-source-contact-app-type">
                ${appTypeOptions.map(opt => `<option value="${opt.value}" ${source.contact_app_type === opt.value ? 'selected' : ''}>${opt.text}</option>`).join('')}
            </select>
        `;

        // Render the list item HTML
        li.innerHTML = `
            <div class="source-display" style="flex-grow: 1; display: flex; align-items: center;">
                ${imageThumbnailHTML}
                <div>
                    <strong><span class="source-name">${escapeHTML(source.name)}</span></strong> (<span class="source-type">${escapeHTML(source.type)}</span>)
                    ${source.description ? `<br><small class="source-description">${escapeHTML(source.description)}</small>` : ''}
                    ${source.url ? `<br><small>URL: <a href="${escapeHTML(source.url)}" target="_blank" class="source-url">${escapeHTML(source.url)}</a></small>` : ''}
                    ${source.contact_person ? `<br><small>Contact: <span class="source-contact-person">${escapeHTML(source.contact_person)}</span></small>` : ''}
                    ${source.contact_email ? `<br><small>Email: <span class="source-contact-email">${escapeHTML(source.contact_email)}</span></small>` : ''}
                    ${source.contact_phone ? `<br><small>Phone: <span class="source-contact-phone">${escapeHTML(source.contact_phone)}</span></small>` : ''}
                    ${appDisplay}
                </div>
            </div>
            <div class="source-edit" style="display: none; flex-grow: 1;">
                 <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 5px 10px; align-items: center;">
                    ${imageThumbnailHTML ? `<div style="grid-row: span 4;">${imageThumbnailHTML}</div>` : `<div style="grid-row: span 4;"></div>` /* Placeholder */}
                    <input type="text" class="edit-source-name" value="${escapeHTML(source.name)}" placeholder="Name*" required>
                    <select class="edit-source-type" required>
                        <option value="Person" ${source.type === 'Person' ? 'selected' : ''}>Person</option>
                        <option value="Book" ${source.type === 'Book' ? 'selected' : ''}>Book</option>
                        <option value="Website" ${source.type === 'Website' ? 'selected' : ''}>Website</option>
                        <option value="Group" ${source.type === 'Group' ? 'selected' : ''}>Group</option>
                        <option value="Service" ${source.type === 'Service' ? 'selected' : ''}>Service</option>
                        <option value="Class" ${source.type === 'Class' ? 'selected' : ''}>Class</option>
                        <option value="Other" ${source.type === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                    <input type="text" class="edit-source-description" value="${escapeHTML(source.description || '')}" placeholder="Description" style="grid-column: 2 / 4;">
                    <input type="url" class="edit-source-url" value="${escapeHTML(source.url || '')}" placeholder="URL" style="grid-column: 2 / 4;">
                    <input type="text" class="edit-source-contact-person" value="${escapeHTML(source.contact_person || '')}" placeholder="Contact Person" style="grid-column: 2 / 4;">
                    <input type="email" class="edit-source-contact-email" value="${escapeHTML(source.contact_email || '')}" placeholder="Contact Email" style="grid-column: 2 / 4;">
                    <input type="tel" class="edit-source-contact-phone" value="${escapeHTML(source.contact_phone || '')}" placeholder="Contact Phone" style="grid-column: 2 / 4;">
                    ${editAppTypeSelectHTML}
                    <input type="text" class="edit-source-contact-app-handle" value="${escapeHTML(source.contact_app_handle || '')}" placeholder="Handle/Address">
                    <input type="text" class="edit-source-image-path" value="${escapeHTML(source.image_path || '')}" placeholder="Image Path (/images/...)" style="grid-column: 2 / 4;">
                </div>
            </div>
            <div style="flex-shrink: 0;">
                <button class="edit-source-btn" data-id="${source.id}">Edit</button>
                <button class="save-source-btn" data-id="${source.id}" style="display: none;">Save</button>
                <button class="cancel-source-btn cancel-btn" data-id="${source.id}" style="display: none;">Cancel</button>
                <button class="delete-source-btn delete-btn" data-id="${source.id}">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}