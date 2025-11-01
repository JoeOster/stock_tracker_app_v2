-- migrations/017-add-watchlist-status.sql
-- Adds a status column to the watchlist to allow closing/archiving ideas instead of deleting.

ALTER TABLE watchlist ADD COLUMN status TEXT NOT NULL DEFAULT 'OPEN';

-- Add an index for querying active ideas
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist (status);