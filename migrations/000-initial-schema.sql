-- migrations/000-initial-schema.sql
-- This single file creates the complete, consolidated schema for the application.

-- Create the central transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    exchange TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    transaction_date TEXT NOT NULL,
    original_quantity REAL,
    parent_buy_id INTEGER REFERENCES transactions(id),
    quantity_remaining REAL,
    limit_price_up REAL,
    limit_price_down REAL,
    limit_up_expiration TEXT,
    limit_down_expiration TEXT,
    account_holder_id INTEGER REFERENCES account_holders(id),
    source TEXT DEFAULT 'MANUAL',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create the account_holders table
CREATE TABLE IF NOT EXISTS account_holders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Create the pending_orders table
CREATE TABLE IF NOT EXISTS pending_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    exchange TEXT NOT NULL,
    order_type TEXT NOT NULL,
    limit_price REAL NOT NULL,
    quantity REAL NOT NULL,
    created_date TEXT NOT NULL,
    expiration_date TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    advice_source_id INTEGER,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id)
);

-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    pending_order_id INTEGER,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id),
    FOREIGN KEY (pending_order_id) REFERENCES pending_orders (id)
);

-- Create supporting tables
CREATE TABLE IF NOT EXISTS account_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    value REAL NOT NULL,
    account_holder_id INTEGER REFERENCES account_holders(id)
);

CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS historical_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    date TEXT NOT NULL,
    close_price REAL NOT NULL
);

-- Create the watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id),
    UNIQUE (account_holder_id, ticker)
);

-- Seed initial data that should always exist
INSERT OR IGNORE INTO account_holders (id, name) VALUES (1, 'Primary');
INSERT OR IGNORE INTO exchanges (name) VALUES ('Fidelity'), ('Robinhood'), ('E-Trade'), ('Other');