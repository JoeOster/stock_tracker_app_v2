-- Initial Schema for Strategy Lab

-- Settings Table: Stores global application settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY NOT NULL,
  family_name TEXT DEFAULT 'My Portfolio',
  take_profit_percent REAL DEFAULT 10.0,
  stop_loss_percent REAL DEFAULT 5.0,
  notification_cooldown INTEGER DEFAULT 5,
  theme TEXT DEFAULT 'dark',
  font TEXT DEFAULT 'Inter'
);

-- Seed the settings table with a single row for the application
INSERT INTO settings (id) VALUES (1);

-- Accounts Table: Stores user/account holder information
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE
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

