-- MIGRATION 018: Add JSON 'details' column to advice_sources
-- and add 'journal_entry_id' link to watchlist.
-- This supports dynamic source types and the "Source -> Technique -> Trade Idea" hierarchy.

-- 1. Add 'details' column to advice_sources for JSON data
ALTER TABLE advice_sources
ADD COLUMN details TEXT;

-- 2. Add 'journal_entry_id' to watchlist to link Trade Ideas to Techniques
ALTER TABLE watchlist
ADD COLUMN journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL;

-- 3. (Optional but recommended) Add an index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_watchlist_journal_entry_id
ON watchlist (journal_entry_id);

-- Update user_version
PRAGMA user_version = 18;