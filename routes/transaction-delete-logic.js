// /routes/transaction-delete-logic.js
/**
 * @file Contains the business logic for deleting a transaction.
 * @module routes/transaction-delete-logic
 */

/**
 * Handles the logic for deleting a transaction.
 * Restores quantity to the parent BUY if a SELL is deleted.
 * Prevents deletion of a BUY if it has child SELLs.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {function(string): void} log - The logging function.
 * @param {string|number} id - The ID of the transaction to delete.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if the transaction is not found or if deleting a BUY with children.
 */
async function handleDeleteTransaction(db, log, id) {
  const transaction = await db.get(
    'SELECT * FROM transactions WHERE id = ?',
    id
  );

  if (!transaction) {
    throw new Error('Transaction not found.');
  }

  if (transaction.transaction_type === 'SELL' && transaction.parent_buy_id) {
    // Restore quantity to parent BUY
    await db.run(
      'UPDATE transactions SET quantity_remaining = quantity_remaining + ? WHERE id = ?',
      [transaction.quantity, transaction.parent_buy_id]
    );
    log(
      `[DELETE] Restored quantity ${transaction.quantity} to parent BUY ID ${transaction.parent_buy_id}`
    );
  } else if (transaction.transaction_type === 'BUY') {
    // Check for child SELLs
    const childSells = await db.all(
      'SELECT id FROM transactions WHERE parent_buy_id = ?',
      id
    );
    if (childSells.length > 0) {
      throw new Error(
        'Cannot delete a BUY transaction that has associated SELL transactions.'
      );
    }
    log(`[DELETE] Deleting BUY transaction ID ${id}`);
  }

  // Delete the transaction itself
  await db.run('DELETE FROM transactions WHERE id = ?', id);
}

module.exports = {
  handleDeleteTransaction,
};
