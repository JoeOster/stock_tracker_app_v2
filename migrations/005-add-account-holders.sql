-- migrations/005-add-account-holders.sql

-- 1. Create the new table to store account holders
CREATE TABLE IF NOT EXISTS account_holders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 2. Add a default account holder. "INSERT OR IGNORE" prevents errors on re-runs.
INSERT OR IGNORE INTO account_holders (id, name) VALUES (1, 'Primary');

-- 3. Add the foreign key column to the transactions table, defaulting to 1 for existing rows
ALTER TABLE transactions ADD COLUMN account_holder_id INTEGER REFERENCES account_holders(id) DEFAULT 1;

-- 4. Add the foreign key column to the account_snapshots table, defaulting to 1 for existing rows
ALTER TABLE account_snapshots ADD COLUMN account_holder_id INTEGER REFERENCES account_holders(id) DEFAULT 1;
