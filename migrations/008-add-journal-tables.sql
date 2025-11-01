-- Migration file: 008-add-journal-tables.sql
-- Adds tables for the Strategy & Advice Journal feature, focusing on tracking advice sources
-- and linking executed trades back to sources.

-- Table to store sources of trading advice (people, books, groups, etc.)
CREATE TABLE IF NOT EXISTS advice_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    name TEXT NOT NULL,                -- Name of the person, book title, group name, etc.
    type TEXT NOT NULL,                -- Type of source (e.g., 'Person', 'Book', 'Website', 'Group', 'Service', 'Class')
    description TEXT,                  -- Optional notes about the source
    url TEXT,                          -- Website URL, link to group, etc.
    contact_person TEXT,               -- Specific contact name if applicable
    contact_email TEXT,
    contact_phone TEXT,
    contact_app TEXT,                  -- e.g., Discord handle, Slack ID
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id),
    UNIQUE (account_holder_id, name, type) -- Combination should be unique per user
);

-- Table to store journal entries (paper trades / tracked advice)
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    advice_source_id INTEGER,         -- Optional link to a defined advice source
    entry_date TEXT NOT NULL,
    ticker TEXT NOT NULL,
    exchange TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('BUY', 'SELL')),
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    target_price REAL,
    stop_loss_price REAL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED', 'EXECUTED', 'CANCELLED')),
    advice_source_details TEXT,
    entry_reason TEXT,
    notes TEXT,
    exit_date TEXT,
    exit_price REAL,
    exit_reason TEXT,
    pnl REAL,
    commission_fee REAL DEFAULT 0,
    tags TEXT,
    linked_trade_id INTEGER,          -- Store ID from 'transactions' if executed
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id),
    FOREIGN KEY (advice_source_id) REFERENCES advice_sources (id) ON DELETE SET NULL
);

-- Table for associated documents (links to external storage like Google Drive)
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL,
    title TEXT,
    document_type TEXT,               -- e.g., 'Chart Image', 'News Link', 'Analysis Note', 'Class Notes'
    external_link TEXT NOT NULL,      -- Link to the document (e.g., Google Drive URL)
    description TEXT,                 -- Optional short description
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE CASCADE
);

-- Add advice_source_id to the main transactions table to link executed trades
-- This column will ONLY be populated for BUY transactions created via the "Execute Buy"
-- feature from a journal entry that had an advice_source_id.
ALTER TABLE transactions ADD COLUMN advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_holder ON journal_entries (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries (status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ticker ON journal_entries (ticker);
CREATE INDEX IF NOT EXISTS idx_journal_entries_advice_source ON journal_entries (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_documents_journal_entry ON documents (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_advice_sources_account_holder ON advice_sources (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_advice_sources_type ON advice_sources (type);
-- Add index to the new column in transactions
CREATE INDEX IF NOT EXISTS idx_transactions_advice_source ON transactions (advice_source_id);