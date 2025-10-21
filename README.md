# Live Stock Tracker (Portfolio Manager V3)

A full-stack web application built with Node.js, Express, and SQLite for tracking stock portfolio performance, managing transactions, and journaling investment strategies.

## Current State & Key Features

The application is in active development, focusing on the new Dashboard and hardening.

* **New "Dashboard" View:** The primary interface for viewing and managing current open positions. Features include:
  * **Card View:** A responsive grid of cards for each position, showing exchange logo, ticker, stats, and live P/L.
  * **Table View:** A dense table view of the same data, including reconciliation checkboxes.
  * **Sorting & Filtering:** Sort positions by ticker, exchange, P/L, or limit proximity.
* **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.
* **Intelligent CSV Importer:** Sophisticated multi-step reconciliation workflow with templates for Fidelity, E-Trade, and Robinhood.
* **Transaction Management:** Full CRUD functionality for buy/sell transactions, logged against specific buy lots.
* **Pending Order Management & Alerts:** Backend service watches price targets for pending BUY limit orders and generates alerts.
* **Strategy & Advice Journal:**
  * Define and manage **Advice Sources** (people, books, services) in Settings.
  * Log paper trades (**Journal Entries**) with entry/target/stop prices, linked to sources.
  * **Execute** journal ideas into actual tracked BUY transactions.
  * Automated backend price tracking and alerts for journal entry targets.
* **Live Price Updates:** Open positions (Dashboard) and journal entries are updated with current market prices via an auto-refresh scheduler.
* **Automated Testing Suite:** Integrated testing framework using Jest for backend API and frontend UI tests.
* **Modern Theming System:** Light, Dark, Sepia, High Contrast themes, plus font selection.
* **Environment-Specific Databases & Deployment:** Separate databases for development, testing, production. Automated deployment scripts for Windows and Raspberry Pi.
