-- migrations/013-add-source-image-path.sql
-- Adds image_path column to advice_sources table

ALTER TABLE advice_sources ADD COLUMN image_path TEXT;