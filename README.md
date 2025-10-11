# Portfolio Tracker V2

A personal, self-hosted web application designed as a broker-agnostic strategy and performance hub for active retail traders. This version includes full multi-account integration, automated trade execution for limit orders, a robust deployment process, and a modular, maintainable codebase.

## Project Overview

The Portfolio Tracker is a personal journal and analytical tool that allows users to track performance, analyze strategy, and evaluate the effectiveness of external trading advice, independent of any specific brokerage. Its core strength lies in detailed lot-based tracking, multi-account management, and a clean, modern user interface. Recent additions have introduced automation to reduce manual data entry and increase proactive monitoring.

## Current State & Key Features

The application is in a stable, feature-rich state with an automated testing suite to protect core functionality.

### Core Features

* **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.
* **Transaction Management:** Full CRUD functionality for all buy and sell transactions, with sales logged against specific buy lots for precise profit/loss calculation.
* **Pending Buy Limit Orders:** A dedicated "Orders" page to create and manage pending buy limit orders that are not yet executed.
* **Automated Order Execution & Alerts:** A backend "Order Watcher" service runs during market hours. It automatically:
  * Creates alerts in the "Alerts" tab when a pending buy limit order's price target is met.
  * Executes `SELL` transactions when a "Take Profit" or "Stop Loss" limit on an open position is triggered and creates a corresponding alert.
* **Live Price Updates:** Open positions are updated with current market prices via an auto-refresh scheduler.

### Views & Analytics

* **Daily Reports:** A snapshot of activity for any given day, including daily realized P&L (both dollar amount and percentage) in a summary panel and the main header.
  * **Advice Popup:** Clicking an open position opens a modal displaying calculated "Take Profit" and "Stop Loss" suggestions based on user settings.
* **Charts Page:** Historical performance charts and a portfolio overview with weighted average cost basis calculations.
* **Ledger Page:** A comprehensive, filterable log of all historical transactions.
* **New Orders Page:** The central hub for all data entry, containing separate tools for logging executed `BUY`/`SELL` transactions and for placing new pending `BUY` limit orders.
* **Alerts Page:** A dedicated UI for viewing and managing system-generated alerts, such as when price targets are met. The tab displays a warning icon when new alerts are present.

### UI/UX & Code Quality

* **Refactored Codebase:** Both the backend (`server.js`) and the frontend (`index.html`, `event-listeners.js`) have been refactored into smaller, modular files for improved organization and maintainability.
* **Modern Theming System:** Includes Light (Default), Dark, Sepia, and High Contrast themes, plus font selection.
* **Improved Table UI:**
  * The "Open Lots" table now features a combined column for Unrealized P/L, displaying both the dollar amount and percentage in a single, space-saving field.
  * All tables now have sticky headers and sticky columns (left and right) for easier viewing of wide or long data sets.
* **Quality of Life Improvements (v2.20):**
  * The "Viewing:" account selector in the header now autosizes to fit the content.
  * A "Family Name" can be set in the settings to customize the main application title.
  * A "Delete" button has been added directly to the "Edit Transaction" modal for a more intuitive workflow.
  * Confirmation checkboxes have been added to the "Daily Transaction Log" for manual review.
* **Click-and-Drag Scrolling:** Tables with horizontal overflow can be scrolled by clicking and dragging anywhere on the table.

### Development, Testing, and Deployment

* **Automated Testing:** A comprehensive test suite using Jest for both the backend API and the modular frontend UI logic, integrated into the deployment process.
* **Environment-Specific Databases:** The project uses separate database files (`production.db`, `development.db`, `test.db`) to ensure data safety.
* **Automated Deployment Script:** A `deploy.bat` script automates the entire production deployment process on Windows. It requires Administrator privileges and handles stopping the service, running tests, backing up the database, copying files, installing packages, and restarting the server.
* **Development Seeding:** An `npm run seed-dev` command is available to instantly reset the development database with simple, verifiable sample data.

## Technology Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 with a migration system
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
* **Deployment:** NSSM for Windows Services

## Setup and Installation

### Development Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a `.env` file in the project root. Add your Finnhub API key and set the development port:

    ```json

    FINNHUB_API_KEY=YOUR_API_KEY_HERE
    PORT=3111
    ```

4. (Optional) Reset the development database with sample data: `npm run seed-dev`
5. Start the development server: `npm run dev`

### Production Deployment (Windows)

1. **One-Time Setup:** Install the application as a Windows Service using `nssm.exe`.
2. **To Deploy:** Run the automated deployment script from your development folder **as an Administrator**. Use a switch to set the production port (e.g., 3000):

   ```jason
    .\deploy.bat --silent
    ```

## Future Plans & Long-Term Backlog

### Backlogged UI/UX Tweaks

* Enhance the market status indicator to be aware of 24/7 or international exchanges.

### Long-Term Roadmap

* **Intelligent CSV Importer:** Build an advanced, interactive tool to handle CSV imports with conflict detection and resolution.
* **Advice Journal:** Build a dedicated Journal feature to track the performance of advice sources, store PDFs, and set proactive price alerts.
