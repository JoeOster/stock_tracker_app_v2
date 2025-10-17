-- joeoster/stock_tracker_app_v2/stock_tracker_app_v2-PortfolioManagerTake3/migrations/010-create-watchlist-table.sql

-- Create the table to store watchlist items
CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id),
    UNIQUE (account_holder_id, ticker)
);