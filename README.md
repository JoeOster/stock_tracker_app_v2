# **Portfolio Tracker V2**

A personal, self-hosted web application designed as a broker-agnostic strategy and performance hub for active retail traders. This version includes full multi-account integration, automated trade execution for limit orders, a robust deployment process, and a modular, maintainable codebase.

**GitHub Repository:** <https://github.com/JoeOster/stock_tracker_app_v2>

## **Project Overview**

The Portfolio Tracker is a personal journal and analytical tool that allows users to track performance, analyze strategy, and evaluate the effectiveness of external trading advice, independent of any specific brokerage. Its core strength lies in detailed lot-based tracking, multi-account management, and a clean, modern user interface.

## **Current State & Key Features**

The application is in a stable, feature-rich state with an automated testing suite to protect core functionality.

* **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.
* **Transaction Management:** Full CRUD functionality for all buy and sell transactions, with sales logged against specific buy lots for precise profit/loss calculation.
* **Automated Order Execution & Alerts:** A backend "Order Watcher" service runs during market hours, creating alerts for price targets and automatically executing limit orders on open positions.
* **Live Price Updates:** Open positions are updated with current market prices via an auto-refresh scheduler.
* **Modern Theming System:** Includes Light (Default), Dark, Sepia, and High Contrast themes, plus font selection.
* **Refactored & Documented Codebase:** Both backend and frontend have been refactored into smaller, modular files for improved organization. Major modules now include JSDoc comments for enhanced maintainability.
* **Environment-Specific Databases & Deployment:** The project uses separate databases for development, testing, and production, with separate Jest configurations for UI and API tests.

## **Development Roadmap: Upcoming Features**

The next phase of development is focused on transforming the application into a powerful analytical and data management platform. The following major features are planned:

### **1\. Intelligent CSV Importer**

This feature will replace the basic import function with a sophisticated, multi-step reconciliation workflow, treating the brokerage CSV as the definitive source of truth.

* **Brokerage Templates:** The importer will use presets for major brokerages (Fidelity, E-Trade, etc.) to automatically configure parsing and column mapping. It will also allow users to save new templates for unrecognized formats.
* **Unified Reconciliation UI:** A single, powerful review screen will guide the user through the import process, handling:
  * **Filtering:** Automatically identifying and ignoring non-trade activities (e.g., deposits, dividends).
  * **Conflict Resolution:** Detecting and flagging conflicts between CSV data and existing manual entries, allowing the user to Replace, Keep, or Move & Replace records.
  * **SELL Lot Assignment:** Requiring the user to manually assign all imported SELL transactions to specific BUY lots, with a FIFO (First-In, First-Out) suggestion as a default.

### **2\. Strategy & Advice Journal**

This feature allows users to log, "paper trade," and analyze trading ideas from various sources to get a true ROI on their methods.

* **Strategy Management:** Users can define and manage their strategies/sources, storing metadata like contact info, communication platforms, and associated research documents (PDFs, Markdown).
* **Paper Trading:** Users can log specific trade ideas ("journal entries") with entry prices, profit targets, and stop losses.
* **Intraday Price Tracking:** A 5-minute cron job will fetch and store the price history for all open journal entries, enabling detailed performance analysis.
* **Automated Alerts:** The system will create a notification in the "Alerts" tab when a paper trade's profit or stop-loss target is met, allowing the user to decide when to manually "close" the trade.
* **Performance Dashboard:** A new "Journal" page will feature a dashboard to compare the theoretical performance of the advice against the user's actual, personal ROI on trades executed from that strategy.
* **Direct Trade Linking:** Users will be able to link an actual transaction directly to the journal entry that inspired it, enabling precise execution analysis.

## **Technology Stack**

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 with a migration system
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
* **Deployment:** NSSM for Windows Services

## **Setup and Installation**

### **Development Setup**

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a `.env` file in the project root with your Finnhub API key and a development port.
4. (Optional) Reset the development database: `npm run seed-dev`
5. Start the development server: `npm run dev`

### **Production Deployment (Windows)**

Run the automated `deploy.bat` script as an Administrator. The script handles stopping the service, running tests, backing up the database and uploaded documents, copying files, and restarting the service.

**Note on Production Environment:** The `deploy.bat` script does **not** copy your local `.env` file. It automatically configures the Windows service to use the correct production settings (e.g., `NODE_ENV=production`). The Finnhub API key must be set manually on the service if it is not already configured.
