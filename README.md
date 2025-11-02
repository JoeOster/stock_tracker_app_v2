# Live Stock Tracker (Portfolio Manager V3)

A full-stack web application built with Node.js, Express, and SQLite for tracking stock portfolio performance, managing transactions, and journaling investment strategies.

## Current State & Key Features

The application is in active development, focusing on UI refinements and planning for future features.

- **Dashboard View:** The primary interface for viewing and managing current open positions. Features include:
  - **Card View:** A responsive grid of cards for each position lot, showing exchange logo, ticker, stats, and live P/L.
  - **Table View:** A dense table view of the same data, including reconciliation checkboxes.
  - **Sorting & Filtering:** Sort positions by ticker, exchange, P/L, or limit proximity.
- **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.
- **Intelligent CSV Importer:** Sophisticated multi-step reconciliation workflow with templates for Fidelity, E-Trade, and Robinhood.
- **Transaction Management:** Full CRUD functionality for buy/sell transactions, logged against specific buy lots.
- **Pending Order Management & Alerts:** Backend service watches price targets for pending BUY limit orders and generates alerts.
- **Strategy & Advice Journal (Paper Trading):**
  - Define and manage **Advice Sources** (people, books, services) in Settings.
  - Log paper trades (**Journal Entries**) with entry/target/stop prices, linked to sources.
  - **Execute** journal ideas into actual tracked BUY transactions.
  - Automated backend price tracking and alerts for journal entry targets/stops.
- **Live Price Updates:** Open positions (Dashboard), journal entries, and watchlist are updated with current market prices via an auto-refresh scheduler (when the respective tab is active).
- **Automated Testing Suite:** Integrated testing framework using Jest for backend API and frontend UI tests.
- **Modern Theming System:** Light, Dark, Sepia, High Contrast themes, plus font selection.
- **Environment-Specific Databases & Deployment:** Separate databases for development, testing, production. Automated deployment scripts for Windows and Raspberry Pi.

## Future Plans (High Level)

- **Source-Centric Management:** Introduce a new "Sources" tab to manage and view information aggregated by advice source, including notes, linked documents, and source-specific watchlists.
- **Authentication:** Secure the application with user logins.
- **Enhanced Reporting:** More detailed performance analysis and charting options.
- **UI/UX Refinements:** Ongoing improvements based on user feedback.
