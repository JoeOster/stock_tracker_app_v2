# **Developer & Testing Tools**

This directory contains various scripts and data files for development, testing, and data management purposes. These tools are intended for use in a local development environment and should not be run in production.

## **General Data Injection (inject-data.js)**

This is a generic Node.js script for seeding the development database with transaction data from a simple CSV file. It's useful for quickly populating an account with a large history for testing reporting and performance features.

* **Data Format:** The script expects a simple CSV format. See sample-data.csv for a template. The required columns are: date, ticker, exchange, type, quantity, and price.  
* Usage (Interactive):  
  Run the script with the path to your CSV file. It will prompt you to choose an existing account holder or create a new one.  
  node ./tools/inject-data.js ./tools/sample-data.csv

* Usage (Command Line):  
  You can also provide the account holder ID, name, and CSV file as command-line arguments to run non-interactively.  
  \# Example: Inject sample-data.csv for account holder ID 2 ("Joe")  
  node ./tools/inject-data.js 2 Joe ./tools/sample-data.csv

## **Importer Feature Testing (importer-testing/)**

This subdirectory contains scripts and data files specifically designed for testing the "Intelligent CSV Importer" feature.

### **setup-conflict-test.js**

This script prepares the database for importer conflict-resolution testing. It clears existing transactions for the primary account holder and inserts a set of specific manual transactions that are designed to conflict with the sample brokerage CSV files (sample-fidelity.csv, sample-robinhood.csv, etc.).

* Usage:  
  Run this script before you plan to test the CSV importer's conflict detection on the frontend.  
  node ./tools/importer-testing/setup-conflict-test.js

### **setup-importer-tests.bat**

A simple Windows batch script that provides a menu to run the setup-conflict-test.js script.

* Usage:  
  Double-click the file or run it from your terminal.  
  .\\tools\\setup-importer-tests.bat

### **Sample Data Files**

The various .csv files inside importer-testing/ (e.g., sample-fidelity.csv, sample-etrade.csv) are used as the input files on the application's "Imports" page to test the parsing and conflict resolution logic against the data seeded by the setup script.

## **API Service Testing (test-price-service.js)**

This is a standalone diagnostic script to test the priceService.js module directly, bypassing the Express server and frontend. Its primary purpose is to verify that the Finnhub API keys are correct, the network connection is working, and the rate limiter is configured properly.

* Usage:  
  Run the script directly with Node.js. It will load your .env file, attempt to fetch prices for a predefined list of tickers (e.g., INTC, GOOGL), and print the results or any errors to the console.  
  node ./tools/test-price-service.js  
