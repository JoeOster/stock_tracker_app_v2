/**
 * @jest-environment jsdom
 */

import { initializeSnapshotsHandlers } from './_snapshots.js';
import { state } from '../state.js';

// Mock the global fetch function
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success!' }),
    })
);

// Mock the switchView function to prevent navigation errors in the test
jest.mock('./_navigation.js', () => ({
    switchView: jest.fn(),
}));

describe('Snapshot Page Interactions', () => {

    beforeEach(() => {
        // Reset mocks and set up the DOM for each test
        fetch.mockClear();
        document.body.innerHTML = `
            <div id="snapshots-page-container">
                <form id="add-snapshot-form">
                    <select id="snapshot-account-holder"><option value="1" selected>Primary</option></select>
                    <input type="date" id="snapshot-date" value="2025-10-15">
                    <select id="snapshot-exchange"><option value="Fidelity" selected>Fidelity</option></select>
                    <input type="number" id="snapshot-value" value="12345.67">
                    <button type="submit">Save Snapshot</button>
                </form>
            </div>
        `;
        // Initialize the event handlers for the snapshot form
        initializeSnapshotsHandlers();
    });

    it('should submit the form and call the snapshot API endpoint', async () => {
        // --- 1. Arrange ---
        const form = document.getElementById('add-snapshot-form');
        
        // --- 2. Act ---
        // Simulate the form submission event
        const submitEvent = new Event('submit');
        form.dispatchEvent(submitEvent);

        // --- 3. Assert ---
        // Check that fetch was called correctly
        expect(fetch).toHaveBeenCalledWith('/api/utility/snapshots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_holder_id: '1',
                snapshot_date: '2025-10-15',
                exchange: 'Fidelity',
                value: 12345.67
            })
        });
    });
});