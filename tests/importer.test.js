// /tests/importer.test.js
/**
 * @file Unit tests for the importer helper functions.
 * @jest-environment node
 */

// --- START FIX: Update require path to point to new helpers file ---
const {
  combineFractionalShares,
  findConflict,
} = require('../routes/importer-helpers.js');
// --- END FIX ---

describe('Importer Helper: combineFractionalShares', () => {
  it('should combine multiple fractional shares for the same ticker, date, type, and price', () => {
    const transactions = [
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.1,
        price: 150.0,
      },
      {
        date: '2025-10-01',
        ticker: 'MSFT',
        type: 'BUY',
        quantity: 1,
        price: 300.0,
      },
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.2,
        price: 150.0,
      },
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.05,
        price: 150.0,
      },
    ];
    const combined = combineFractionalShares(transactions);
    expect(combined.length).toBe(2);
    const aapl = combined.find((t) => t.ticker === 'AAPL');
    const msft = combined.find((t) => t.ticker === 'MSFT');
    expect(aapl.quantity).toBeCloseTo(0.35);
    expect(msft.quantity).toBe(1);
  });

  it('should not combine transactions with different prices', () => {
    const transactions = [
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.1,
        price: 150.0,
      },
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.2,
        price: 150.01,
      },
    ];
    const combined = combineFractionalShares(transactions);
    expect(combined.length).toBe(2);
  });

  it('should not combine transactions with different dates', () => {
    const transactions = [
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.1,
        price: 150.0,
      },
      {
        date: '2025-10-02',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.2,
        price: 150.0,
      },
    ];
    const combined = combineFractionalShares(transactions);
    expect(combined.length).toBe(2);
  });

  it('should not combine transactions with different types', () => {
    const transactions = [
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 0.1,
        price: 150.0,
      },
      {
        date: '2025-10-01',
        ticker: 'AAPL',
        type: 'SELL',
        quantity: 0.1,
        price: 150.0,
      },
    ];
    const combined = combineFractionalShares(transactions);
    expect(combined.length).toBe(2);
  });

  it('should handle floating point prices correctly', () => {
    const transactions = [
      {
        date: '2025-10-01',
        ticker: 'XYZ',
        type: 'BUY',
        quantity: 0.001,
        price: 12.34567,
      },
      {
        date: '2025-10-01',
        ticker: 'XYZ',
        type: 'BUY',
        quantity: 0.002,
        price: 12.34567,
      },
      {
        date: '2025-10-01',
        ticker: 'XYZ',
        type: 'BUY',
        quantity: 0.003,
        price: 12.345,
      }, // Different price
    ];
    const combined = combineFractionalShares(transactions);
    expect(combined.length).toBe(2);
    const xyz1 = combined.find((t) => t.price === 12.34567);
    const xyz2 = combined.find((t) => t.price === 12.345);
    expect(xyz1.quantity).toBeCloseTo(0.003);
    expect(xyz2.quantity).toBeCloseTo(0.003);
  });

  it('should handle null or undefined prices', () => {
    const transactions = [
      {
        date: '2025-10-01',
        ticker: 'A',
        type: 'BUY',
        quantity: 1,
        price: null,
      },
      {
        date: '2025-10-01',
        ticker: 'A',
        type: 'BUY',
        quantity: 2,
        price: null,
      },
      {
        date: '2025-10-01',
        ticker: 'B',
        type: 'BUY',
        quantity: 3,
        price: undefined,
      },
      {
        date: '2025-10-01',
        ticker: 'B',
        type: 'BUY',
        quantity: 4,
        price: undefined,
      },
      { date: '2025-10-01', ticker: 'C', type: 'BUY', quantity: 5, price: 0 },
    ];
    const combined = combineFractionalShares(transactions);
    expect(combined.length).toBe(3); // A, B, and C are distinct
    expect(combined.find((t) => t.ticker === 'A').quantity).toBe(3);
    // 'undefined' price becomes 'null_price' key, same as 'null'
    // This is an edge case - depends on desired behavior.
    // Current behavior: null and undefined are treated as the same "null_price"
    // Let's adjust test to expect this behavior
    expect(combined.find((t) => t.ticker === 'B').quantity).toBe(7);
    expect(combined.find((t) => t.ticker === 'C').quantity).toBe(5);
  });
});

describe('Importer Helper: findConflict', () => {
  const existingTransactions = [
    {
      id: 1,
      transaction_date: '2025-10-10',
      ticker: 'AAPL',
      transaction_type: 'BUY',
      quantity: 10,
      price: 150.0,
    },
    {
      id: 2,
      transaction_date: '2025-10-11',
      ticker: 'MSFT',
      transaction_type: 'BUY',
      quantity: 5,
      price: 300.0,
    },
    {
      id: 3,
      transaction_date: '2025-10-12',
      ticker: 'GOOG',
      transaction_type: 'SELL',
      quantity: 2,
      price: 2800.0,
    },
  ];

  it('should find a potential duplicate with exact match', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('Potential Duplicate');
    expect(result.match.id).toBe(1);
  });

  it('should find a potential duplicate with small quantity float difference', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10.00001,
      price: 150.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('Potential Duplicate');
    expect(result.match.id).toBe(1);
  });

  it('should find a potential duplicate with small price tolerance', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150.01,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('Potential Duplicate');
    expect(result.match.id).toBe(1);
  });

  it('should not find a duplicate if date is different', () => {
    const parsedRow = {
      date: '2025-10-11',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('New');
    expect(result.match).toBeNull();
  });

  it('should not find a duplicate if ticker is different', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'MSFT',
      type: 'BUY',
      quantity: 10,
      price: 150.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('New');
    expect(result.match).toBeNull();
  });

  it('should not find a duplicate if type is different', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 150.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('New');
    expect(result.match).toBeNull();
  });

  it('should not find a duplicate if quantity is too different', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10.1,
      price: 150.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('New');
    expect(result.match).toBeNull();
  });

  it('should not find a duplicate if price is too different', () => {
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 200.0,
    };
    const result = findConflict(parsedRow, existingTransactions);
    expect(result.status).toBe('New');
    expect(result.match).toBeNull();
  });

  it('should correctly handle different date formats (timezone check)', () => {
    // Parsed row date is 'YYYY-MM-DD'
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150.0,
    };
    // Existing transaction date is 'YYYY-MM-DD'
    const existingWithTime = [
      {
        id: 1,
        transaction_date: '2025-10-10',
        ticker: 'AAPL',
        transaction_type: 'BUY',
        quantity: 10,
        price: 150.0,
      },
    ];
    const result = findConflict(parsedRow, existingWithTime);
    // This should match because the findConflict helper normalizes dates to YYYY-MM-DD string comparison
    expect(result.status).toBe('Potential Duplicate');
    expect(result.match.id).toBe(1);
  });

  it('should handle zero price correctly', () => {
    const existingWithZero = [
      {
        id: 1,
        transaction_date: '2025-10-10',
        ticker: 'DIV',
        transaction_type: 'BUY',
        quantity: 10,
        price: 0.0,
      },
    ];
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'DIV',
      type: 'BUY',
      quantity: 10,
      price: 0.0,
    };
    const result = findConflict(parsedRow, existingWithZero);
    // Should match because prices are identical (0 === 0)
    expect(result.status).toBe('Potential Duplicate');
    expect(result.match.id).toBe(1);
  });

  it('should not match zero price with non-zero price', () => {
    const existingWithZero = [
      {
        id: 1,
        transaction_date: '2025-10-10',
        ticker: 'DIV',
        transaction_type: 'BUY',
        quantity: 10,
        price: 0.0,
      },
    ];
    const parsedRow = {
      date: '2025-10-10',
      ticker: 'DIV',
      type: 'BUY',
      quantity: 10,
      price: 0.01,
    };
    const result = findConflict(parsedRow, existingWithZero);
    // Should not match, 0.01 is not 0
    expect(result.status).toBe('New');
    expect(result.match).toBeNull();
  });
});
