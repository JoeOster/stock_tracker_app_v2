-- joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/migrations/009-add-timestamp-to-transactions.sql
-- Add a timestamp column to the transactions table
ALTER TABLE transactions
ADD COLUMN created_at TEXT;

-- Backfill existing records with their transaction date as a sensible default
UPDATE transactions
SET created_at = transaction_date;