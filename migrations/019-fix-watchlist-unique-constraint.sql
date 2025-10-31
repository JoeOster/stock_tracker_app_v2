-- MIGRATION 019: Removes the restrictive UNIQUE(account_holder_id, ticker) 
-- constraint from the watchlist table. This allows adding new 'OPEN' trade
-- ideas for a ticker that already has a 'CLOSED' (archived) entry.
-- This version removes BEGIN/COMMIT as the migration runner handles transactions.

-- 1. Rename the existing table
ALTER TABLE watchlist RENAME TO watchlist_old;

-- 2. Create the new watchlist table with the exact same structure,
--    but WITHOUT the UNIQUE(account_holder_id, ticker) constraint.
CREATE TABLE watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id),
    ticker TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Columns from migration 010 & 018
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
    
    -- Columns from migration 014
    rec_entry_low REAL,
    rec_entry_high REAL,
    rec_tp1 REAL,
    rec_tp2 REAL,
    rec_stop_loss REAL,
    
    -- Column from migration 017
    status TEXT NOT NULL DEFAULT 'OPEN'
);

-- 3. Copy all data from the old table to the new table
INSERT INTO watchlist (
    id, account_holder_id, ticker, created_at, 
    advice_source_id, 
    rec_entry_low, rec_entry_high, rec_tp1, rec_tp2, rec_stop_loss, 
    status, 
    journal_entry_id
)
SELECT 
    id, account_holder_id, ticker, created_at, 
    advice_source_id, 
    rec_entry_low, rec_entry_high, rec_tp1, rec_tp2, rec_stop_loss, 
    status, 
    journal_entry_id
FROM watchlist_old;

-- 4. Re-create all existing indexes on the new table
CREATE INDEX IF NOT EXISTS idx_watchlist_advice_source ON watchlist (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_journal_entry_id ON watchlist (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist (status);

-- 5. Drop the old table
DROP TABLE watchlist_old;

-- 6. Update the user_version (Handled by migration runner, but good practice for manual scripts)
-- PRAGMA user_version = 19;
-- The migration runner will insert '019-fix-watchlist-unique-constraint.sql' into the migrations table.