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
 * --- ADDED: Helper to render a single group of cards ---
 * Generates the HTML for a heading and a card grid for a specific group of sources.
 * @param {string} title - The heading for the group (e.g., "People").
 * @param {any[]} sources - The array of source objects in this group.
 * @returns {string} The HTML string for this group.
 */
function _renderCardGroup(title, sources) {
    if (!sources || sources.length === 0) {
        return ''; // Don't render empty groups
    }

    let groupHtml = `<h3 class="source-group-heading">${title}</h3>`;
    groupHtml += `<div class="cards-grid">`;

    sources.forEach(source => {
        // Prepare Image Thumbnail
        const imagePath = source.image_path ? escapeHTML(source.image_path) : '/images/contacts/default.png'; // Use default.png
        const imageThumbnailHTML = `<img src="${imagePath}" alt="" class="source-list-thumbnail">`;
        const fallbackIconHTML = '<span style="font-size: 1.5em; margin-right: 5px;">ℹ️</span>'; // Simple info icon as fallback
        const escapedName = escapeHTML(source.name);

        // --- MODIFIED: Added title attribute for tooltip ---
        const cardHTML = `
            <div class="source-card clickable-source" data-source-id="${source.id}" title="${escapedName}" style="cursor: pointer;">
                <div class="card-header">
                    ${source.image_path ? imageThumbnailHTML : fallbackIconHTML}
                    <h3 class="source-name" style="margin: 0;">${escapedName}</h3>
                    <small style="margin-left: auto;" class="source-type">(${escapeHTML(source.type)})</small>
                </div>
                <div class="card-body" style="font-size: 0.9em; min-height: 60px;">
                    <p style="margin: 0; color: var(--text-muted-color); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2;">
                        ${escapeHTML(source.description) || (source.contact_person ? `Contact: ${escapeHTML(source.contact_person)}` : 'Click to view details...')}
                    </p>
                </div>
            </div>
        `;
        // --- END MODIFICATION ---
        groupHtml += cardHTML;
    });

    groupHtml += `</div>`; // Close cards-grid
    return groupHtml;
}


/**
 * Renders the list of advice sources into a card grid.
 * @param {HTMLDivElement} panelElement - The panel element (#research-sources-panel).
 * @param {any[]} sources - Array of advice source objects.
 * @returns {void}
 */
export function renderSourcesList(panelElement, sources) {
    // --- MODIFIED: This function now renders grouped grids directly into the panel ---

    if (!panelElement) {
        console.error("renderSourcesList: Could not find panelElement.");
        return;
    }

    panelElement.innerHTML = ''; // Clear previous content (e.g., "Loading...")

    const sortedSources = Array.isArray(sources)
        ? [...sources].sort((a, b) => a.name.localeCompare(b.name))
        : [];

    if (sortedSources.length === 0) {
        panelElement.innerHTML = '<p>No advice sources defined yet for this account holder. Add sources via Settings -> Data Management -> Advice Sources.</p>';
        return;
    }

    // 1. Categorize sources
    const people = sortedSources.filter(s => s.type === 'Person');
    const groups = sortedSources.filter(s => s.type === 'Group');
    const books = sortedSources.filter(s => s.type === 'Book');
    const websites = sortedSources.filter(s => s.type === 'Website');
    // Group all remaining types into "Other"
    const otherTypes = ['Person', 'Group', 'Book', 'Website'];
    const others = sortedSources.filter(s => !otherTypes.includes(s.type));

    // 2. Render each group
    let finalHtml = '';
    finalHtml += _renderCardGroup('People', people);
    finalHtml += _renderCardGroup('Groups', groups);
    finalHtml += _renderCardGroup('Books', books);
    finalHtml += _renderCardGroup('Websites', websites);
    finalHtml += _renderCardGroup('Other', others);

    // 3. Populate the panel
    panelElement.innerHTML = finalHtml;
    // --- END MODIFICATION ---
}