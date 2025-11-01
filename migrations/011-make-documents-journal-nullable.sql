-- Migration file: 011-make-documents-journal-nullable.sql
-- Modifies the documents table to make journal_entry_id nullable,
-- allowing documents to be linked directly to advice_sources without requiring a journal entry.
-- This version removes explicit BEGIN/COMMIT as the migration runner handles transactions.

-- Step 1: Create a new temporary table with the desired structure
CREATE TABLE documents_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE, -- Kept CASCADE for journal link deletion
    advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL, -- Use SET NULL for source link
    title TEXT,
    document_type TEXT,
    external_link TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from the old table to the new table
INSERT INTO documents_temp (id, journal_entry_id, advice_source_id, title, document_type, external_link, description, created_at)
SELECT id, journal_entry_id, advice_source_id, title, document_type, external_link, description, created_at
FROM documents;

-- Step 3: Drop the old table
DROP TABLE documents;

-- Step 4: Rename the temporary table to the original name
ALTER TABLE documents_temp RENAME TO documents;

-- Step 5: Recreate indexes (if any existed on the original table beyond foreign keys)
-- Recreate the indexes added in migration 008 and 010
CREATE INDEX IF NOT EXISTS idx_documents_journal_entry ON documents (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_documents_advice_source ON documents (advice_source_id);

-- Step 6: Inform SQLite that the schema has changed (optional but good practice)
PRAGMA writable_schema = 1;
DELETE FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'sqlite_autoindex_documents_%';
PRAGMA writable_schema = 0;
PRAGMA integrity_check;

