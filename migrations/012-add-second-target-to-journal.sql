-- Migration file: 012-add-second-target-to-journal.sql
-- Adds an optional second target price to the journal_entries table.

ALTER TABLE journal_entries ADD COLUMN target_price_2 REAL;

-- Optional: Add an index if you anticipate querying based on this second target often,
-- though it might be less common than the primary target or stop loss.
-- CREATE INDEX IF NOT EXISTS idx_journal_entries_target_price_2 ON journal_entries (target_price_2);