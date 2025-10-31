# Database Schema

**Last Updated:** 2025-10-31

This document outlines the final, consolidated schema for the Portfolio Tracker application, based on the initial setup and all applied migrations.

---

## **Primary Tables**

### `transactions`

Stores all buy and sell transaction records. This is the central table for all financial calculations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for each transaction. |
| `ticker` | TEXT | NOT NULL | The stock symbol (e.g., AAPL). |
| `exchange` | TEXT | NOT NULL | The brokerage where the transaction occurred. |
| `transaction_type` | TEXT | NOT NULL | The type of transaction, either 'BUY' or 'SELL'. |
| `quantity` | REAL | NOT NULL | The number of shares in the transaction. |
| `price` | REAL | NOT NULL | The price per share at the time of the transaction. |
| `transaction_date` | TEXT | NOT NULL | The date of the transaction in 'YYYY-MM-DD' format. |
| `original_quantity` | REAL | | For BUYs, this stores the initial quantity purchased. |
| `parent_buy_id` | INTEGER | FOREIGN KEY (transactions.id) | For SELLs, this links to the `id` of the parent BUY lot. |
| `quantity_remaining` | REAL | | For BUYs, tracks how many shares are left after sales. |
| `limit_price_up` | REAL | | The 'take profit' price for a limit order on a BUY lot. |
| `limit_price_down` | REAL | | The 'stop loss' price for a limit order on a BUY lot. |
| `limit_up_expiration` | TEXT | | Expiration date for the 'take profit' limit order. |
| `limit_down_expiration` | TEXT | | Expiration date for the 'stop loss' limit order. |
| `limit_price_up_2` | REAL | | An optional second 'take profit' price. |
| `limit_up_expiration_2`| TEXT | | Expiration date for the second 'take profit' limit. |
| `account_holder_id` | INTEGER | FOREIGN KEY (account_holders.id) | Links to the account holder who owns this transaction. |
| `source` | TEXT | DEFAULT 'MANUAL' | The source of the entry ('MANUAL', 'CSV\_IMPORT', 'JOURNAL\_EXECUTE'). |
| `advice_source_id` | INTEGER | FOREIGN KEY (advice_sources.id) SET NULL | Links to the advice source if generated from a journal entry. |
| `linked_journal_id` | INTEGER | FOREIGN KEY (journal_entries.id) SET NULL | Links a real trade back to the journal entry that inspired it. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | The timestamp when the transaction was created. |

**Indexes:** `idx_transactions_date`, `idx_transactions_account_holder`, `idx_transactions_type`, `idx_transactions_advice_source`, `idx_transactions_linked_journal`

---

### `account_holders`

Stores the different user accounts within the application.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the account holder. |
| `name` | TEXT | NOT NULL UNIQUE | The name of the account holder (e.g., 'Joe', 'IRA'). |

---

### `pending_orders`

Tracks active, user-created buy limit orders that have not yet been filled.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the pending order. |
| `account_holder_id` | INTEGER | NOT NULL, FOREIGN KEY | The account holder who placed the order. |
| `ticker` | TEXT | NOT NULL | The stock symbol for the order. |
| `exchange` | TEXT | NOT NULL | The target brokerage for the order. |
| `order_type` | TEXT | NOT NULL | The type of order (e.g., 'BUY\_LIMIT'). |
| `limit_price` | REAL | NOT NULL | The price at which the buy order should be triggered. |
| `quantity` | REAL | NOT NULL | The number of shares to buy. |
| `created_date` | TEXT | NOT NULL | The date the order was created. |
| `expiration_date` | TEXT | | An optional expiration date for the order. |
| `status` | TEXT | NOT NULL DEFAULT 'ACTIVE' | The current status ('ACTIVE', 'FILLED', 'CANCELLED'). |
| `notes` | TEXT | | User-provided notes for the order. |
| `advice_source_id` | INTEGER | FOREIGN KEY (advice_sources.id) SET NULL | Links to a strategy or advice source. |

---

### `notifications`

Stores system-generated alerts, such as when a price target is met.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the notification. |
| `account_holder_id`| INTEGER| NOT NULL, FOREIGN KEY | The account holder to whom the notification belongs. |
| `pending_order_id`| INTEGER| FOREIGN KEY (pending_orders.id) CASCADE| The pending order that triggered the notification, if applicable. |
| `journal_entry_id`| INTEGER| FOREIGN KEY (journal_entries.id) CASCADE| The journal entry that triggered the notification, if applicable. |
| `message` | TEXT | NOT NULL | The content of the notification message. |
| `status` | TEXT | NOT NULL DEFAULT 'UNREAD' | The status ('UNREAD', 'PENDING', 'DISMISSED'). |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | The timestamp when the notification was created. |

**Indexes:** `idx_notifications_journal_entry`

---

### `advice_sources`

Stores sources of trading advice (people, books, groups, etc.).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the source. |
| `account_holder_id`| INTEGER | NOT NULL, FOREIGN KEY | The account holder who defined this source. |
| `name` | TEXT | NOT NULL | Name of the person, book title, group name, etc. |
| `type` | TEXT | NOT NULL | Type of source (e.g., 'Person', 'Book', 'Website'). |
| `description` | TEXT | | Optional notes about the source. |
| `url` | TEXT | | Website URL, link to group, etc. |
| `contact_person` | TEXT | | Specific contact name if applicable. |
| `contact_email` | TEXT | | |
| `contact_phone` | TEXT | | |
| `contact_app` | TEXT | | **(DEPRECATED)** Old field for contact app. |
| `contact_app_type` | TEXT | | Dropdown value (e.g., 'WhatsApp', 'Signal', 'email'). |
| `contact_app_handle`| TEXT | | Corresponding handle/ID/address. |
| `image_path` | TEXT | | Local path to an avatar/image for the source. |
| `details` | TEXT | | JSON blob for dynamic fields (author, ISBN, etc.). |
| `is_active` | INTEGER | NOT NULL DEFAULT 1 | 1 for active (true), 0 for inactive (false). |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| | | UNIQUE (account_holder_id, name, type) | Combination should be unique per user. |

**Indexes:** `idx_advice_sources_account_holder`, `idx_advice_sources_type`, `idx_advice_sources_is_active`

---

### `journal_entries`

Stores journal entries (paper trades / tracked advice).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the entry. |
| `account_holder_id` | INTEGER | NOT NULL, FOREIGN KEY | |
| `advice_source_id` | INTEGER | FOREIGN KEY (advice_sources.id) SET NULL | Optional link to a defined advice source. |
| `entry_date` | TEXT | NOT NULL | |
| `ticker` | TEXT | NOT NULL | |
| `exchange` | TEXT | NOT NULL | |
| `direction` | TEXT | NOT NULL CHECK(direction IN ('BUY', 'SELL')) | |
| `quantity` | REAL | NOT NULL | |
| `entry_price` | REAL | NOT NULL | |
| `target_price` | REAL | | Optional take profit target. |
| `target_price_2` | REAL | | Optional second take profit target. |
| `stop_loss_price` | REAL | | Optional stop loss target. |
| `status` | TEXT | NOT NULL DEFAULT 'OPEN' | 'OPEN', 'CLOSED', 'EXECUTED', 'CANCELLED'. |
| `advice_source_details`| TEXT | | Quick notes if no formal source linked. |
| `entry_reason` | TEXT | | Justification for the trade idea. |
| `notes` | TEXT | | General notes. |
| `image_path` | TEXT | | Local path to an image for the technique. |
| `exit_date` | TEXT | | Date closed, executed, or cancelled. |
| `exit_price` | REAL | | Price at exit. |
| `exit_reason` | TEXT | | Reason for closing. |
| `pnl` | REAL | | Profit or loss on the trade. |
| `commission_fee` | REAL | DEFAULT 0 | |
| `tags` | TEXT | | Comma-separated tags (future use). |
| `linked_trade_id` | INTEGER | FOREIGN KEY (transactions.id) SET NULL | ID from `transactions` if executed. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_journal_entries_account_holder`, `idx_journal_entries_status`, `idx_journal_entries_ticker`, `idx_journal_entries_advice_source`

---

### `documents`

Stores links to external documents (charts, notes) related to journal entries or advice sources.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `journal_entry_id`| INTEGER| FOREIGN KEY (journal_entries.id) CASCADE| Link to a journal entry (nullable). |
| `advice_source_id`| INTEGER| FOREIGN KEY (advice_sources.id) SET NULL | Link directly to an advice source (nullable). |
| `title` | TEXT | | |
| `document_type` | TEXT | | e.g., 'Chart Image', 'News Link'. |
| `external_link` | TEXT | NOT NULL | Link to the document (e.g., Google Drive). |
| `description` | TEXT | | Optional short description. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_documents_journal_entry`, `idx_documents_advice_source`

---

### `source_notes`

Stores notes specifically related to an advice source, separate from journal entry notes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `advice_source_id` | INTEGER | NOT NULL, FOREIGN KEY (advice_sources.id) CASCADE | Link to the advice source. |
| `note_content` | TEXT | NOT NULL | The text of the note. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Timestamp of creation. |
| `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Timestamp of last update. |

**Indexes:** `idx_source_notes_advice_source`

---

## **Supporting Tables**

### `account_snapshots`

Stores historical total-value snapshots for each brokerage account, used for performance charting.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `exchange` | TEXT | NOT NULL | The name of the brokerage account. |
| `snapshot_date` | TEXT | NOT NULL | The date the snapshot was taken. |
| `value` | REAL | NOT NULL | The total monetary value of the account on that date. |
| `account_holder_id` | INTEGER | FOREIGN KEY (account_holders.id) | Links to the owning account holder. |
| | | UNIQUE (account_holder_id, exchange, snapshot_date) | Prevent duplicate snapshots. |

---

### `exchanges`

A lookup table for brokerage names.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL UNIQUE | The name of the exchange (e.g., 'Fidelity'). |

---

### `historical_prices`

Caches the closing price of a stock on a specific date.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `ticker` | TEXT | NOT NULL | The stock symbol. |
| `date` | TEXT | NOT NULL | The date of the closing price. |
| `close_price`| REAL | NOT NULL | The closing price of the stock on that date. |
| | | UNIQUE (ticker, date) | Prevent duplicate entries per day. |

---

### `watchlist`

Stores tickers the user wants to monitor (now includes guideline fields).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `account_holder_id` | INTEGER | NOT NULL, FOREIGN KEY | |
| `ticker` | TEXT | NOT NULL | |
| `advice_source_id` | INTEGER | FOREIGN KEY (advice_sources.id) SET NULL | Link to source if added via Source tab. |
| `journal_entry_id` | INTEGER | FOREIGN KEY (journal_entries.id) SET NULL | Link to a specific technique/journal entry. |
| `rec_entry_low` | REAL | | Recommended entry price (low end). |
| `rec_entry_high` | REAL | | Recommended entry price (high end). |
| `rec_tp1` | REAL | | Recommended take profit 1. |
| `rec_tp2` | REAL | | Recommended take profit 2. |
| `rec_stop_loss` | REAL | | Recommended stop loss. |
| `status` | TEXT | NOT NULL DEFAULT 'OPEN' | 'OPEN' or 'CLOSED' (archived). |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

**Indexes:** `idx_watchlist_advice_source`, `idx_watchlist_journal_entry_id`, `idx_watchlist_status`

---

### `migrations`

Tracks which schema migrations have been applied.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL UNIQUE | The filename of the migration script. |
| `applied_at`| TEXT | DEFAULT CURRENT_TIMESTAMP | |