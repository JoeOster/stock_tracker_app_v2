const db = require('../database');

async function handleDividendTransaction(body) {
  const {
    ticker,
    exchange,
    transaction_type,
    quantity,
    price,
    transaction_date,
    account_holder_id,
    advice_source_id,
    linked_journal_id,
  } = body;

  const stmt = await db.prepare(
    'INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id, advice_source_id, linked_journal_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const now = new Date().toISOString();
  const result = await stmt.run(
    ticker,
    exchange,
    transaction_type,
    quantity,
    price,
    transaction_date,
    account_holder_id,
    advice_source_id,
    linked_journal_id,
    now
  );

  await stmt.finalize();

  return { id: result.lastID, ...body };
}

module.exports = { handleDividendTransaction };
