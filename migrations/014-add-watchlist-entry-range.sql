-- migrations/014-add-watchlist-entry-range.sql
-- Adds recommended entry range columns to watchlist

ALTER TABLE watchlist ADD COLUMN rec_entry_low REAL;
ALTER TABLE watchlist ADD COLUMN rec_entry_high REAL;