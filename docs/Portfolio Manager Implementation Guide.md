# joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Watchlist/docs/Portfolio Manager Implementation Guide.md

## Portfolio Manager Implementation Guide

A high-level overview of the application's architecture, implementation details, and areas for future improvement.

## Core Concepts

- **Holders & Exchanges**: The app is multi-tenant, supporting different "Account Holders" (e.g., "Fidelity," "E-Trade"). Each holder has "Exchanges" (e.g., "Brokerage," "IRA"). All data is tied to a `holder_id` and `exchange_id`.
- **Transactions (The Ledger)**: The core data model. Everything flows from the `transactions` table.
  - `BUY` transactions are the "source of truth" for cost basis and quantity.
  - `SELL` transactions are linked to `BUY` transactions via the `linked_buy_id` column.
  - `FIFO` (First-In, First-Out) is the default accounting method, handled by `transaction-sell-logic.js`.
- **Journal Entries (Paper Trading)**: The `journal_entries` table is used for paper trades, tracking strategies, and managing "Techniques" from research sources.
- **State Management**: A simple global `state.js` object holds client-side state, such as the `selectedAccountHolderId` and cached data.
- **Event-Driven UI**: The app uses custom events (`journalUpdated`, `dashboardUpdated`) to trigger UI refreshes between different modules.

## Key Modules & Files

### 1. API (`/public/api/`)

- Contains all `fetch` wrappers for communicating with the backend.
- `api-helpers.js`: Provides the core `fetchApi` function, which handles headers, error parsing, and JWT tokens (if they were implemented).

### 2. Event Handlers (`/public/event-handlers/`)

- This is the "controller" layer of the frontend.
- `_init.js`: The main entry point. Sets up all top-level event listeners.
- `_navigation.js`: Handles switching between the main app "views" (Dashboard, Orders, etc.).
- `_dashboard_init.js`: Main loader for the Dashboard, orchestrates all data fetching and rendering.
- `_research_sources_listeners.js`: The "router" for the complex "Source Details" modal, delegating clicks to:
  - `_research_sources_actions_journal.js` (Techniques)
  - `_research_sources_actions_watchlist.js` (Trade Ideas)
  - `_research_sources_actions_realtrades.js` (Linked Real Trades)
  - `_research_sources_actions_notes.js` (Notes)
  - `_research_sources_actions_docs.js` (Documents)

### 3. UI Renderers (`/public/ui/renderers/`)

- This is the "view" layer of the frontend.
- These files are responsible for generating HTML.
- `_dashboard_html.js` / `_dashboard_render.js`: Build the main dashboard tables.
- `_research_sources_modal_html.js`: Builds the complex HTML for the "Source Details" modal.
- `_tabs.js`: Contains the `generateTable` helper, a generic function used to build almost every table in the app.

### 4. Backend Routes (`/routes/`)

- The Node.js/Express API backend.
- `server.js`: The main Express server entry point.
- `transactions.js`: Handles all BUY/SELL/UPDATE/DELETE logic for transactions. This is the most complex route, relying on helper files:
  - `transaction-buy-logic.js`
  - `transaction-sell-logic.js` (handles FIFO)
  - `transaction-update-logic.js`
- `sources.js`: Backs the "Research Sources" module, including the complex data aggregation for the details modal.
- `reporting.js`: Handles complex SQL queries for P/L reporting and the "Ledger" view.

## General To-Do & Bug List

### High Priority

- [ ] **BUG - Sell Modal:** After selling from the "Manage Position" modal, the main dashboard table doesn't refresh automatically. It requires a manual refresh. This is confusing. The `dashboardUpdated` event is not firing or being listened to correctly.
- [ ] **BUG - P/L Calculation:** P/L on closed positions (in "Ledger") seems to sometimes double-count. Need to verify the logic in `routes/reporting.js` (`/calculate-pl`).
- [ ] **BUG - Order Form Reset:** The "Log Executed Trade" form does not properly clear the `data-buy-id` or `data-sell-id` after a successful partial sale, leading to subsequent "Log Sale" clicks failing.

### Medium Priority

- [ ] **Refactor - Settings:** The "Settings" modal (`_settings_modal.js`) is monolithic and handles both Holders and Exchanges. This logic should be split into `_settings_holders.js` and `_settings_exchanges.js` to be cleaner.
- [ ] **Feature - Alerts:** Implement email/SMS alerts using a third-party service when an alert price is hit. This requires a new API endpoint and a job runner.
- [ ] **Refactor - Dashboard P/L:** The dashboard P/L calculation is complex. Consolidate logic into `_dashboard_data.js` and ensure all paths (open, closed, with/without sales) are handled.
- [ ] **Refactor - Watchlist Paper Trades:** The "Paper Trades" sub-tab on the Watchlist page was removed or broken during a refactor. It needs to be properly re-implemented, likely by reusing the components from the old "Journal" page.

### Low Priority / Future Ideas

- [ ] **UI - Themes:** Add more themes (e.g., "High Contrast") to `_themes.css`.
- [ ] **Feature - Dividends:** Add a new transaction type for "Dividend" to be logged in the "Orders" tab. This will require DB schema changes.
- [ ] **Feature - Stock Splits:** Add a "Log Stock Split" feature in the "Manage Position" modal.

### Research Sources Module

- [ ] **Feature - Technique Fields:** Add "Page Number" and "Chapter" fields to the "Technique / Method" creation and edit process. This will involve updating:
  - `_modal_add_technique.html` (add form fields)
  - `_research_sources_actions_journal.js` (update `initializeAddTechniqueModalHandler` and `handleOpenEditTechniqueModal` to save/load the new fields)
  - `_research_sources_modal_html.js` (add "Pg#" and "Ch" columns to the `_renderJournalEntriesTable` function)
  - DB: The `journal_entries` table will likely need new columns (e.g., `page_number`, `chapter_title`). This will require a new migration.
