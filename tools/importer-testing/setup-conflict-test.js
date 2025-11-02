// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/tools/importer-testing/setup-conflict-test.js
const path = require('path');
const setupDatabase = require(
  path.resolve(__dirname, '..', '..', 'database.js')
);

const manualTransactions = [
  // Fidelity
  {
    ticker: 'AAPL',
    exchange: 'Fidelity',
    type: 'BUY',
    quantity: 10,
    price: 150.0,
    date: '2025-08-01',
  },
  {
    ticker: 'MSFT',
    exchange: 'Fidelity',
    type: 'BUY',
    quantity: 5,
    price: 300.0,
    date: '2025-08-15',
  },
  // Robinhood
  {
    ticker: 'GOOG',
    exchange: 'Robinhood',
    type: 'BUY',
    quantity: 2,
    price: 2800.0,
    date: '2025-09-01',
  },
  {
    ticker: 'TSLA',
    exchange: 'Robinhood',
    type: 'BUY',
    quantity: 3,
    price: 700.0,
    date: '2025-09-05',
  },
  // E-Trade
  {
    ticker: 'AMZN',
    exchange: 'E-Trade',
    type: 'BUY',
    quantity: 1,
    price: 3300.0,
    date: '2025-09-10',
  },
  {
    ticker: 'NVDA',
    exchange: 'E-Trade',
    type: 'BUY',
    quantity: 4,
    price: 200.0,
    date: '2025-09-15',
  },
];

async function setup() {
  console.log(
    'Connecting to the development database to set up conflict test...'
  );
  const db = await setupDatabase();

  // FIX: Use the default "Primary" account holder (ID 1) for all tests.
  const accountHolderId = 1;

  try {
    await db.exec('BEGIN TRANSACTION');

    console.log(
      `Clearing existing transactions for account holder ID: ${accountHolderId}...`
    );
    await db.run(
      'DELETE FROM transactions WHERE account_holder_id = ?',
      accountHolderId
    );

    console.log('Inserting manual transactions for conflict testing...');
    for (const tx of manualTransactions) {
      await db.run(
        'INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          tx.date,
          tx.ticker,
          tx.exchange,
          tx.type,
          tx.quantity,
          tx.price,
          accountHolderId,
          tx.quantity,
          tx.quantity,
          'MANUAL',
          new Date().toISOString(),
        ]
      );
    }

    await db.exec('COMMIT');
    console.log('✅ Database is ready for conflict detection testing.');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Failed to set up conflict test:', error);
  } finally {
    await db.close();
  }
}

setup();
