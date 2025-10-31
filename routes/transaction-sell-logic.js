// /routes/transaction-sell-logic.js
/**
 * @file Contains the business logic for creating SELL transactions (single and selective).
 * @module routes/transaction-sell-logic
 */

const { internalFormatQuantity } = require('./transaction-helpers.js');

/**
 * Archives a watchlist item if it's linked to the parent BUY lot.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {object} parentBuy - The parent BUY transaction object.
 * @param {string|number} accountHolderId - The account holder ID.
 * @param {string} ticker - The ticker symbol.
 */
async function archiveWatchlistItem(db, log, parentBuy, accountHolderId, ticker) {
    if (parentBuy.advice_source_id) {
        log(`[TRANSACTION] Archiving watchlist item for Ticker: ${ticker}, Source: ${parentBuy.advice_source_id}`);
        await db.run(
            "UPDATE watchlist SET status = 'CLOSED' WHERE account_holder_id = ? AND ticker = ? AND advice_source_id = ?",
            [accountHolderId, ticker.toUpperCase(), parentBuy.advice_source_id]
        );
    }
}

/**
 * Handles the creation of a single-lot SELL transaction.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {object} txData - The transaction data from the request body.
 * @param {string} createdAt - The ISO string for the creation timestamp.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error for invalid quantity, date, or if parent lot is not found.
 */
async function handleSingleLotSell(db, log, txData, createdAt) {
    const {
        ticker, exchange, transaction_type, price, transaction_date,
        account_holder_id, parent_buy_id, quantity
    } = txData;

    const numPrice = parseFloat(price);
    const numQuantity = parseFloat(quantity);

    if (isNaN(numQuantity) || numQuantity <= 0) {
        throw new Error('Invalid quantity for single lot SELL.');
    }

    const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'', [parent_buy_id, account_holder_id]);
    if (!parentBuy) {
        throw new Error('Parent buy transaction not found for this account holder.');
    }
    if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) {
        throw new Error('Sell date cannot be before the buy date.');
    }
    if (parentBuy.quantity_remaining < numQuantity - 0.00001) {
        throw new Error(`Sell quantity (${internalFormatQuantity(numQuantity)}) exceeds remaining quantity (${internalFormatQuantity(parentBuy.quantity_remaining)}) in the selected lot.`);
    }

// Insert the single SELL record, copying source/journal links from parent
const sellQuery = `INSERT INTO transactions (
                       ticker, exchange, transaction_type, quantity, price, transaction_date, 
                       parent_buy_id, account_holder_id, source, created_at,
                       advice_source_id, linked_journal_id
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
await db.run(sellQuery, [
    ticker.toUpperCase(), exchange, transaction_type, numQuantity, numPrice, transaction_date, 
    parent_buy_id, account_holder_id, 'MANUAL', createdAt,
    parentBuy.advice_source_id, parentBuy.linked_journal_id
]);
    // Update parent BUY lot
    await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [numQuantity, parent_buy_id]);

    // Archive linked watchlist item
    await archiveWatchlistItem(db, log, parentBuy, account_holder_id, ticker);
}

/**
 * Handles the creation of a selective (multi-lot) SELL transaction.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {object} txData - The transaction data from the request body.
 * @param {string} createdAt - The ISO string for the creation timestamp.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error for invalid quantities, dates, or if parent lots are not found.
 */
async function handleSelectiveSell(db, log, txData, createdAt) {
    const {
        ticker, exchange, transaction_type, price, transaction_date,
        account_holder_id, lots, quantity // 'quantity' is the expected total
    } = txData;

    const numPrice = parseFloat(price);
    let totalSellQuantityFromLots = 0;
    /** @type {Set<number>} */
    const adviceSourceIdsToArchive = new Set();

    for (const lotInfo of lots) {
        const lotQty = parseFloat(lotInfo.quantity_to_sell);
        if (isNaN(lotQty) || lotQty <= 0) continue; // Skip invalid or zero
        totalSellQuantityFromLots += lotQty;

        const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ? AND account_holder_id = ? AND transaction_type = \'BUY\'', [lotInfo.parent_buy_id, account_holder_id]);
        if (!parentBuy) {
            throw new Error(`Parent buy transaction (ID: ${lotInfo.parent_buy_id}) not found for this account holder.`);
        }
        if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) {
            throw new Error(`Sell date cannot be before the buy date of lot ID ${lotInfo.parent_buy_id}.`);
        }
        if (parentBuy.quantity_remaining < lotQty - 0.00001) {
            throw new Error(`Sell quantity (${internalFormatQuantity(lotQty)}) exceeds remaining quantity (${internalFormatQuantity(parentBuy.quantity_remaining)}) in lot ID ${lotInfo.parent_buy_id}.`);
        }

        if (parentBuy.advice_source_id) {
            adviceSourceIdsToArchive.add(parentBuy.advice_source_id);
        }

        // Insert a SELL record for this lot, copying source/journal links from parent
        const sellQuery = `INSERT INTO transactions (
                                ticker, exchange, transaction_type, quantity, price, transaction_date, 
                                parent_buy_id, account_holder_id, source, created_at,
                                advice_source_id, linked_journal_id
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.run(sellQuery, [
            ticker.toUpperCase(), exchange, transaction_type, lotQty, numPrice, transaction_date, 
            lotInfo.parent_buy_id, account_holder_id, 'MANUAL', createdAt,
            parentBuy.advice_source_id, parentBuy.linked_journal_id
        ]); 
        // Update parent BUY lot
        await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [lotQty, lotInfo.parent_buy_id]);
    }

    // Archive linked watchlist items
    if (adviceSourceIdsToArchive.size > 0) {
        const adviceIds = [...adviceSourceIdsToArchive];
        const placeholders = adviceIds.map(() => '?').join(',');
        log(`[TRANSACTION] Archiving watchlist items for Ticker: ${ticker}, Sources: ${adviceIds.join(', ')}`);
        await db.run(
            `UPDATE watchlist SET status = 'CLOSED' WHERE account_holder_id = ? AND ticker = ? AND advice_source_id IN (${placeholders})`,
            [account_holder_id, ticker.toUpperCase(), ...adviceIds]
        );
    }

    // Final check
    const expectedTotalQuantity = parseFloat(quantity);
     if (!isNaN(expectedTotalQuantity) && Math.abs(totalSellQuantityFromLots - expectedTotalQuantity) > 0.00001) {
         throw new Error('Total quantity specified does not match the sum of quantities entered for individual lots.');
     }
     if (totalSellQuantityFromLots <= 0) {
         throw new Error('Total quantity to sell must be greater than zero.');
     }
}

/**
 * Main handler for SELL transactions.
 * Determines whether to call single-lot or selective-lot logic.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {function(import('sqlite').Database, string): Promise<void>} captureEodPrices - Function to capture EOD prices.
 * @param {object} txData - The transaction data from the request body.
 * @param {string} createdAt - The ISO string for the creation timestamp.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if the SELL payload is invalid.
 */
async function handleSellTransaction(db, log, captureEodPrices, txData, createdAt) {
    const { parent_buy_id, lots, transaction_date } = txData;

    // --- Case 1: Single Lot Sell ---
    if (parent_buy_id && !lots) {
        await handleSingleLotSell(db, log, txData, createdAt);
    }
    // --- Case 2: Selective Sell ---
    else if (lots && Array.isArray(lots) && lots.length > 0) {
        await handleSelectiveSell(db, log, txData, createdAt);
    }
    // --- Case 3: Invalid SELL payload ---
    else {
        throw new Error('Invalid SELL transaction payload. Must provide either a single parent_buy_id or a valid lots array.');
    }

    // Trigger EOD price capture if successful
    if (process.env.NODE_ENV !== 'test' && typeof captureEodPrices === 'function') {
        captureEodPrices(db, transaction_date);
    }
}

module.exports = {
    handleSellTransaction
};
