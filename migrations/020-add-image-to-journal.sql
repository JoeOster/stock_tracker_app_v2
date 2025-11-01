-- migrations/020-add-image-to-journal.sql
-- Adds an optional image path to journal entries for chart/book references

ALTER TABLE journal_entries
ADD COLUMN image_path TEXT;

PRAGMA user_version = 20;