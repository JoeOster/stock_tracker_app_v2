-- migrations/007-add-strategies-table.sql

-- 1. Create the strategies table for the Strategy & Advice Journal feature.
--    Use "IF NOT EXISTS" for safety on re-runs.
CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- Name of the strategy or advice source
    type TEXT,                 -- e.g., 'Group Discussion', 'Newsletter', 'Personal Research'
    contact_person TEXT,       -- Primary contact or author
    platform TEXT              -- Communication platform or source type (e.g., 'Signal', 'Whatsapp', 'Website')
);

-- 2. Seed initial advice sources provided by the user.
--    Use "INSERT OR IGNORE" to prevent duplicate entries if the script is run again.

INSERT OR IGNORE INTO strategies (name, type, contact_person, platform)
VALUES ('Superiorstar Prosperity GroupW30', 'Group Discussion', 'Elana Marlowe', 'Signal');

INSERT OR IGNORE INTO strategies (name, type, contact_person, platform)
VALUES ('Robinhood Friends Club 63', 'Group Discussion', 'Anabella & Quinlan', 'Whatsapp');

INSERT OR IGNORE INTO strategies (name, type, contact_person, platform)
VALUES ('North Rock Investors Club309', 'Group Discussion', 'Kelly Perkins', 'Whatsapp');