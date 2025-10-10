# Portfolio Tracker V2

A personal, self-hosted web application designed as a broker-agnostic strategy and performance hub for active retail traders. This version includes full multi-account integration, automated trade execution for limit orders, and a robust deployment process.

## Project Overview

The Portfolio Tracker is a personal journal and analytical tool that allows users to track performance, analyze strategy, and evaluate the effectiveness of external trading advice, independent of any specific brokerage. Its core strength lies in detailed lot-based tracking, multi-account management, and a clean, modern user interface. Recent additions have introduced automation to reduce manual data entry and increase proactive monitoring.

## Current State & Key Features

The application is in a stable, feature-rich state with an automated testing suite to protect core functionality.

### Core Features

* **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.
* **Transaction Management:** Full CRUD functionality for all buy and sell transactions, with sales logged against specific buy lots for precise profit/loss calculation.
* **Pending Buy Limit Orders:** A dedicated "Orders" page to create and manage pending buy limit orders that are not yet executed.
* **Automated Order Execution:** A backend "Order Watcher" service runs during market hours, automatically monitoring live prices and converting pending buy limit orders into executed `BUY` transactions when price targets are met.
* **Live Price Updates:** Open positions are updated with current market prices during trading hours, with a configurable auto-refresh scheduler.

### Views & Analytics

* **Daily Reports:** A snapshot of activity for any given day, including daily realized P&L and a summary of open positions.
    * **Advice Popup:** Clicking an open position opens a modal displaying calculated "Take Profit" and "Stop Loss" suggestions based on user settings, compared against any manually set limits.
* **Charts Page:** Historical performance charts and a portfolio overview with weighted average cost basis calculations and "Day's Change" metrics.
* **Ledger Page:** A comprehensive, filterable log of all transactions.
    * **Limit Order Entry:** The "Add Transaction" form now supports entering "Take Profit" and "Stop Loss" limits when logging a new `BUY`, with auto-calculated suggestions.
    * The ledger table now displays any set limit orders for each transaction.
* **Orders Page:** A dedicated UI for creating new pending buy limit orders and viewing/canceling active ones.

### UI/UX & Customization

* **Modern Theming System:** Includes Light (Default), Dark, Sepia, and High Contrast themes, plus font selection.
* **Sticky Table Columns:** Both the first column (e.g., Ticker) and the last "Actions" column are sticky for easier viewing of wide tables.

### Development, Testing, and Deployment

* **Automated Testing:** A comprehensive test suite using Jest for both the backend API and frontend logic, integrated into the deployment process.
* **Environment-Specific Databases:** The project uses separate database files (`development.db`, `production.db`, `test.db`) to ensure safety and data integrity between environments.
* **Automated Deployment Script:** A `deploy.bat` script automates the entire production deployment process on Windows, including running tests, backing up the database, copying files, installing packages, and restarting the server.
* **Development Seeding:** An `npm run seed-dev` command is available to instantly reset the development database with simple, verifiable sample data.

## Technology Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 with a robust migration system
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
* **Charting:** Chart.js
* **Testing:** Jest, Supertest, JSDOM, Babel
* **Deployment:** NSSM (Non-Sucking Service Manager) for Windows Services

## Setup and Installation

### Development Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Create a `.env` file in the project root. Add your Finnhub API key and set the development port:
    ```
    FINNHUB_API_KEY=YOUR_API_KEY_HERE
    PORT=3111
    ```
4.  (Optional) Reset the development database with sample data: `npm run seed-dev`
5.  Start the development server: `npm run dev`

### Production Deployment (Windows)

1.  **One-Time Setup:** Install the application as a Windows Service using `nssm.exe` 
2.  **To Deploy:** Run the automated deployment script from your development folder. Use a switch to set the production port (e.g., 3000):
    ```
    .\deploy.bat --silent
    ```
    The script will handle testing, backup, file deployment, and restarting the service automatically.

## Future Plans & Long-Term Backlog

### Recently Completed

* **Set Default Account Holder:** Added an option in Settings to select a default account holder for the application to load on startup.
* **Synchronize "Add Transaction" Form:** The "Account Holder" dropdown in the "Log a New Transaction" form now reflects the globally selected account holder.

### Backlogged UI/UX Tweaks
* **Account Selector:** Autosize the "Viewing:" dropdown in the header to fit its content.
* **Application Title:** Add a setting for a "Family Name" to dynamically change the title to `<Family Name> Portfolio Manager`.
* **Smarter Market Status:** Enhance the market status indicator to be aware of 24/7 crypto or international exchanges.
* **Delete Button:** Add a "Delete" button to the "Edit Transaction" modal.

### Long-Term Roadmap

* **Core Advisory & Alerting Engine:** Build a dedicated Journal feature to track the performance of advice sources, store PDFs, and set proactive price alerts.
* **Seamless Data Import:** Create a "smart" CSV importer and a tool to parse trade confirmation emails.