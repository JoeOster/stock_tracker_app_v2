-- Add columns for limit order functionality to the transactions table
ALTER TABLE transactions ADD COLUMN limit_price_up REAL;
ALTER TABLE transactions ADD COLUMN limit_price_down REAL;
