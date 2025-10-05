-- Create a table to store the last known price and update time for each ticker
CREATE TABLE IF NOT EXISTS stock_prices (
    ticker TEXT PRIMARY KEY,
    last_price REAL,
    last_updated TEXT
);

-- Create a table to store a daily snapshot of open positions
-- This simplifies fetching and avoids recalculating from all transactions every time
CREATE TABLE IF NOT EXISTS positions (
    ticker TEXT NOT NULL,
    exchange TEXT NOT NULL,
    quantity REAL NOT NULL,
    cost_basis REAL NOT NULL,
    PRIMARY KEY (ticker, exchange)
);