-- tools/seed_test_data.sql
-- Injects sample data with HISTORICAL dates for 5 test account holders.
-- Assumes 'today' for calculation purposes is 2025-10-17.
-- UPDATED to be a complete seed for all features.

-- Clear existing test data (keeping Primary holder ID 1 and default exchanges)
DELETE FROM transactions WHERE account_holder_id > 1;
DELETE FROM pending_orders WHERE account_holder_id > 1;
DELETE FROM account_snapshots WHERE account_holder_id > 1;
DELETE FROM notifications WHERE account_holder_id > 1;
DELETE FROM watchlist WHERE account_holder_id > 1;
DELETE FROM journal_entries WHERE account_holder_id > 1;
DELETE FROM source_notes WHERE account_holder_id > 1;

-- MODIFIED: Updated DELETE logic for new schema
DELETE FROM documents WHERE advice_source_id IN (
    SELECT advice_source_id FROM account_source_links WHERE account_holder_id > 1
);
DELETE FROM advice_sources WHERE id IN (
    SELECT advice_source_id FROM account_source_links WHERE account_holder_id > 1
);
DELETE FROM account_source_links WHERE account_holder_id > 1;
-- END MODIFICATION

DELETE FROM account_holders WHERE id > 1;

-- Ensure test account holders exist (Use IDs 2-6)
INSERT OR IGNORE INTO account_holders (id, name) VALUES (2, 'Test 1');
INSERT OR IGNORE INTO account_holders (id, name) VALUES (3, 'Test 2 (Emily)');
INSERT OR IGNORE INTO account_holders (id, name) VALUES (4, 'Test 3 (A.Z Penn)');
INSERT OR IGNORE INTO account_holders (id, name) VALUES (5, 'Test 4');
INSERT OR IGNORE INTO account_holders (id, name) VALUES (6, 'Test 5 (Anabella)');

-- === Advice Sources (MODIFIED: Removed account_holder_id) ===
INSERT INTO advice_sources (name, type, description, is_active, image_path, details) VALUES
('Source A', 'Website', 'Financial News Site', 1, NULL, NULL),
('Source B (Emily)', 'Person', 'Investment Advisor', 1, '/images/contacts/Emily.png', '{"contact_app_type": "Signal", "contact_app_handle": "+1234567890"}'),
('Source C (A.Z Penn)', 'Book', 'Classic Investing Book', 1, '/images/contacts/A_Z_Penn_Swing Trading.jpg', '{"author": "A.Z Penn", "isbn": "978-1234567890"}'),
('Source E (Anabella)', 'Group', 'Local Investment Club', 1, '/images/contacts/anabella.png', '{"contact_person": "Anabella", "contact_app_type": "WhatsApp"}');

-- === ADDED: Link Sources to Test Users ===
INSERT OR IGNORE INTO account_source_links (account_holder_id, advice_source_id) VALUES
(2, (SELECT id FROM advice_sources WHERE name = 'Source A')),
(3, (SELECT id FROM advice_sources WHERE name = 'Source B (Emily)')),
(4, (SELECT id FROM advice_sources WHERE name = 'Source C (A.Z Penn)')),
(5, (SELECT id FROM advice_sources WHERE name = 'Source D')),
(6, (SELECT id FROM advice_sources WHERE name = 'Source E (Anabella)'));


-- === Transactions (Unchanged) ===
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('AAPL', 'Fidelity', 'BUY', 10, 170.50, '2025-10-10', 10, 10, 2);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('MSFT', 'Fidelity', 'BUY', 5, 300.20, '2025-10-13', 5, 5, 2);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('GOOG', 'Fidelity', 'BUY', 1, 2750.00, '2025-10-14', 1, 1, 2);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('AMZN', 'Fidelity', 'BUY', 2, 3280.75, '2025-10-15', 2, 2, 2);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('TSLA', 'Fidelity', 'BUY', 3, 705.00, '2025-10-16', 3, 3, 2);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('NVDA', 'Fidelity', 'BUY', 4, 208.80, '2025-10-17', 4, 4, 2);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('MSFT', 'Robinhood', 'BUY', 8, 301.00, '2025-10-10', 8, 8, 3);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('GOOG', 'Robinhood', 'BUY', 2, 2755.50, '2025-10-13', 2, 2, 3);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('AMZN', 'Robinhood', 'BUY', 1, 3275.00, '2025-10-14', 1, 1, 3);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('TSLA', 'Robinhood', 'BUY', 2, 708.25, '2025-10-15', 2, 2, 3);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('NVDA', 'Robinhood', 'BUY', 5, 209.50, '2025-10-16', 5, 5, 3);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('META', 'Robinhood', 'BUY', 6, 335.00, '2025-10-17', 6, 6, 3);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('GOOG', 'E-Trade', 'BUY', 1, 2749.00, '2025-10-10', 1, 1, 4);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('AMZN', 'E-Trade', 'BUY', 1, 3285.25, '2025-10-13', 1, 1, 4);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('TSLA', 'E-Trade', 'BUY', 4, 702.50, '2025-10-14', 4, 4, 4);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('NVDA', 'E-Trade', 'BUY', 3, 210.00, '2025-10-15', 3, 3, 4);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('META', 'E-Trade', 'BUY', 7, 336.50, '2025-10-16', 7, 7, 4);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('JNJ', 'E-Trade', 'BUY', 10, 160.00, '2025-10-17', 10, 10, 4);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('AMZN', 'Other', 'BUY', 1, 3278.00, '2025-10-10', 1, 1, 5);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('TSLA', 'Other', 'BUY', 2, 706.75, '2025-10-13', 2, 2, 5);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('NVDA', 'Other', 'BUY', 6, 207.50, '2025-10-14', 6, 6, 5);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('META', 'Other', 'BUY', 5, 334.00, '2025-10-15', 5, 5, 5);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('JNJ', 'Other', 'BUY', 15, 159.50, '2025-10-16', 15, 15, 5);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('V', 'Other', 'BUY', 8, 222.00, '2025-10-17', 8, 8, 5);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('TSLA', 'Fidelity', 'BUY', 1, 704.00, '2025-10-10', 1, 1, 6);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('NVDA', 'Fidelity', 'BUY', 2, 209.00, '2025-10-13', 2, 2, 6);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('META', 'Fidelity', 'BUY', 4, 337.25, '2025-10-14', 4, 4, 6);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('JNJ', 'Fidelity', 'BUY', 10, 158.75, '2025-10-15', 10, 10, 6);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('V', 'Fidelity', 'BUY', 7, 223.50, '2025-10-16', 7, 7, 6);
INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, original_quantity, quantity_remaining, account_holder_id) VALUES ('JPM', 'Fidelity', 'BUY', 10, 156.00, '2025-10-17', 10, 10, 6);

-- === Account Snapshots (Unchanged) ===
INSERT INTO account_snapshots (exchange, snapshot_date, value, account_holder_id) VALUES
('Fidelity', '2025-09-19', 1850.00, 2),
('Robinhood', '2025-09-26', 2100.00, 3),
('E-Trade', '2025-10-03', 1950.00, 4),
('Other', '2025-10-10', 2300.00, 5),
('Fidelity', '2025-10-17', 2050.00, 6),
('Robinhood', '2025-10-24', 2400.00, 2),
('E-Trade', '2025-10-31', 1700.00, 3),
('Other', '2025-11-07', 2150.00, 4),
('Fidelity', '2025-11-14', 2250.00, 5);


-- === Journal Entries (Unchanged) ===
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, target_price, stop_loss_price, status, advice_source_id, entry_reason) VALUES 
(2, '2025-10-13', 'JPM', 'Fidelity', 'BUY', 10, 155.00, 165.00, 150.00, 'OPEN', (SELECT id FROM advice_sources WHERE name='Source A' LIMIT 1), 'News catalyst');
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, target_price, stop_loss_price, status, entry_reason) VALUES 
(3, '2025-10-14', 'META', 'Robinhood', 'BUY', 5, 338.00, 355.00, 330.00, 'OPEN', 'From Emily, looks bullish');
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, target_price, target_price_2, stop_loss_price, status, advice_source_id, image_path, entry_reason, notes) VALUES 
(4, '2025-10-15', 'N/A', 'Paper', 'BUY', 0, 0, 235.00, 250.00, 220.00, 'OPEN', (SELECT id FROM advice_sources WHERE name='Source C (A.Z Penn)' LIMIT 1), '/images/book/AZPenn_BollingerBand.png', 'Bollinger Band Squeeze (Ch. 4)', 'Chart Type: 1D Candle\n\nWait for bands to squeeze tight, then buy on breakout above upper band.');
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, target_price, stop_loss_price, status, entry_reason) VALUES 
(5, '2025-10-16', 'JNJ', 'Other', 'BUY', 20, 160.00, 170.00, 157.00, 'OPEN', 'Newsletter recommendation');
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, target_price, stop_loss_price, status, advice_source_id, entry_reason) VALUES 
(6, '2025-10-17', 'AAPL', 'Fidelity', 'BUY', 5, 176.00, 185.00, 172.00, 'OPEN', (SELECT id FROM advice_sources WHERE name='Source E (Anabella)' LIMIT 1), 'Anabella''s group pick');
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, status, exit_date, exit_price, pnl, advice_source_id) VALUES 
(2, '2025-09-01', 'TSLA', 'Fidelity', 'BUY', 2, 680.00, 'CLOSED', '2025-09-15', 720.00, 80.00, (SELECT id FROM advice_sources WHERE name='Source A' LIMIT 1));
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, status, exit_date, exit_price, pnl) VALUES 
(4, '2025-09-05', 'AMZN', 'E-Trade', 'BUY', 1, 3250.00, 'CLOSED', '2025-09-20', 3150.00, -100.00);
INSERT INTO journal_entries (account_holder_id, entry_date, ticker, exchange, direction, quantity, entry_price, status, exit_date, exit_price, pnl) VALUES 
(6, '2025-09-10', 'NVDA', 'Robinhood', 'BUY', 5, 200.00, 'CLOSED', '2025-09-25', 215.00, 75.00);

-- === Pending Orders (Unchanged) ===
INSERT INTO pending_orders (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date) VALUES (2, 'AMZN', 'Fidelity', 'BUY_LIMIT', 3250.00, 1, '2025-10-10');
INSERT INTO pending_orders (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date) VALUES (3, 'TSLA', 'Robinhood', 'BUY_LIMIT', 700.00, 2, '2025-10-11');
INSERT INTO pending_orders (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date) VALUES (4, 'MSFT', 'E-Trade', 'BUY_LIMIT', 300.00, 10, '2025-10-13');
INSERT INTO pending_orders (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date) VALUES (5, 'AAPL', 'Other', 'BUY_LIMIT', 170.00, 15, '2025-10-14');
INSERT INTO pending_orders (account_holder_id, ticker, exchange, order_type, limit_price, quantity, created_date) VALUES (6, 'GOOG', 'Fidelity', 'BUY_LIMIT', 2750.00, 1, '2025-10-15');

-- === Watchlist (Unchanged) ===
INSERT INTO watchlist (account_holder_id, ticker, type, status) VALUES (2, 'CRM', 'WATCH', 'OPEN');
INSERT INTO watchlist (account_holder_id, ticker, type, status) VALUES (3, 'DIS', 'WATCH', 'OPEN');
INSERT INTO watchlist (account_holder_id, ticker, type, status) VALUES (4, 'PYPL', 'WATCH', 'OPEN');
INSERT INTO watchlist (account_holder_id, ticker, type, status) VALUES (5, 'SQ', 'WATCH', 'OPEN');
INSERT INTO watchlist (account_holder_id, ticker, type, status) VALUES (6, 'UBER', 'WATCH', 'OPEN');
INSERT INTO watchlist (account_holder_id, ticker, type, status, advice_source_id, rec_entry_low, rec_entry_high, rec_tp1, rec_stop_loss) 
VALUES (3, 'PYPL', 'IDEA', 'OPEN', (SELECT id FROM advice_sources WHERE name='Source B (Emily)' LIMIT 1), 55.00, 58.00, 65.00, 52.00);
INSERT INTO watchlist (account_holder_id, ticker, type, status, advice_source_id, journal_entry_id, rec_entry_low, rec_tp1, rec_stop_loss) 
VALUES (4, 'V', 'IDEA', 'OPEN', (SELECT id FROM advice_sources WHERE name='Source C (A.Z Penn)' LIMIT 1), (SELECT id FROM journal_entries WHERE account_holder_id=4 AND ticker='N/A' LIMIT 1), 225.00, 235.00, 220.00);


-- === Notifications (Unchanged) ===
INSERT INTO notifications (account_holder_id, message, status, pending_order_id, created_at) VALUES (2, 'Price target met for AMZN', 'UNREAD', (SELECT id FROM pending_orders WHERE account_holder_id=2 LIMIT 1), '2025-10-16 10:00:00');
INSERT INTO notifications (account_holder_id, message, status, created_at) VALUES (3, 'System update scheduled.', 'UNREAD', '2025-10-15 09:00:00');
INSERT INTO notifications (account_holder_id, message, status, pending_order_id, created_at) VALUES (4, 'Price target met for MSFT', 'PENDING', (SELECT id FROM pending_orders WHERE account_holder_id=4 LIMIT 1), '2025-10-17 11:30:00');
INSERT INTO notifications (account_holder_id, message, status, created_at) VALUES (5, 'CSV Import completed with warnings.', 'UNREAD', '2025-10-10 14:00:00');
INSERT INTO notifications (account_holder_id, message, status, created_at) VALUES (6, 'New feature: Journaling added!', 'DISMISSED', '2025-10-01 08:00:00');

-- === Source Notes (Unchanged) ===
INSERT INTO source_notes (advice_source_id, account_holder_id, note_content, created_at) VALUES
((SELECT id FROM advice_sources WHERE name='Source B (Emily)' LIMIT 1), 3, 'Emily mentioned PYPL as a buy-on-dip opportunity. Watch for 55-58 entry.', '2025-10-16 09:00:00'),
((SELECT id FROM advice_sources WHERE name='Source B (Emily)' LIMIT 1), 3, 'Second note, just for testing.', '2025-10-17 10:00:00'),
((SELECT id FROM advice_sources WHERE name='Source C (A.Z Penn)' LIMIT 1), 4, 'Chapter 4 on Bollinger Bands is the most useful.', '2025-10-15 11:00:00'),
((SELECT id FROM advice_sources WHERE name='Source E (Anabella)' LIMIT 1), 6, 'Group is also looking at UBER next.', '2025-10-17 14:00:00');

-- === Documents (FIXED) ===
-- REMOVED account_holder_id from the INSERT statement
INSERT INTO documents (advice_source_id, journal_entry_id, title, document_type, external_link, description) VALUES
(NULL, (SELECT id FROM journal_entries WHERE account_holder_id=4 AND ticker='N/A' LIMIT 1), 'Bollinger Band PDF Guide', 'PDF', 'http://example.com/bb_guide.pdf', 'External guide for Ch. 4 technique'),
((SELECT id FROM advice_sources WHERE name='Source B (Emily)' LIMIT 1), NULL, 'Emily''s 2025 Watchlist', 'Google Sheet', 'http://example.com/emily_watchlist', 'List of all her picks for the year.');