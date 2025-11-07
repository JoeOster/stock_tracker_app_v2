-- Add user_id to existing tables for multi-tenancy

-- Add user_id to the accounts table
ALTER TABLE accounts ADD COLUMN user_id INTEGER;

-- Add user_id to the settings table
ALTER TABLE settings ADD COLUMN user_id INTEGER;

-- Add user_id to the themes table
ALTER TABLE themes ADD COLUMN user_id INTEGER;

-- Add user_id to the fonts table
ALTER TABLE fonts ADD COLUMN user_id INTEGER;

-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
