// /public/api/api-helpers.js
/**
 * @file This file contains the shared helper for handling API fetch responses.
 * @module api/api-helpers
 */

/**
 * @typedef {object} ApiError
 * @property {string} message
 */

/**
 * A helper function to handle fetch responses, throwing an error with a server message if not ok.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<any>} A promise that resolves to the JSON body of the response.
 * @throws {Error} Throws an error with the server message if the response is not ok.
 */
export async function handleResponse(response) {
  if (!response.ok) {
    // Try to parse JSON error, fallback to status text
    const errorData = await response
      .json()
      .catch(() => ({
        message:
          response.statusText ||
          `Server responded with status: ${response.status}`,
      }));
    throw new Error(errorData.message || 'An unknown error occurred.');
  }
  // Handle cases where the response might be empty (e.g., successful DELETE with 204 No Content)
  if (response.status === 204) {
    return { message: 'Operation successful.' }; // Return a success object
  }
  // Handle text/plain responses (like some DELETEs might send)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/plain')) {
    const text = await response.text();
    try {
      // Try to parse if it's JSON disguised as text
      return JSON.parse(text);
    } catch {
      // Return plain text message
      return { message: text };
    }
  }
  return response.json(); // Otherwise, parse JSON body
}
