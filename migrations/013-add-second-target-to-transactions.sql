-- Migration file: 013-add-second-target-to-transactions.sql
-- Adds an optional second take profit limit to the transactions table.

ALTER TABLE transactions ADD COLUMN limit_price_up_2 REAL;
ALTER TABLE transactions ADD COLUMN limit_up_expiration_2 TEXT;