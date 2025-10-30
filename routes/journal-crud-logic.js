// /routes/journal-crud-logic.js
/**
 * @file Contains the business logic for CRUD operations (Create, Update, Delete) on journal entries.
 * @module routes/journal-crud-logic
 */

/**
 * Handles the creation of a new journal entry.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {object} body - The request body containing the journal entry data.
 * @returns {Promise<object>} The newly created journal entry object.
 * @throws {Error} If required fields are missing.
 */
async function handleCreateJournalEntry(db, body) {
    const {
        account_holder_id,
        advice_source_id,
        ticker,
        strategy_id,
        entry_date,
        entry_price,
        quantity,
        stop_loss,
        target_price,
        target_price_2, // Added
        notes,
        status = 'OPEN',
        linked_document_urls = [] // Array of { title, url, type, description }
    } = body;

    const createdAt = new Date().toISOString();

    if (!account_holder_id || !advice_source_id || !ticker || !strategy_id || !entry_date || !entry_price || !quantity) {
        throw new Error('Missing required fields for journal entry.');
    }

    const result = await db.run(
        `INSERT INTO journal_entries (
            account_holder_id, advice_source_id, ticker, strategy_id, entry_date, 
            entry_price, quantity, stop_loss, target_price, target_price_2, 
            notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            account_holder_id, advice_source_id, ticker.toUpperCase(), strategy_id, entry_date,
            entry_price, quantity, stop_loss || null, target_price || null, target_price_2 || null,
            notes || null, status, createdAt
        ]
    );

    const newEntryId = result.lastID;

    // Handle linked documents
    if (Array.isArray(linked_document_urls) && linked_document_urls.length > 0) {
        const docStmt = await db.prepare(
            `INSERT INTO documents (
                journal_entry_id, account_holder_id, external_link, title, document_type, description, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        for (const doc of linked_document_urls) {
            if (doc.url) {
                await docStmt.run(
                    newEntryId, account_holder_id, doc.url,
                    doc.title || null, doc.type || null, doc.description || null, createdAt
                );
            }
        }
        await docStmt.finalize();
    }

    // Fetch and return the newly created entry
    const newEntry = await db.get('SELECT * FROM journal_entries WHERE id = ?', newEntryId);
    return newEntry;
}

/**
 * Handles the update of an existing journal entry.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {string|number} id - The ID of the journal entry to update.
 * @param {object} body - The request body containing the updated data.
 * @returns {Promise<void>}
 * @throws {Error} If the entry is not found or validation fails.
 */
async function handleUpdateJournalEntry(db, id, body) {
    const {
        advice_source_id,
        ticker,
        strategy_id,
        entry_date,
        entry_price,
        quantity,
        stop_loss,
        target_price,
        target_price_2, // Added
        notes,
        status
    } = body;

    const existingEntry = await db.get('SELECT * FROM journal_entries WHERE id = ?', id);
    if (!existingEntry) {
        throw new Error('Journal entry not found.');
    }

    // Do not allow editing of 'EXECUTED' entries (or others, if desired)
    if (existingEntry.status === 'EXECUTED') {
        throw new Error('Cannot modify an executed journal entry.');
    }
    
    // Do not allow status to be changed *to* EXECUTED via this endpoint
    if (status === 'EXECUTED') {
        throw new Error("Cannot set status to 'EXECUTED' via the update endpoint. Use the /execute endpoint.");
    }

    // Construct update query dynamically based on provided fields
    const fieldsToUpdate = {
        advice_source_id, ticker, strategy_id, entry_date, entry_price, quantity,
        stop_loss, target_price, target_price_2, notes, status
    };

    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            params.push(value === '' ? null : value); // Allow setting fields to null
        }
    }

    if (updates.length === 0) {
        throw new Error('No fields provided to update.');
    }

    params.push(id); // Add the ID for the WHERE clause
    const query = `UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ?`;

    await db.run(query, params);
}

/**
 * Handles the deletion of a journal entry.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {string|number} id - The ID of the journal entry to delete.
 * @returns {Promise<void>}
 * @throws {Error} If the entry is not found or cannot be deleted.
 */
async function handleDeleteJournalEntry(db, id) {
    const entry = await db.get('SELECT * FROM journal_entries WHERE id = ?', id);
    if (!entry) {
        throw new Error('Journal entry not found.');
    }
    if (entry.status === 'EXECUTED') {
        throw new Error('Cannot delete an executed journal entry.');
    }
    
    // Also delete associated documents
    await db.run('DELETE FROM documents WHERE journal_entry_id = ?', id);
    // Delete the entry itself
    await db.run('DELETE FROM journal_entries WHERE id = ?', id);
}


module.exports = {
    handleCreateJournalEntry,
    handleUpdateJournalEntry,
    handleDeleteJournalEntry
};
