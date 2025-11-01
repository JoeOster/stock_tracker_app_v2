-- This is the consolidated "squashed" schema for the entire application,
-- built by combining all migration files and fixing the missing 'type' column.

-- 1. Main Tables
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
    limit_price_up_2 REAL,
    limit_up_expiration_2 TEXT,
    account_holder_id INTEGER REFERENCES account_holders(id),
    source TEXT DEFAULT 'MANUAL',
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL,
    linked_journal_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_holders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pending_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id),
    ticker TEXT NOT NULL,
    exchange TEXT NOT NULL,
    order_type TEXT NOT NULL,
    limit_price REAL NOT NULL,
    quantity REAL NOT NULL,
    created_date TEXT NOT NULL,
    expiration_date TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id),
    pending_order_id INTEGER REFERENCES pending_orders(id) ON DELETE CASCADE,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advice_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    url TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_app TEXT,
    contact_app_type TEXT,
    contact_app_handle TEXT,
    image_path TEXT,
    details TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_holder_id, name, type)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id),
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL,
    entry_date TEXT NOT NULL,
    ticker TEXT NOT NULL,
    exchange TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('BUY', 'SELL')),
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    target_price REAL,
    target_price_2 REAL,
    stop_loss_price REAL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED', 'EXECUTED', 'CANCELLED')),
    advice_source_details TEXT,
    entry_reason TEXT,
    notes TEXT,
    image_path TEXT,
    exit_date TEXT,
    exit_price REAL,
    exit_reason TEXT,
    pnl REAL,
    commission_fee REAL DEFAULT 0,
    tags TEXT,
    linked_trade_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL,
    title TEXT,
    document_type TEXT,
    external_link TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advice_source_id INTEGER NOT NULL REFERENCES advice_sources(id) ON DELETE CASCADE,
    account_holder_id INTEGER REFERENCES account_holders(id),
    note_content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Supporting Tables
CREATE TABLE IF NOT EXISTS account_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exchange TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    value REAL NOT NULL,
    account_holder_id INTEGER REFERENCES account_holders(id),
    UNIQUE (account_holder_id, exchange, snapshot_date)
);

CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS historical_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    date TEXT NOT NULL,
    close_price REAL NOT NULL,
    UNIQUE (ticker, date)
);

CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id),
    ticker TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
    rec_entry_low REAL,
    rec_entry_high REAL,
    rec_tp1 REAL,
    rec_tp2 REAL,
    rec_stop_loss REAL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    type TEXT NOT NULL DEFAULT 'WATCH' -- <<< THIS COLUMN WAS MISSING
);

-- 3. Migrations Table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_holder ON transactions (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_advice_source ON transactions (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_linked_journal ON transactions (linked_journal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_journal_entry ON notifications (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_advice_sources_account_holder ON advice_sources (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_advice_sources_type ON advice_sources (type);
CREATE INDEX IF NOT EXISTS idx_advice_sources_is_active ON advice_sources (is_active);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_holder ON journal_entries (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries (status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ticker ON journal_entries (ticker);
CREATE INDEX IF NOT EXISTS idx_journal_entries_advice_source ON journal_entries (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_documents_journal_entry ON documents (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_documents_advice_source ON documents (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_source_notes_advice_source ON source_notes (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_source_notes_account_holder ON source_notes (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_advice_source ON watchlist (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_journal_entry_id ON watchlist (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist (status);
CREATE INDEX IF NOT EXISTS idx_watchlist_type ON watchlist (type); -- <<< ADDED INDEX FOR NEW COLUMN

-- 5. Seed Initial Data
INSERT OR IGNORE INTO account_holders (id, name) VALUES (1, 'Primary');
INSERT OR IGNORE INTO exchanges (name) VALUES ('Fidelity'), ('Robinhood'), ('E-Trade'), ('Other');