-- Migration to add the notifications table for the alerting system
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_holder_id INTEGER NOT NULL,
    pending_order_id INTEGER,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_holder_id) REFERENCES account_holders (id),
    FOREIGN KEY (pending_order_id) REFERENCES pending_orders (id)
);