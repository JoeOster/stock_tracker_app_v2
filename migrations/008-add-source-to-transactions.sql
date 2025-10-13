-- migrations/008-add-source-to-transactions.sql

ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'MANUAL';

CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions (source);