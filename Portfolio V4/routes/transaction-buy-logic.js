// /routes/transaction-buy-logic.js
/**
 * @file Contains the business logic for creating a BUY transaction.
 * @module routes/transaction-buy-logic
 */

// --- *** ADDED IMPORT *** ---
const { archiveWatchlistItem } = require('./transaction-helpers.js');
// --- *** END IMPORT *** ---

/**
 * Handles the creation of a single BUY transaction.
 * Assumes validation has already been passed.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {object} txData - The transaction data from the request body.
 * @param {string} createdAt - The ISO string for the creation timestamp.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if the quantity is invalid.
 */
async function handleBuyTransaction(db, log, txData, createdAt) {
  // <-- Added 'log'
  const {
    ticker,
    exchange,
    transaction_type,
    price,
    transaction_date,
    limit_price_up,
    limit_up_expiration,
    limit_price_down,
    limit_down_expiration,
    limit_price_up_2,
    limit_up_expiration_2,
    account_holder_id,
    advice_source_id,
    linked_journal_id,
    quantity, // Specific to BUY
  } = txData;

  const numPrice = parseFloat(price);
  const numQuantity = parseFloat(quantity);

  if (isNaN(numQuantity) || numQuantity <= 0) {
    throw new Error('Invalid quantity for BUY.');
  }

  const original_quantity = numQuantity;
  const quantity_remaining = numQuantity;

  const query = `INSERT INTO transactions (
                       ticker, exchange, transaction_type, quantity, price, transaction_date,
                       limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration,
                       limit_price_up_2, limit_up_expiration_2,
                       parent_buy_id, original_quantity, quantity_remaining, account_holder_id, source, created_at,
                       advice_source_id, linked_journal_id
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  await db.run(query, [
    ticker.toUpperCase(),
    exchange,
    transaction_type,
    numQuantity,
    numPrice,
    transaction_date,
    limit_price_up || null,
    limit_up_expiration || null,
    limit_price_down || null,
    limit_down_expiration || null,
    limit_price_up_2 || null,
    limit_up_expiration_2 || null,
    null,
    original_quantity,
    quantity_remaining,
    account_holder_id,
    'MANUAL',
    createdAt,
    advice_source_id || null,
    linked_journal_id || null,
  ]);

  // --- *** ADDED THIS CALL *** ---
  // Now, archive the associated watchlist item
  // We pass txData as the "BUY" object
  await archiveWatchlistItem(db, log, txData, account_holder_id, ticker);
  // --- *** END ADDED CALL *** ---
}

module.exports = {
  handleBuyTransaction,
};
