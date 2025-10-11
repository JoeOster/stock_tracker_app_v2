# **Gemini Context File for Portfolio Tracker V2**

**Last Updated:** 2025-10-11

This document provides a comprehensive summary of the "Portfolio Tracker V2" project and its strategic roadmap to assist AI prompts.

## **1\. Project Summary**

Portfolio Tracker V2 is a self-hosted web application for active retail traders to track investment performance and strategy across multiple brokerage accounts. It is built with a Node.js/Express backend, a vanilla JavaScript frontend, and uses SQLite for data storage. The project has a modular architecture and an automated testing and deployment process.

**GitHub Repository:** https://github.com/JoeOster/stock\_tracker\_app\_v2

## **2\. Core Architecture**

* **Backend (/routes, /services, server.js):** An Express.js server handles API requests. The logic is split into route files and services (e.g., cronJobs.js for scheduled tasks).  
* **Database (database.js, /migrations):** Uses SQLite3 with a built-in migration system that automatically applies .sql files on startup.  
* **Frontend (/public):**  
  * **app-main.js**: The main script managing state, loading templates, and initializing modules.  
  * **/templates**: Contains HTML partials for each page view.  
  * **/ui/renderers**: Modules responsible for rendering data into the DOM.  
  * **/event-handlers**: Modules for handling user interactions.

## **3\. Strategic Roadmap: Upcoming Features**

The following major features are planned for development.

### **3.1. Intelligent CSV Importer**

This feature will replace the basic importer with a sophisticated, multi-step reconciliation workflow, treating the CSV as the definitive source of truth.

* **Database Prerequisite:** A source column will be added to the transactions table to distinguish 'MANUAL' from 'CSV\_IMPORT' entries.  
* **Brokerage Templates:** The user will select a template (e.g., "Fidelity," "E-Trade") to pre-configure parsing and mapping logic, with an option to save new custom templates.  
* **Unified Reconciliation UI:** A single review screen will handle all key actions:  
  * **Filtering:** Automatically identify and ignore non-trade activities (e.g., deposits).  
  * **Conflict Resolution:** Detect and flag conflicts between CSV data and existing manual entries, including "Direct Matches" (potential typos) and "Cross-Exchange Matches" (trades logged in the wrong account). The user will be prompted to Replace, Keep, Move & Replace, or Import as New.  
  * **Orphaned Data:** Flag manual entries that exist in the database but not in the CSV for a given date range, prompting the user to keep or delete them.  
  * **SELL Lot Assignment:** Require the user to manually assign all imported SELL transactions to specific BUY lots, with a FIFO suggestion as a default.

### **3.2. Strategy & Advice Journal**

This feature will allow users to log, track, and analyze trading ideas from various sources.

* **Database Schema:** New tables will be added:  
  * strategies: To store metadata about sources (name, contact, platform).  
  * journal\_entries: To log specific trade ideas ("paper trades") with entry/exit targets and a user-defined confidence score.  
  * strategy\_documents: To link uploaded files (PDF, Markdown) to strategies and/or specific journal entries.  
  * journal\_entry\_prices: To store time-series price data for open journal entries.  
* **Direct Trade Linking:** The transactions table will be modified to allow a user's actual trade to be linked directly to a journal\_entry\_id, enabling direct performance comparison.  
* **Intraday Price Tracking:**  
  * **Data Collection:** The existing 5-minute cron job will be enhanced to fetch and store prices for all OPEN journal entries.  
  * **Automated Alerts:** Instead of auto-closing trades, the system will create a notification in the "Alerts" tab when a profit\_target or stop\_loss is met, keeping the user in control.  
  * **Data Gap Detection:** The system will detect interruptions in data collection (e.g., due to server reboots) and flag these gaps.  
* **Journal Dashboard UI:** A new "Journal" page will feature:  
  * A dashboard to analyze the performance of a strategy's "paper trades" and the user's personal ROI on trades taken from that strategy.  
  * A modal chart to visualize the 5-minute intraday price history for a journal entry, with any data gaps clearly indicated.  
  * A document management interface to view attached research.

### **3.3. Ancillary Features & Improvements**

* **Import Reminder System:** A client-side, exchange-specific reminder system using localStorage to notify the user if they haven't imported a file for a specific exchange within a set period.  
* **Technical Improvements:**  
  * The deploy.bat script will be updated to back up the new uploads/ directory.  
  * A database index will be added to the journal\_entry\_prices table for performance.