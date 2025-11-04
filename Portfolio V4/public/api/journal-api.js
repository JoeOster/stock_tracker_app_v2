// /public/api/journal-api.js
/**
 * @file API calls related to journal entries.
 * @module api/journal-api
 */

import { handleResponse } from './api-helpers.js';

/**
 * Fetches journal entries for a given account holder, optionally filtering by status.
 * @async
 * @param {string|number} holderId - The ID of the account holder ('all' not recommended here).
 * @param {'OPEN' | 'CLOSED' | 'EXECUTED' | 'CANCELLED' | null} [status=null] - Optional status to filter by.
 * @returns {Promise<any[]>} A promise that resolves to an array of journal entry objects.
 */
export async function fetchJournalEntries(holderId, status = null) {
  if (!holderId || holderId === 'all') {
    console.warn(
      'A specific account holder ID is required to fetch journal entries.'
    );
    return [];
  }
  let url = `/api/journal?holder=${holderId}`;
  if (status) {
    url += `&status=${status}`;
  }
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Adds a new journal entry to the database.
 * @async
 * @param {object} entryData - The data for the new journal entry. (Should match JournalEntryPostBody)
 * @returns {Promise<any>} A promise that resolves to the newly created journal entry object.
 */
export async function addJournalEntry(entryData) {
  const response = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData),
  });
  return handleResponse(response);
}

/**
 * Updates an existing journal entry.
 * @async
 * @param {string|number} id - The ID of the journal entry to update.
 * @param {object} updateData - An object containing the fields to update.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function updateJournalEntry(id, updateData) {
  const response = await fetch(`/api/journal/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
}

/**
 * Executes an open journal entry, creating a real transaction.
 * @async
 * @param {string|number} id - The ID of the journal entry to execute.
 * @param {object} executionData - Details of the execution (date, price, account_holder_id).
 * @param {string} executionData.execution_date - The actual date the trade was executed (YYYY-MM-DD).
 * @param {number} executionData.execution_price - The actual price the trade was executed at.
 * @param {string|number} executionData.account_holder_id - The account holder performing the execution.
 * @returns {Promise<any>} A promise that resolves to the server's response (including the new transaction ID).
 */
export async function executeJournalEntry(id, executionData) {
  const response = await fetch(`/api/journal/${id}/execute`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(executionData),
  });
  return handleResponse(response);
}

/**
 * Deletes a journal entry.
 * @async
 * @param {string|number} id - The ID of the journal entry to delete.
 * @returns {Promise<any>} A promise that resolves to the server's response message.
 */
export async function deleteJournalEntry(id) {
  const response = await fetch(`/api/journal/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}
