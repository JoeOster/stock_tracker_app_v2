# **Portfolio Tracker V3**

A personal, self-hosted web application designed as a broker-agnostic strategy and performance hub for active retail traders. This version includes full multi-account integration, automated trade execution for limit orders, a robust deployment process, and a modular, maintainable codebase.

**GitHub Repository:** <https://github.com/JoeOster/stock_tracker_app_v2>

## **Project Overview**

The Portfolio Tracker is a personal journal and analytical tool that allows users to track performance, analyze strategy, and evaluate the effectiveness of external trading advice, independent of any specific brokerage. Its core strength lies in detailed lot-based tracking, multi-account management, and a clean, modern user interface.

## **Current State & Key Features**

The application is in a stable, feature-rich state with a comprehensive automated testing suite to protect core functionality.

* **Multi-Account Integration:** Track transactions and portfolio performance for multiple account holders.
* **Intelligent CSV Importer:** A sophisticated, multi-step reconciliation workflow that treats brokerage CSVs as the source of truth. It includes templates for major brokerages (Fidelity, E-Trade, Robinhood) and robust logic to handle real-world file formats.
* **Transaction Management:** Full CRUD functionality for all buy and sell transactions, with sales logged against specific buy lots for precise profit/loss calculation.
* **Pending Order Management & Alerts:** A backend "Order Watcher" service runs during market hours, creating alerts for price targets. Users can then mark these orders as filled, which logs the transaction.
* **Configurable Watchlist:** A dedicated page to monitor tickers you are interested in but do not yet own, with live price updates.
* **Live Price Updates:** Open positions are updated with current market prices via an auto-refresh scheduler.
* **Automated Testing Suite:** The project includes an integrated testing framework using Jest for both backend API and frontend UI tests.
* **Modern Theming System:** Includes Light (Default), Dark, Sepia, and High Contrast themes, plus font selection.
* **Environment-Specific Databases & Deployment:** The project uses separate databases for development, testing, and production.

## **Technology Stack**

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 with a migration system
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
* **Testing:** Jest, Supertest
* **Deployment:** NSSM for Windows Services, systemd for Linux

## **Setup and Installation**

### **Development Setup**

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a `.env` file from the `.env.template` and add your Finnhub API key.
4. (Optional) Reset the development database: `npm run seed-dev`
5. Start the development server: `npm run dev`
6. Run the automated test suite: `npm test`

### **Production Deployment (Windows)**

Run the automated `deploy.bat` script as an Administrator. The script handles stopping the service, running tests, backing up the database, copying files, and restarting the service.
