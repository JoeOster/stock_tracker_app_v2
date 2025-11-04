// /public/api/documents-api.js
/**
 * @file API calls related to document links.
 * @module api/documents-api
 */

import { handleResponse } from './api-helpers.js';

/**
 * @typedef {object} DocumentData
 * @property {string|number|null} journal_entry_id - The journal entry ID (nullable).
 * @property {string|number|null} advice_source_id - The advice source ID (nullable).
 * @property {string|number} account_holder_id - The account holder ID.
 * @property {string} external_link - The URL of the document.
 * @property {string} [title] - Optional title.
 * @property {string} [document_type] - Optional type (e.g., 'Chart').
 * @property {string} [description] - Optional description.
 */

/**
 * Adds a document link, associating it with either a journal entry or an advice source.
 * @async
 * @param {DocumentData} documentData - The document data.
 * @returns {Promise<any>} The response from the server.
 */
export async function addDocument(documentData) {
  // @ts-ignore
  if (
    !documentData.account_holder_id ||
    (!documentData.journal_entry_id && !documentData.advice_source_id) ||
    !documentData.external_link
  ) {
    throw new Error(
      'Missing required fields: account holder, link, and either journal or source ID.'
    );
  }
  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(documentData),
  });
  return handleResponse(response);
}

/**
 * Deletes a document link by its ID.
 * @async
 * @param {string|number} documentId - The ID of the document link to delete.
 * @returns {Promise<any>} The response from the server.
 */
export async function deleteDocument(documentId) {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}
