-- joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/migrations/009-add-timestamp-to-transactions.sql
-- Add a timestamp to record when a transaction was entered into the system.
ALTER TABLE transactions
ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;