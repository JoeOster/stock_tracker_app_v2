-- migrations/021-sync-sources-schema.sql
-- This one file replaces all previous 021/022 attempts.
-- It correctly restructures the database for the many-to-many source linking.
-- NOTE: Removed "IF NOT EXISTS" from ALTER TABLE, as it is not supported by the node-sqlite3 library.

-- 1. Add 'account_holder_id' to 'source_notes'
-- This will fail on dev DB, which is why we must manually update dev DB version.
ALTER TABLE source_notes
ADD COLUMN account_holder_id INTEGER REFERENCES account_holders(id);

CREATE INDEX IF NOT EXISTS idx_source_notes_account_holder
ON source_notes (account_holder_id);

-- 2. Create the new GLOBAL advice_sources table
CREATE TABLE IF NOT EXISTS advice_sources_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    url TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_app TEXT,
    contact_app_type TEXT,
    contact_app_handle TEXT,
    image_path TEXT,
    details TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, type)
);

-- 3. Copy *distinct* sources from the old table into the new one.
INSERT OR IGNORE INTO advice_sources_new (
    name, type, description, url, contact_person, contact_email, contact_phone, 
    contact_app, contact_app_type, contact_app_handle, image_path, details, is_active, created_at
)
SELECT 
    name, 
    type, 
    description, 
    url, 
    contact_person, 
    contact_email, 
    contact_phone, 
    contact_app, 
    contact_app_type, 
    contact_app_handle, 
    image_path, 
    details, 
    1, -- Set all existing to active
    MIN(created_at)
FROM advice_sources
GROUP BY name, type;

-- 4. Create the new junction table (the "checkbox list")
CREATE TABLE IF NOT EXISTS account_source_links (
    account_holder_id INTEGER NOT NULL REFERENCES account_holders(id) ON DELETE CASCADE,
    advice_source_id INTEGER NOT NULL REFERENCES advice_sources_new(id) ON DELETE CASCADE,
    PRIMARY KEY (account_holder_id, advice_source_id)
);

-- 5. Populate the junction table: Link every user to the sources they *used* to own.
INSERT OR IGNORE INTO account_source_links (account_holder_id, advice_source_id)
SELECT 
    old.account_holder_id,
    new.id
FROM advice_sources AS old
JOIN advice_sources_new AS new ON old.name = new.name AND old.type = new.type
WHERE old.account_holder_id IS NOT NULL; -- Make sure not to insert NULL holder IDs

-- 6. Create a temporary mapping of all old IDs to new IDs
CREATE TABLE IF NOT EXISTS temp_source_id_map (
    old_id INTEGER PRIMARY KEY,
    new_id INTEGER
);

INSERT OR IGNORE INTO temp_source_id_map (old_id, new_id)
SELECT 
    old.id,
    new.id
FROM advice_sources AS old
JOIN advice_sources_new AS new ON old.name = new.name AND old.type = new.type;

-- 7. Update all foreign keys in the database
UPDATE transactions SET advice_source_id = (SELECT new_id FROM temp_source_id_map WHERE old_id = transactions.advice_source_id) WHERE advice_source_id IS NOT NULL;
UPDATE journal_entries SET advice_source_id = (SELECT new_id FROM temp_source_id_map WHERE old_id = journal_entries.advice_source_id) WHERE advice_source_id IS NOT NULL;
UPDATE documents SET advice_source_id = (SELECT new_id FROM temp_source_id_map WHERE old_id = documents.advice_source_id) WHERE advice_source_id IS NOT NULL;
UPDATE source_notes SET advice_source_id = (SELECT new_id FROM temp_source_id_map WHERE old_id = source_notes.advice_source_id) WHERE advice_source_id IS NOT NULL;
UPDATE watchlist SET advice_source_id = (SELECT new_id FROM temp_source_id_map WHERE old_id = watchlist.advice_source_id) WHERE advice_source_id IS NOT NULL;
UPDATE pending_orders SET advice_source_id = (SELECT new_id FROM temp_source_id_map WHERE old_id = pending_orders.advice_source_id) WHERE advice_source_id IS NOT NULL;

-- 8. Drop the old table and the temp map
DROP TABLE IF EXISTS advice_sources;
DROP TABLE IF EXISTS temp_source_id_map;

-- 9. Rename the new table to the original name
ALTER TABLE advice_sources_new RENAME TO advice_sources;

-- 10. Recreate remaining indexes
CREATE INDEX IF NOT EXISTS idx_advice_sources_type ON advice_sources (type);
CREATE INDEX IF NOT EXISTS idx_advice_sources_is_active ON advice_sources (is_active);
DROP INDEX IF EXISTS idx_advice_sources_account_holder; -- Drop old, now-useless index

-- 11. Set the version to 21
PRAGMA user_version = 21;

