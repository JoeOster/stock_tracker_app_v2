CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT
);

INSERT INTO settings (key, value) VALUES
('theme', 'light'),
('font', 'Inter');
