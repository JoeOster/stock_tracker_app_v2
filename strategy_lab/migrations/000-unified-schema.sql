-- Unified Schema for Strategy Lab

-- Settings Table: Stores global application settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY NOT NULL,
  family_name TEXT DEFAULT 'My Portfolio',
  take_profit_percent REAL DEFAULT 10.0,
  stop_loss_percent REAL DEFAULT 5.0,
  notification_cooldown INTEGER DEFAULT 5,
  theme TEXT DEFAULT 'dark',
  font TEXT DEFAULT 'Inter',
  user_id INTEGER
);

-- Seed the settings table with a single row for the application
INSERT INTO settings (id) VALUES (1);

-- Accounts Table: Stores user/account holder information
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  user_id INTEGER
);

-- Advice Sources Table: Stores information about sources of trading advice
CREATE TABLE IF NOT EXISTS advice_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    description TEXT,
    image_path TEXT,
    -- Person-specific fields
    contact_email TEXT,
    contact_phone TEXT,
    contact_app_type TEXT,
    contact_app_handle TEXT,
    -- Group-specific fields
    group_primary_contact TEXT,
    group_contact_email TEXT,
    group_contact_phone TEXT,
    group_contact_app_type TEXT,
    group_contact_app_handle TEXT,
    -- Book-specific fields
    book_author TEXT,
    book_isbn TEXT,
    book_websites TEXT, -- Stored as JSON array or newline-separated
    book_pdfs TEXT, -- Stored as JSON array or newline-separated
    -- Website-specific fields
    website_links TEXT, -- Stored as JSON array or newline-separated
    website_pdfs TEXT -- Stored as JSON array or newline-separated
);

-- Exchanges Table: Stores information about exchanges
CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ticker),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE fonts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  font_family TEXT NOT NULL,
  font_size REAL DEFAULT 1.0,
  user_id INTEGER
);

CREATE TABLE themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  data_theme TEXT NOT NULL UNIQUE,
  user_id INTEGER
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

INSERT INTO fonts (name, font_family) VALUES
('Dancing Script', 'Dancing Script');

INSERT INTO fonts (name, font_family) VALUES
('Intel One Mono', 'Intel One Mono');

UPDATE fonts SET font_size = 0.9 WHERE name = 'Dancing Script';
UPDATE fonts SET font_size = 1.05 WHERE name = 'Intel One Mono';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Inter';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Roboto';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Lato';
UPDATE fonts SET font_size = 1.0 WHERE name = 'Open Sans';
UPDATE fonts SET font_size = 1.0 WHERE name = 'System';
