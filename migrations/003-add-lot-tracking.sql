-- Add columns to support specific-lot tracking
ALTER TABLE transactions ADD COLUMN parent_buy_id INTEGER REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN quantity_remaining REAL;

-- For all existing BUY transactions, initialize quantity_remaining to be the same as the original quantity.
-- This makes all existing buys available to be sold from.
UPDATE transactions
SET quantity_remaining = quantity
WHERE transaction_type = 'BUY';
