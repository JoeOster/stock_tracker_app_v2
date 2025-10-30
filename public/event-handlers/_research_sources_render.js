// public/event-handlers/_research_sources_render.js
/**
 * @file Renders the list of Advice Source cards for the main Research tab.
 * @module event-handlers/_research_sources_render
 */

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
 * Renders the list of advice sources into a card grid.
 * @param {HTMLDivElement} panelElement - The panel element (#research-sources-panel).
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
export function renderSourcesList(panelElement, sources) {
    const gridContainer = /** @type {HTMLDivElement | null} */(panelElement.querySelector('#sources-cards-grid'));

    if (!gridContainer) {
        console.error("renderSourcesList: Could not find #sources-cards-grid container.");
        panelElement.innerHTML = '<p style="color: var(--negative-color);">Error: UI container for source cards not found.</p>';
        return;
    }

    gridContainer.innerHTML = ''; // Clear previous content

    const sortedSources = Array.isArray(sources)
        ? [...sources].sort((a, b) => a.name.localeCompare(b.name))
        : [];

    if (sortedSources.length === 0) {
        gridContainer.innerHTML = '<p>No advice sources defined yet for this account holder. Add sources via Settings -> Data Management -> Advice Sources.</p>';
        return;
    }

    sortedSources.forEach(source => {
        // Prepare Image Thumbnail
        const imagePath = source.image_path ? escapeHTML(source.image_path) : '/images/contacts/default.png'; // Use default.png
        const imageThumbnailHTML = `<img src="${imagePath}" alt="" class="source-list-thumbnail">`;
        const fallbackIconHTML = '<span style="font-size: 1.5em; margin-right: 5px;">ℹ️</span>'; // Simple info icon as fallback

        const cardHTML = `
            <div class="source-card clickable-source" data-source-id="${source.id}" style="cursor: pointer;">
                <div class="card-header">
                    ${source.image_path ? imageThumbnailHTML : fallbackIconHTML}
                    <h3 class="source-name" style="margin: 0;">${escapeHTML(source.name)}</h3>
                    <small style="margin-left: auto;" class="source-type">(${escapeHTML(source.type)})</small>
                </div>
                <div class="card-body" style="font-size: 0.9em; min-height: 60px;">
                    <p style="margin: 0; color: var(--text-muted-color); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2;">
                        ${escapeHTML(source.description) || (source.contact_person ? `Contact: ${escapeHTML(source.contact_person)}` : 'Click to view details...')}
                    </p>
                </div>
            </div>
        `;
        gridContainer.innerHTML += cardHTML;
    });
}