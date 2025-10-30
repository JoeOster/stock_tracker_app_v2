// /routes/transaction-update-logic.js
/**
 * @file Contains the business logic for updating a transaction.
 * @module routes/transaction-update-logic
 */

/**
 * Handles the logic for updating an existing transaction.
 * @param {import('sqlite').Database} db - The database connection object.
 * @param {string|number} id - The ID of the transaction to update.
 * @param {object} txData - The transaction data from the request body.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error for invalid input or if the transaction is not found.
 */
async function handleUpdateTransaction(db, id, txData) {
    const {
        ticker, exchange, quantity, price, transaction_date,
        limit_price_up, limit_up_expiration,
        limit_price_down, limit_down_expiration,
        limit_price_up_2, limit_up_expiration_2,
        account_holder_id,
        linked_journal_id
    } = txData;

    const numQuantity = parseFloat(quantity);
    const numPrice = parseFloat(price);

    if (!ticker || !exchange || !transaction_date || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice <= 0 || !account_holder_id) {
        throw new Error('Invalid input. Ensure all fields are valid.');
    }

    const originalTx = await db.get('SELECT * FROM transactions WHERE id = ?', id);
    if (!originalTx) {
        throw new Error('Transaction not found.');
    }

    // Adjust quantity_remaining if original_quantity of a BUY lot is changed
    if (originalTx.transaction_type === 'BUY') {
         const qtyMatch = Math.abs(originalTx.quantity_remaining - originalTx.original_quantity) < 0.00001;
         const qtyDifference = numQuantity - originalTx.original_quantity;

         if (qtyMatch || qtyDifference > 0) {
             const newQuantityRemaining = originalTx.quantity_remaining + qtyDifference;
             await db.run('UPDATE transactions SET original_quantity = ?, quantity_remaining = ? WHERE id = ?', [numQuantity, newQuantityRemaining, id]);
         } else {
              await db.run('UPDATE transactions SET original_quantity = ? WHERE id = ?', [numQuantity, id]);
         }
    }

    const query = `UPDATE transactions SET
        ticker = ?, exchange = ?, quantity = ?, price = ?, transaction_date = ?,
        limit_price_up = ?, limit_up_expiration = ?,
        limit_price_down = ?, limit_down_expiration = ?,
        limit_price_up_2 = ?, limit_up_expiration_2 = ?,
        account_holder_id = ?, linked_journal_id = ?
        WHERE id = ?`;
    
    await db.run(query, [
        ticker.toUpperCase(), exchange, numQuantity, numPrice, transaction_date,
        limit_price_up || null, limit_up_expiration || null,
        limit_price_down || null, limit_down_expiration || null,
        limit_price_up_2 || null, limit_up_expiration_2 || null,
        account_holder_id,
        linked_journal_id || null,
        id
    ]);
}

module.exports = {
    handleUpdateTransaction
};
