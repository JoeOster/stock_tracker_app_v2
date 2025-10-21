# joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/docs/database_schema.md

## Database Schema

**Last Updated:** 2025-10-20

This document outlines the final, consolidated schema for the Portfolio Tracker application database, based on the initial setup and all applied migrations.

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
| `quantity_remaining`| REAL | | For BUYs, tracks how many shares are left after sales. |
| `limit_price_up` | REAL | | The 'take profit' price for a limit order on a BUY lot. |
| `limit_price_down` | REAL | | The 'stop loss' price for a limit order on a BUY lot. |
| `limit_up_expiration`| TEXT | | Expiration date for the 'take profit' limit order. |
| `limit_down_expiration`| TEXT | | Expiration date for the 'stop loss' limit order. |
| `account_holder_id`| INTEGER | FOREIGN KEY (account_holders.id) | Links to the account holder who owns this transaction. |
| `source` | TEXT | DEFAULT 'MANUAL' | The source of the entry ('MANUAL', 'CSV_IMPORT', 'JOURNAL_EXECUTE'). |
| `advice_source_id`| INTEGER | FOREIGN KEY (advice_sources.id) | Links to the advice source if generated from a journal entry. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | The timestamp when the transaction was created. |

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
| `account_holder_id`| INTEGER | NOT NULL, FOREIGN KEY | The account holder who placed the order. |
| `ticker` | TEXT | NOT NULL | The stock symbol for the order. |
| `exchange` | TEXT | NOT NULL | The target brokerage for the order. |
| `order_type` | TEXT | NOT NULL | The type of order (e.g., 'BUY_LIMIT'). |
| `limit_price` | REAL | NOT NULL | The price at which the buy order should be triggered. |
| `quantity` | REAL | NOT NULL | The number of shares to buy. |
| `created_date` | TEXT | NOT NULL | The date the order was created. |
| `expiration_date` | TEXT | | An optional expiration date for the order. |
| `status` | TEXT | NOT NULL DEFAULT 'ACTIVE' | The current status ('ACTIVE', 'FILLED', 'CANCELLED'). |
| `notes` | TEXT | | User-provided notes for the order. |
| `advice_source_id`| INTEGER | FOREIGN KEY (advice_sources.id) | Links to a strategy or advice source. |

---

### `notifications`

Stores system-generated alerts, such as when a price target is met.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the notification. |
| `account_holder_id`| INTEGER | NOT NULL, FOREIGN KEY | The account holder to whom the notification belongs. |
| `pending_order_id`| INTEGER | FOREIGN KEY (pending_orders.id) | The pending order that triggered the notification, if applicable. |
| `journal_entry_id` | INTEGER | FOREIGN KEY (journal_entries.id) | **(NEW)** The journal entry that triggered the notification, if applicable. |
| `message` | TEXT | NOT NULL | The content of the notification message. |
| `status` | TEXT | NOT NULL DEFAULT 'UNREAD' | The status ('UNREAD', 'PENDING', 'DISMISSED'). |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | The timestamp when the notification was created. |

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
| `contact_app` | TEXT | | e.g., Discord handle, Slack ID. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

---

### `journal_entries`

Stores journal entries (paper trades / tracked advice).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the entry. |
| `account_holder_id`| INTEGER | NOT NULL, FOREIGN KEY | |
| `advice_source_id`| INTEGER | FOREIGN KEY (advice_sources.id) | Optional link to a defined advice source. |
| `entry_date` | TEXT | NOT NULL | |
| `ticker` | TEXT | NOT NULL | |
| `exchange` | TEXT | NOT NULL | |
| `direction` | TEXT | NOT NULL CHECK(direction IN ('BUY', 'SELL')) | |
| `quantity` | REAL | NOT NULL | |
| `entry_price` | REAL | NOT NULL | |
| `target_price` | REAL | | Optional take profit target. |
| `stop_loss_price` | REAL | | Optional stop loss target. |
| `status` | TEXT | NOT NULL DEFAULT 'OPEN' | 'OPEN', 'CLOSED', 'EXECUTED', 'CANCELLED'. |
| `advice_source_details`| TEXT | | Quick notes if no formal source linked. |
| `entry_reason` | TEXT | | Justification for the trade idea. |
| `notes` | TEXT | | General notes. |
| `exit_date` | TEXT | | Date closed, executed, or cancelled. |
| `exit_price` | REAL | | Price at exit. |
| `exit_reason` | TEXT | | Reason for closing. |
| `pnl` | REAL | | Profit or loss on the trade. |
| `commission_fee` | REAL | DEFAULT 0 | |
| `tags` | TEXT | | Comma-separated tags (future use). |
| `linked_trade_id`| INTEGER | FOREIGN KEY (transactions.id) | ID from `transactions` if executed. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

---

### `documents`

Stores links to external documents (charts, notes) related to journal entries.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `journal_entry_id` | INTEGER | NOT NULL, FOREIGN KEY (journal_entries.id) | |
| `title` | TEXT | | |
| `document_type` | TEXT | | e.g., 'Chart Image', 'News Link'. |
| `external_link` | TEXT | NOT NULL | Link to the document (e.g., Google Drive). |
| `description` | TEXT | | Optional short description. |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

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
| `account_holder_id`| INTEGER | FOREIGN KEY (account_holders.id) | Links to the owning account holder. |

### `exchanges`

A lookup table for brokerage names.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL UNIQUE | The name of the exchange (e.g., 'Fidelity'). |

### `historical_prices`

Caches the closing price of a stock on a specific date.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `ticker` | TEXT | NOT NULL | The stock symbol. |
| `date` | TEXT | NOT NULL | The date of the closing price. |
| `close_price` | REAL | NOT NULL | The closing price of the stock on that date. |

### `watchlist`

Stores tickers the user wants to monitor.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `account_holder_id`| INTEGER | NOT NULL, FOREIGN KEY | |
| `ticker` | TEXT | NOT NULL | |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| | | UNIQUE (account_holder_id, ticker) | |

### `migrations`

Tracks which schema migrations have been applied.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL UNIQUE | The filename of the migration script. |
| `applied_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | |
