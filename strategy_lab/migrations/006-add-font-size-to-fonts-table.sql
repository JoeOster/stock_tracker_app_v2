ALTER TABLE fonts ADD COLUMN font_size REAL DEFAULT 1.0;

UPDATE fonts SET font_size = 0.9 WHERE name = 'Dancing Script';
UPDATE fonts SET font_size = 1.05 WHERE name = 'Intel One Mono';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Inter';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Roboto';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Lato';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Open Sans';
UPDATE fonts SET font_size = 1.0 WHERE name = 'System';
