-- migrations/021-add-holder-id-to-notes.sql
-- Adds the missing account_holder_id to the source_notes table
-- This fixes a 500 error in the /api/sources/:id/details route

ALTER TABLE source_notes
ADD COLUMN account_holder_id INTEGER REFERENCES account_holders(id);

-- Add an index for querying
CREATE INDEX IF NOT EXISTS idx_source_notes_account_holder
ON source_notes (account_holder_id);

PRAGMA user_version = 21;