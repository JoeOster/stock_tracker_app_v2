-- Migration file: 010-source-centric-schema.sql
-- Adds columns and tables to better support source-centric management features.

-- 1. Add new contact fields to advice_sources
ALTER TABLE advice_sources ADD COLUMN contact_app_type TEXT; -- e.g., 'WhatsApp', 'Signal', 'Email', 'Discord'
ALTER TABLE advice_sources ADD COLUMN contact_app_handle TEXT; -- e.g., '+1234567890', 'username#1234', 'email@example.com'

-- Note: The old 'contact_app' column is intentionally kept for now to avoid data loss during transition.
-- It can be dropped in a later migration after data is potentially migrated to the new fields or deemed unnecessary.

-- 2. Add advice_source_id foreign key to watchlist
ALTER TABLE watchlist ADD COLUMN advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL;

-- 3. Add advice_source_id foreign key to documents
-- Note: Making journal_entry_id nullable requires recreating the table, which will be done in migration 011.
ALTER TABLE documents ADD COLUMN advice_source_id INTEGER REFERENCES advice_sources(id) ON DELETE SET NULL; -- Changed from CASCADE to SET NULL for safety

-- 4. Create source_notes table (Optional, but included as planned)
CREATE TABLE IF NOT EXISTS source_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advice_source_id INTEGER NOT NULL,
    note_content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Consider adding triggers to auto-update this
    FOREIGN KEY (advice_source_id) REFERENCES advice_sources (id) ON DELETE CASCADE -- Delete notes if source is deleted
);

-- 5. Add indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_watchlist_advice_source ON watchlist (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_documents_advice_source ON documents (advice_source_id);
CREATE INDEX IF NOT EXISTS idx_source_notes_advice_source ON source_notes (advice_source_id);

