CREATE TABLE themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  data_theme TEXT NOT NULL UNIQUE
);

CREATE TABLE fonts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  font_family TEXT NOT NULL
);

INSERT INTO themes (name, data_theme) VALUES
('Light', 'light'),
('Dark', 'dark'),
('Sepia', 'sepia'),
('High Contrast (Dark)', 'contrast'),
('High Contrast (Light)', 'high-contrast');

INSERT INTO fonts (name, font_family) VALUES
('Inter', 'Inter'),
('Roboto', 'Roboto'),
('Lato', 'Lato'),
('Open Sans', 'Open Sans'),
('System', 'System');
