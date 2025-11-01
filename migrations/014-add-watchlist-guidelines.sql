-- migrations/014-add-watchlist-guidelines.sql
-- Adds all recommended guideline columns to the watchlist table.
-- This file merges the changes from the old 014/015 files and adds the missing entry range.

ALTER TABLE watchlist ADD COLUMN rec_entry_low REAL;
ALTER TABLE watchlist ADD COLUMN rec_entry_high REAL;
ALTER TABLE watchlist ADD COLUMN rec_tp1 REAL;
ALTER TABLE watchlist ADD COLUMN rec_tp2 REAL;
ALTER TABLE watchlist ADD COLUMN rec_stop_loss REAL;