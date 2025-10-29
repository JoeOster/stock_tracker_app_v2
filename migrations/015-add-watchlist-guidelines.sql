-- migrations/015-add-watchlist-guidelines.sql
-- Adds recommended target and stop-loss guideline columns to watchlist

ALTER TABLE watchlist ADD COLUMN rec_tp1 REAL;
ALTER TABLE watchlist ADD COLUMN rec_tp2 REAL;
ALTER TABLE watchlist ADD COLUMN rec_stop_loss REAL;