-- migrations/004-create-exchanges-table.sql

-- Use "IF NOT EXISTS" to make this script safe to re-run.
CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Use "INSERT OR IGNORE" to prevent errors if the data already exists.
INSERT OR IGNORE INTO exchanges (name) VALUES ('Fidelity'), ('Robinhood'), ('E-Trade'), ('Other');

