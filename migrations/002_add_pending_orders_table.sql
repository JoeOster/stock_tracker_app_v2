-- Migration to add the pending_orders table for tracking buy limit orders

CREATE TABLE pending_orders (
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