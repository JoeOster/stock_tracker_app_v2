-- Migration file: 009-add-journal-id-to-notifications.sql
-- Adds a column to link notifications (like price target alerts) directly to journal entries.

-- Add the new column, allowing NULL values initially
ALTER TABLE notifications ADD COLUMN journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE;

-- Add an index for faster lookups based on journal_entry_id
CREATE INDEX IF NOT EXISTS idx_notifications_journal_entry ON notifications (journal_entry_id);

-- Note: Existing notifications (e.g., for pending orders) will have NULL in this new column.
-- The cron job logic will populate this column for new journal-related notifications.