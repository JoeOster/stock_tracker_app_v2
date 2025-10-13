-- Add indexes to improve the performance of reporting queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_holder ON transactions (account_holder_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (transaction_type);