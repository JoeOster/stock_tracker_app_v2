// /Portfolio V4/public/_events.js
// This file contains the global event bus for the application.

/**
 * Dispatches a custom event to notify components of a data update.
 * @param {string} eventName - The name of the event to dispatch.
 * @param {object} [detail={}] - The data to pass with the event.
 */
export function dispatchDataUpdate(eventName, detail = {}) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Adds a listener for a custom data update event.
 * @param {string} eventName - The name of the event to listen for.
 * @param {function(Event): void} handler - The function to call when the event is dispatched.
 */
export function addDataUpdateListener(eventName, handler) {
  document.addEventListener(eventName, handler);
}
