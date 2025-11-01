// /routes/journal-execute-logic.js
/**
 * @file Contains the business logic for executing a journal entry into a real transaction.
 * @module routes/journal-execute-logic
 */

/**
 * Handles the execution of an 'OPEN' journal entry.
 * This will create a new 'BUY' transaction and update the journal entry status.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {string|number} id - The ID of the journal entry to execute.
 * @param {object} body - The request body containing execution details.
 * @returns {Promise<object>} An object containing the new transaction ID.
 * @throws {Error} If validation fails or the entry cannot be executed.
 */
async function handleExecuteJournalEntry(db, log, id, body) {
    const { execution_date, execution_price, account_holder_id } = body;

    if (!execution_date || !execution_price || !account_holder_id) {
        throw new Error('Missing required execution data: date, price, and account holder ID.');
    }
    if (isNaN(parseFloat(execution_price)) || parseFloat(execution_price) <= 0) {
        throw new Error('Invalid execution price.');
    }

    const entry = await db.get('SELECT * FROM journal_entries WHERE id = ? AND account_holder_id = ?', [id, account_holder_id]);

    if (!entry) {
        throw new Error('Journal entry not found for this account holder.');
    }
    if (entry.status !== 'OPEN') {
        throw new Error(`Cannot execute a journal entry with status: ${entry.status}.`);
    }

    const createdAt = new Date().toISOString();
    const numPrice = parseFloat(execution_price);
    const numQuantity = parseFloat(entry.quantity);

    // 1. Create the new BUY transaction
    const txQuery = `INSERT INTO transactions (
                         ticker, exchange, transaction_type, quantity, price, transaction_date,
                         limit_price_up, limit_price_down, limit_price_up_2,
                         original_quantity, quantity_remaining, account_holder_id, 
                         source, created_at, advice_source_id, linked_journal_id
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Try to find the exchange from the advice source
    // This is a best-effort guess; 'Fidelity' is a placeholder default.
    let exchange = 'Fidelity'; // Default
    try {
        const source = await db.get('SELECT * FROM advice_sources WHERE id = ?', [entry.advice_source_id]);
        if (source && source.name) {
            // A simple heuristic to guess the exchange from the source name
            if (source.name.toLowerCase().includes('robinhood')) exchange = 'Robinhood';
            if (source.name.toLowerCase().includes('etrade')) exchange = 'E-Trade';
        }
    } catch (e) {
        log(`[EXECUTE_JOURNAL] Could not find advice source to determine exchange: ${e.message}`);
    }

    const txResult = await db.run(txQuery, [
        entry.ticker,
        exchange, // Best guess
        'BUY',
        numQuantity,
        numPrice,
        execution_date,
        entry.target_price || null,
        entry.stop_loss || null,
        entry.target_price_2 || null,
        numQuantity, // original_quantity
        numQuantity, // quantity_remaining
        account_holder_id,
        'MANUAL', // Source is manual, but linked to journal
        createdAt,
        entry.advice_source_id,
        entry.id // The link!
    ]);

    const newTransactionId = txResult.lastID;
    log(`[EXECUTE_JOURNAL] Created new transaction ID: ${newTransactionId} from journal entry ID: ${id}`);

    // 2. Update the journal entry
    const updateQuery = `UPDATE journal_entries SET 
                             status = 'EXECUTED',
                             execution_date = ?,
                             execution_price = ?
                         WHERE id = ?`;
    await db.run(updateQuery, [execution_date, numPrice, id]);
    
    // 3. Link any existing documents from the journal entry to the new transaction?
    // Decided against this - the link is via the journal entry ID on the transaction.
    // We can find the documents by linking transactions -> journal_entries -> documents.

    return {
        message: 'Journal entry executed successfully!',
        newTransactionId: newTransactionId
    };
}

module.exports = {
    handleExecuteJournalEntry
};
