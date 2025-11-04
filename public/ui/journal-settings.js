// public/ui/journal-settings.js
/**
 * @file Contains UI rendering functions specifically for journal-related settings.
 * @module ui/journal-settings
 */

// public/ui/journal-settings.js

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
 * @param {any[]} sources - The FULL list of sources (active and inactive).
 * @returns {void}
 */
export function renderAdviceSourceManagementList(sources) {
  const list = document.getElementById('advice-source-list');
  if (!list) return;
  list.innerHTML = '';

  if (!sources || sources.length === 0) {
    list.innerHTML =
      '<li>No advice sources defined yet for this account holder.</li>';
    return;
  }

  const sortedSources = [...sources].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedSources.forEach((source) => {
    if (!source) return; // Skip if source is undefined
    const li = document.createElement('li');
    li.dataset.id = String(source.id);
    // --- STYLE INACTIVE ITEMS ---
    li.style.opacity = source.is_active ? '1' : '0.6';

    // --- Prepare App Icon and Display ---
    let appIconHTML = '';
    // Use 'details' object for contact info
    const appType = source.details?.contact_app_type?.toLowerCase();
    const appHandle = escapeHTML(source.details?.contact_app_handle);
    if (appType === 'signal') {
      appIconHTML = `<img src="/images/logos/signal.png" alt="Signal" class="contact-app-icon-small"> `;
    } else if (appType === 'whatsapp') {
      appIconHTML = `<img src="/images/logos/whatsapp.jpeg" alt="WhatsApp" class="contact-app-icon-small"> `;
    }

    let appDisplay = '';
    if (source.details?.contact_app_type) {
      appDisplay = `<br><small>App: ${appIconHTML}${escapeHTML(source.details.contact_app_type)}: <span class="source-contact-app-handle">${appHandle || 'N/A'}</span></small>`;
    }
    // --- END APP ICON ---

    // --- Prepare Image Thumbnail ---
    const imagePath =
      escapeHTML(source.image_path) || '/images/contacts/default.png'; // Use default.png as fallback
    const imageThumbnailHTML = `<img src="${imagePath}" alt="Image" class="source-list-thumbnail">`;

    // --- Prepare 'Active' Checkbox ---
    const isChecked = source.is_active ? 'checked' : '';
    const activeCheckboxHTML = `
            <div class="source-active-toggle" style="margin-right: 10px; flex-shrink: 0; display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" id="active-toggle-${source.id}" class="edit-source-is-active" data-id="${source.id}" ${isChecked}>
                <label for="active-toggle-${source.id}" style="cursor: pointer; font-size: 0.9em;">Active</label>
            </div>
        `;

    // --- Prepare 'Hidden' Marker ---
    const hiddenMarker = isChecked
      ? ''
      : `<span class="source-hidden-marker" style="color: var(--negative-color); font-weight: bold; margin-right: 10px;">HIDDEN</span>`;

    // Render the list item HTML
    li.innerHTML = `
            ${activeCheckboxHTML}
            <div class="source-display" style="flex-grow: 1; display: flex; align-items: center;">
                ${imageThumbnailHTML}
                <div>
                    <strong><span class="source-name">${escapeHTML(source.name)}</span></strong> (<span class="source-type">${escapeHTML(source.type)}</span>)
                    ${source.description ? `<br><small class="source-description">${escapeHTML(source.description)}</small>` : ''}
                    ${source.url ? `<br><small>URL: <a href="${escapeHTML(source.url)}" target="_blank" class="source-url">${escapeHTML(source.url)}</a></small>` : ''}
                    ${source.details?.contact_person ? `<br><small>Contact: <span class="source-contact-person">${escapeHTML(source.details.contact_person)}</span></small>` : ''}
                    ${appDisplay}
                </div>
            </div>
            
            <div class="source-edit" style="display: none; flex-grow: 1;">
                 <p><i>Edit via the pop-up modal...</i></p>
            </div>

            <div style="flex-shrink: 0; display: flex; align-items: center;">
                ${hiddenMarker}
                <button class="edit-source-btn" data-id="${source.id}">Edit</button>
                <button class="delete-source-btn delete-btn" data-id="${source.id}">Delete</button>
            </div>
        `;
    list.appendChild(li);
  });
}
