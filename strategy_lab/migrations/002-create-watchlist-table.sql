-- Migration: 002-create-watchlist-table.sql

CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ticker),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
