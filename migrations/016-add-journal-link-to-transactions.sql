-- migrations/016-add-journal-link-to-transactions.sql
-- Adds a nullable foreign key to the transactions table to link executed trades
-- back to the journal entry that inspired them.

ALTER TABLE transactions
ADD COLUMN linked_journal_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_linked_journal
ON transactions (linked_journal_id);