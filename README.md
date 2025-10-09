# **Live Stock Tracker V2**

A personal, self-hosted web application designed as a broker-agnostic strategy and performance hub for active retail traders. This version includes a full multi-account integration, allowing for the tracking of portfolios for multiple individuals under a single interface.

## **Project Overview**

The Live Stock Tracker is a personal journal and analytical tool that allows users to track performance, analyze strategy, and evaluate the effectiveness of external trading advice, independent of any specific brokerage. Its core strength lies in detailed lot-based tracking, multi-account management, and a clean, modern user interface with multiple themes.

## **Current State & Key Features**

The application is in a stable, feature-rich state with an automated testing suite to protect core functionality.

### **Core Features**

* **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.  
* **Global Account Filter:** A master dropdown in the header allows for filtering the entire application's data for a specific account holder or viewing an aggregated "All Accounts" summary.  
* **Transaction Management:** Full CRUD (Create, Read, Update, Delete) functionality for all buy and sell transactions, correctly linked to account holders.  
* **Lot-Based Tracking:** Sells are logged against specific buy lots, enabling precise profit/loss calculation and accurate tracking of remaining shares.  
* **Live Price Updates:** Open positions are updated with current market prices during trading hours, with a configurable auto-refresh scheduler.  
* **Invalid Ticker Handling:** The UI provides clear feedback when a ticker symbol is invalid or cannot be found by the price API.

### **Views & Analytics**

* **Daily Reports:** View a snapshot of activity for any given day, including daily realized P\&L and a summary of open positions with correct Unrealized P/L calculations. The report title dynamically updates to show the currently viewed account holder.  
* **Charts Page:**  
  * **Portfolio Overview:** A consolidated view of all open positions with an accurate **weighted average cost basis** calculation. Includes "Day's Change" performance metrics.  
  * **Historical Performance Charts:** Tracks the total value of brokerage accounts over time with "All Time," "Past Five Days," and custom "Date Range" views. Charts are theme-aware and handle accounts with no data gracefully.  
  * **Realized P\&L Summaries:** View both a lifetime and a date-range selectable summary of realized profits and losses.  
* **Ledger Page:**  
  * A comprehensive, filterable, and sortable log of all transactions.  
  * Features a dynamic summary panel that calculates totals for the filtered results.  
  * Transactions are visually grouped by date for enhanced readability.  
* **Snapshots Page:** A dedicated UI for manually logging and managing historical total account values, which populate the performance charts.  
* **Imports Page:** A dedicated UI for importing historical BUY transactions from a CSV file into a selected account.

### **UI/UX & Customization**

* **Modern Theming System:** A variable-based CSS architecture supports multiple themes.  
* **Multiple Themes:** Includes Light (Default), Dark, Sepia, and High Contrast themes.  
* **Font Selection:** Choose from a list of modern, professional fonts in the settings menu.  
* **Modernized UI:** The application features a clean, spacious layout with the "Inter" font as the default, consistent rounded corners, and soft shadows.  
* **Tabbed Settings Modal:** A redesigned, organized settings panel for managing themes, fonts, exchanges, and account holders.

### **Development & Stability**

* **Automated Testing Environment:** The project includes a full testing suite using **Jest** for both the backend API and frontend rendering logic.  
* **Test-Driven Debugging:** Key bug fixes (like the weighted average calculation) are protected by specific, automated tests to prevent future regressions.

## **Technology Stack**

* **Backend:** Node.js, Express.js  
* **Database:** SQLite3 with a robust migration system  
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3  
* **Charting:** Chart.js  
* **Testing:** Jest, Supertest, JSDOM, Babel

## **Setup and Installation**

1. **Clone the repository:**  
   git clone \[https://github.com/JoeOster/stock\_tracker\_app\_v2.git\](https://github.com/JoeOster/stock\_tracker\_app\_v2.git)

2. **Navigate to the project directory:**  
   cd stock\_tracker\_app\_v2

3. **Install dependencies:**  
   npm install

4. **Configure Environment Variables:**  
   * Create a file named .env in the root of the project.  
   * Add your Finnhub API key to this file:  
     FINNHUB\_API\_KEY=YOUR\_API\_KEY\_HERE

5. **Run the application:**  
   node server.js

   Or for development with auto-restarting:  
   npm run dev

6. **Run the test suite:**  
   npm test

7. Open your browser and navigate to http://localhost:3000.

## **Future Plans & Long-Term Backlog**

The following major features are planned for future versions of the application.

### **Immediate To-Do List**

* **Set Default Account Holder:** Add an option in Settings to select a default account holder for the application to load on startup.  
* **Synchronize "Add Transaction" Form:** Ensure the "Account Holder" dropdown in the "Log a New Transaction" form automatically reflects the currently selected global account holder.

### **Long-Term Roadmap**

* **Seamless Data Import:** An advanced "smart" CSV importer and a tool to parse trade confirmation emails.  
* **Core Advisory & Alerting Engine:** Modules for tracking advisory performance, creating ROI dashboards, setting custom alerts, and managing a watch list. Includes a repository for relevant PDF documents.  
* **Version 4.0 & Beyond (Advanced Analytics):**  
  * Portfolio Composition & Diversity Dashboard.  
  * Integrated Trading Journal with note-taking on transactions.  
  * "What If" analysis for trade recommendations.  
  * Event & News Tagging.

### **Future Considerations**

* **Direct Brokerage Integration:** Potentially connect to brokerage APIs to sync data automatically (e.g., via Plaid).  
* **Desktop App Conversion:** Package the application as a standalone desktop app using Electron for easy sharing and local installation.