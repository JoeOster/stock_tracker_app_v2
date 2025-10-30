# refactor_journal.ps1
# This script refactors the large 'routes/journal.js' file.
# It extracts the business logic into 'journal-crud-logic.js'
# and 'journal-execute-logic.js', then overwrites 'routes/journal.js'
# with a clean "hub" file that requires and calls the new logic.

$ErrorActionPreference = "Stop"

try {
    # Get the base directory
    $baseDir = Get-Location
    $routesDir = Join-Path $baseDir "routes"

    Write-Host -ForegroundColor Cyan "Starting journal route refactor..."

    # 1. Create routes/journal-crud-logic.js
    $crudLogicPath = Join-Path $routesDir "journal-crud-logic.js"
    $crudLogicContent = @'
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
'@
    Write-Host "Creating: $crudLogicPath"
    $crudLogicContent | Out-File -FilePath $crudLogicPath -Encoding utf8

    # 2. Create routes/journal-execute-logic.js
    $executeLogicPath = Join-Path $routesDir "journal-execute-logic.js"
    $executeLogicContent = @'
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
'@
    Write-Host "Creating: $executeLogicPath"
    $executeLogicContent | Out-File -FilePath $executeLogicPath -Encoding utf8

    # 3. OVERWRITE 'routes/journal.js' with the new hub file
    $journalPath = Join-Path $routesDir "journal.js"
    $journalContent = @'
// /routes/journal.js
/**
 * @file Creates and returns an Express router for handling journal entry endpoints.
 * @module routes/journal
 */

const express = require('express');
const router = express.Router();

// --- Import Refactored Business Logic ---
const {
    handleCreateJournalEntry,
    handleUpdateJournalEntry,
    handleDeleteJournalEntry
} = require('./journal-crud-logic.js');
const { handleExecuteJournalEntry } = require('./journal-execute-logic.js');
// --- End Imports ---

/**
 * Creates and returns an Express router for journal entries.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @returns {express.Router} The configured Express router.
 */
module.exports = (db, log) => {
    // Base path for these routes is '/api/journal'

    /**
     * @route GET /api/journal/
     * @group Journal - Operations for journal entries
     * @description Fetches all journal entries, filtered by account holder and optionally by status.
     * @param {string} holder.query.required - The account holder ID.
     * @param {string} [status.query] - Optional status to filter by (e.g., 'OPEN', 'CLOSED').
     * @returns {Array<object>|object} 200 - An array of journal entries. 500 - Server error.
     */
    router.get('/', async (req, res) => {
        try {
            const holderId = req.query.holder;
            const status = req.query.status;
            
            if (!holderId || holderId === 'all') {
                log('[WARN] Attempted to fetch journal without a specific holder ID.');
                return res.status(400).json({ message: "A specific account holder ID is required." });
            }

            let query = `SELECT j.*, s.name as strategy_name 
                         FROM journal_entries j
                         LEFT JOIN strategies s ON j.strategy_id = s.id
                         WHERE j.account_holder_id = ?`;
            const params = [holderId];

            if (status) {
                query += ' AND j.status = ?';
                params.push(status);
            }

            query += ' ORDER BY j.entry_date DESC, j.id DESC';
            
            const entries = await db.all(query, params);
            res.json(entries);
        } catch (e) {
            log(`[ERROR] Failed to fetch journal entries: ${e.message}`);
            res.status(500).json({ message: "Error fetching journal entries." });
        }
    });

    /**
     * @typedef {object} JournalEntryPostBody
     * @property {string|number} account_holder_id
     * @property {string|number} advice_source_id
     * @property {string} ticker
     * @property {string|number} strategy_id
     * @property {string} entry_date - Format YYYY-MM-DD
     * @property {number} entry_price
     * @property {number} quantity
     * @property {number|null} [stop_loss]
     * @property {number|null} [target_price]
     * @property {number|null} [target_price_2]
     * @property {string|null} [notes]
     * @property {'OPEN'|'CLOSED'|'CANCELLED'} [status='OPEN']
     * @property {Array<object>} [linked_document_urls] - e.g., [{title: "Chart", url: "http://..."}]
     */

    /**
     * @route POST /api/journal/
     * @group Journal - Operations for journal entries
     * @description Adds a new journal entry.
     * @param {JournalEntryPostBody} req.body.required - The data for the new journal entry.
     * @returns {object} 201 - The newly created journal entry. 400/500 - Error message.
     */
    router.post('/', async (req, res) => {
        try {
            await db.exec('BEGIN TRANSACTION');
            const newEntry = await handleCreateJournalEntry(db, req.body);
            await db.exec('COMMIT');
            res.status(201).json(newEntry);
        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed to create journal entry: ${error.message}\n${error.stack}`);
            if (error.message.includes('Missing required fields')) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Server error creating journal entry.' });
            }
        }
    });

    /**
     * @route PUT /api/journal/:id
     * @group Journal - Operations for journal entries
     * @description Updates an existing journal entry.
     * @param {string} id.path.required - The ID of the journal entry to update.
     * @param {object} req.body.required - An object with the fields to update.
     * @returns {object} 200 - Success message. 400/404/500 - Error message.
     */
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // Note: This update does not run in a transaction,
            // as it's typically a single UPDATE statement.
            await handleUpdateJournalEntry(db, id, req.body);
            res.json({ message: 'Journal entry updated successfully.' });
        } catch (error) {
            log(`[ERROR] Failed to update journal entry ${id}: ${error.message}\n${error.stack}`);
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else if (error.message.includes('Cannot modify') || error.message.includes('No fields') || error.message.includes('Cannot set status')) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Server error updating journal entry.' });
            }
        }
    });
    
    /**
     * @typedef {object} JournalExecuteBody
     * @property {string} execution_date - Format YYYY-MM-DD
     * @property {number} execution_price
     * @property {string|number} account_holder_id
     */

    /**
     * @route PUT /api/journal/:id/execute
     * @group Journal - Operations for journal entries
     * @description Executes an 'OPEN' journal entry, creating a real BUY transaction.
     * @param {string} id.path.required - The ID of the journal entry to execute.
     * @param {JournalExecuteBody} req.body.required - Execution details.
     * @returns {object} 200 - Success message and new transaction ID. 400/404/500 - Error message.
     */
    router.put('/:id/execute', async (req, res) => {
        const { id } = req.params;
        try {
            await db.exec('BEGIN TRANSACTION');
            const result = await handleExecuteJournalEntry(db, log, id, req.body);
            await db.exec('COMMIT');
            res.json(result);
        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed to execute journal entry ${id}: ${error.message}\n${error.stack}`);
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else if (error.message.includes('Missing') || error.message.includes('Invalid') || error.message.includes('Cannot execute')) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Server error executing journal entry.' });
            }
        }
    });

    /**
     * @route DELETE /api/journal/:id
     * @group Journal - Operations for journal entries
     * @description Deletes a journal entry (if not 'EXECUTED').
     * @param {string} id.path.required - The ID of the journal entry to delete.
     * @returns {object} 200 - Success message. 400/404/500 - Error message.
     */
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await db.exec('BEGIN TRANSACTION');
            await handleDeleteJournalEntry(db, id);
            await db.exec('COMMIT');
            res.json({ message: 'Journal entry and associated documents deleted successfully.' });
        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed to delete journal entry ${id}: ${error.message}\n${error.stack}`);
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else if (error.message.includes('Cannot delete')) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Server error deleting journal entry.' });
            }
        }
    });

    return router;
};
'@
    Write-Host "Overwriting: $journalPath"
    $journalContent | Out-File -FilePath $journalPath -Encoding utf8

    Write-Host -ForegroundColor Green "---"
    Write-Host -ForegroundColor Green "Refactor complete!"
    Write-Host -ForegroundColor Green "Created routes/journal-crud-logic.js and routes/journal-execute-logic.js."
    Write-Host -ForegroundColor Green "Overwrote routes/journal.js to be a clean 'hub'."
    Write-Host -ForegroundColor Yellow "No test files needed patching. Please run 'npm test' to confirm."

} catch {
    Write-Host -ForegroundColor Red "An error occurred:"
    Write-Host -ForegroundColor Red $_
}