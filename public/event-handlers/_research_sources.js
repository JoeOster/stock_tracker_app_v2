// public/event-handlers/_research_sources.js
/**
 * @file Main orchestrator for Research Sources UI functionality.
 * @module event-handlers/_research_sources
 */

// Import the primary functions from the specialized modules
import { renderSourcesList } from './_research_sources_render.js';
import { generateSourceDetailsHTML } from './_research_sources_modal.js'; // <-- UPDATED IMPORT
import { initializeSourcesListClickListener } from './_research_sources_listeners.js';

// Re-export the necessary functions for use by other modules (like _research.js)
export {
    renderSourcesList,
    generateSourceDetailsHTML,
    initializeSourcesListClickListener
};