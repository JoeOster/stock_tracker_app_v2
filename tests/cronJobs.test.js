const { runOrderWatcher } = require('../services/cronJobs');
const priceService = require('../services/priceService');

// Mock the price service to return a controlled price
jest.mock('../services/priceService', () => ({
  getPrices: jest.fn(),
}));

// Create a mock database object
const mockDb = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
  exec: jest.fn(),
};

describe('Cron Job Logic', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should create a notification when a BUY_LIMIT price target is met', async () => {
    // --- 1. Arrange ---
    const activeBuyOrders = [
      { id: 1, ticker: 'TEST', limit_price: 100, account_holder_id: 1 },
    ];
    mockDb.all.mockResolvedValueOnce(activeBuyOrders); // For fetching pending orders
    mockDb.all.mockResolvedValueOnce([]); // For fetching open positions
    mockDb.get.mockResolvedValue(null); // No existing notification

    // Mock the price service to return a price that meets the target
    priceService.getPrices.mockResolvedValue({ TEST: { price: 95 } });

    // --- 2. Act ---
    await runOrderWatcher(mockDb);

    // --- 3. Assert ---
    // Expect that a notification was inserted into the database
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT INTO notifications (account_holder_id, pending_order_id, message) VALUES (?, ?, ?)',
      [1, 1, 'Price target of $100.00 met for TEST. Current price is $95.00.']
    );
  });
});
