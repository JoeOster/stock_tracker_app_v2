const db = require('../database');

async function handleStockSplit(body, res) {
  const { ticker, split_from, split_to, split_date, account_holder_id } = body;

  if (
    !ticker ||
    !split_from ||
    !split_to ||
    !split_date ||
    !account_holder_id
  ) {
    return res
      .status(400)
      .json({ message: 'Missing required fields for stock split.' });
  }

  const from = parseFloat(split_from);
  const to = parseFloat(split_to);

  if (isNaN(from) || isNaN(to) || from <= 0 || to <= 0) {
    return res.status(400).json({ message: 'Invalid split ratio.' });
  }

  const ratio = to / from;

  await db.run('BEGIN TRANSACTION');

  try {
    const openLots = await db.all(
      "SELECT * FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 AND transaction_type = 'BUY'",
      [ticker, account_holder_id]
    );

    for (const lot of openLots) {
      const newQuantity = lot.quantity_remaining * ratio;
      const newPrice = lot.price / ratio;
      const newOriginalQuantity = lot.original_quantity * ratio;

      await db.run(
        'UPDATE transactions SET quantity_remaining = ?, price = ?, original_quantity = ? WHERE id = ?',
        [newQuantity, newPrice, newOriginalQuantity, lot.id]
      );
    }

    const stmt = await db.prepare(
      'INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const now = new Date().toISOString();
    await stmt.run(
      ticker,
      'SPLIT',
      'SPLIT',
      to,
      from,
      split_date,
      account_holder_id,
      now
    );
    await stmt.finalize();

    await db.run('COMMIT');

    return { message: 'Stock split logged successfully.' };
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Failed to process stock split:', error);
    return res.status(500).json({ message: 'Failed to process stock split.' });
  }
}

module.exports = { handleStockSplit };
