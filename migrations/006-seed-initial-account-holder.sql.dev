-- migrations/006-seed-initial-account-holder.sql

-- 1. Add "Joe" as an account holder. We'll give him a specific ID (2)
--    so we can reliably reference him. "INSERT OR IGNORE" prevents errors.
INSERT OR IGNORE INTO account_holders (id, name) VALUES (2, 'Joe');

-- 2. Update all existing transactions to belong to "Joe" (ID 2).
--    This assumes they currently belong to the old "Primary" default (ID 1).
UPDATE transactions SET account_holder_id = 2 WHERE account_holder_id = 1;

-- 3. Update all existing snapshots to belong to "Joe" (ID 2).
UPDATE account_snapshots SET account_holder_id = 2 WHERE account_holder_id = 1;

-- 4. (Optional but recommended) Delete the old default "Primary" account holder,
--    as it's no longer needed.
DELETE FROM account_holders WHERE id = 1;