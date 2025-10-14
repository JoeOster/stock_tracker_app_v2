# **Gemini Context File for Portfolio Tracker V3**

**Last Updated:** 2025-10-14

This document provides a comprehensive summary of the "Portfolio Tracker V3" project and its strategic roadmap to assist AI prompts.

## **1\. Project Summary**

Portfolio Tracker V3 is a self-hosted web application for active retail traders to track investment performance and strategy across multiple brokerage accounts. It is built with a Node.js/Express backend, a vanilla JavaScript frontend, and uses SQLite for data storage. The project has a modular architecture and a comprehensive automated testing and deployment process.

**GitHub Repository:** <https://github.com/JoeOster/stock_tracker_app_v2>

## **2\. Core Architecture**

* **Backend (/routes, /services, server.js):** An Express.js server handles API requests. The logic is split into route files and services (e.g., cronJobs.js for scheduled tasks).
* **Database (database.js, /migrations):** Uses SQLite3 with a built-in migration system that automatically applies .sql files on startup.
* **Frontend (/public):**
  * **app-main.js**: The main script managing state, loading templates, and initializing modules.
  * **/templates**: Contains HTML partials for each page view.
  * **/ui/renderers**: Modules responsible for rendering data into the DOM.
  * **/event-handlers**: Modules for handling user interactions.
* **Testing (/tests):** Uses Jest with separate configurations for API (`jest.config.api.js`) and UI (`jest.config.ui.js`) tests. The framework includes code coverage reporting and runs automatically as part of the deployment script.

## **3\. Strategic Roadmap**

### **Completed: Intelligent CSV Importer**

A sophisticated, multi-step reconciliation workflow that treats the brokerage CSV as the definitive source of truth.

* **Brokerage Templates:** The importer uses presets for major brokerages (Fidelity, E-Trade, Robinhood) with robust filtering logic to handle real-world data, including extraneous header/footer rows and non-transactional activities.
* **Conflict Resolution:** The backend API detects and flags conflicts between CSV data and existing manual entries, which are then presented to the user for resolution (Keep or Replace).
* **Automated Testing:** The entire importer workflow is validated by an automated API test suite using sanitized, real-world CSV files.

### **Next Phase: Strategy & Advice Journal**

This feature will allow users to log, track, and analyze trading ideas from various sources.

* **Database Schema:** New tables for `strategies`, `journal_entries`, `strategy_documents`, and `journal_entry_prices`.
* **Direct Trade Linking:** The `transactions` table will be modified to allow a trade to be linked to a `journal_entry_id`.
* **Intraday Price Tracking:** The cron job will be enhanced to fetch and store prices for open journal entries.
* **Automated Alerts:** The system will create a notification when a paper trade's profit or stop-loss target is met.
* **Journal Dashboard UI:** A new "Journal" page will feature performance analysis dashboards and charts.

### **Future Enhancements & Ancillary Features**

* **Test Results Tracking:** A system to automatically capture the output of `npm test` and store it in the database to visualize the project's code health over time.
* **Notification Center/Event Log:** Add a sub-tab to the "Alerts" page to provide a persistent history of all toast messages and system notifications.
* **Import Reminder System:** A client-side, exchange-specific reminder system to notify the user if they haven't imported a file for a specific exchange recently.
* **Technical Improvements:**
  * The `deploy.bat` script will be updated to back up the new `uploads/` directory.
  * A database index will be added to the `journal_entry_prices` table for performance.
