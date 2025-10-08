Live Stock Tracker V2
A personal, self-hosted web application designed to be a broker-agnostic strategy and performance hub for active retail traders.

Project Overview
The Live Stock Tracker is a personal journal and analytical tool that allows users to track performance, analyze strategy, and evaluate the effectiveness of external trading advice, independent of any specific brokerage. It provides detailed daily reports, historical performance charts, and a comprehensive transaction ledger to give a full picture of one's trading activity.

Key Features
Implemented Features
Transaction Management: Full CRUD (Create, Read, Update, Delete) functionality for all buy and sell transactions.

Lot-Based Tracking: Sells can be logged against specific buy lots, allowing for precise profit/loss calculation and tracking of remaining shares.

Daily Reports: View a snapshot of activity for any given day, including daily realized P&L and a summary of open positions with unrealized gains/losses.

Live Price Updates: Open positions are updated with current market prices during trading hours, with a configurable auto-refresh scheduler.

Portfolio Overview: A consolidated view of all open positions, showing total quantity, weighted average cost basis, and total unrealized P&L per ticker.

Historical Performance Charts:

All Time Value: Tracks the total value of brokerage accounts over the entire history of saved snapshots.

Past Five Days: A zoomed-in view of account performance over the last five trading days.

Date Range: A user-selectable date range for custom performance analysis.

P&L Summaries: View lifetime realized P&L, aggregated by exchange.

Sticky Columns: Key columns in data tables remain frozen for easier viewing during horizontal scrolling.

Technology Stack
Backend: Node.js, Express.js

Database: SQLite3

Frontend: Vanilla JavaScript (ES6 Modules), HTML5, CSS3

Key Libraries: sqlite, sqlite3, node-cron, chart.js

Setup and Installation
Clone the repository:

git clone [https://github.com/JoeOster/stock_tracker_app_v2.git](https://github.com/JoeOster/stock_tracker_app_v2.git)

Navigate to the project directory:

cd stock_tracker_app_v2

Install dependencies:

npm install

Configure Environment Variables:

Create a file named .env in the root of the project.

Add your Finnhub API key to this file:

FINNHUB_API_KEY=YOUR_API_KEY_HERE

Run the application:

node server.js

Open your browser and navigate to http://localhost:3000.

Feature Roadmap
This project is under active development. The following outlines the planned features and improvements.

Immediate To-Do List
Version 3.0: Ledger & UI Enhancements

Display Dynamic Summaries on Ledger Page.

Visually Group Transactions by Date on Ledger.

Version 3.1: Chart & Portfolio Enhancements

Add "Day's Change" to Portfolio Overview.

Add a Date-Range Selectable Realized P&L Chart.

Version 3.2: Account Value Tracking

Create a UI for logging and managing historical account value snapshots.

Long-Term Backlog
Seamless Data Import: A "smart" CSV importer and a tool to parse trade confirmation emails.

Core Advisory & Alerting Engine: Modules for tracking advisory performance, creating performance dashboards, and setting universal alerts.

Advanced Analytics (Version 4.0 & Beyond):

Portfolio Composition & Diversity Dashboard.

Integrated Trading Journal.

"What If" analysis for trade recommendations.

Direct Brokerage Integration.