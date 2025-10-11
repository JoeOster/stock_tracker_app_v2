# **Implementation Guide: Importer & Journal Features**

This document breaks down the project\_plan.md into actionable development tasks.

## **Phase 1: Foundational Backend Changes**

**Objective:** Modify the database and backend to support the new features before any UI work begins.

### **Task 1.1: Create New Database Migration**

* \[ \] Create a new SQL file in the /migrations/ directory (e.g., 007-add-journal-features.sql).  
* \[ \] Add SQL statements to this file to:  
  * ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'MANUAL';  
  * ALTER TABLE transactions ADD COLUMN strategy\_id INTEGER REFERENCES strategies(id);  
  * ALTER TABLE transactions ADD COLUMN journal\_entry\_id INTEGER REFERENCES journal\_entries(id);  
  * Create the strategies table with all specified columns (id, name, description, contact\_person, contact\_info, platform).  
  * Create the journal\_entries table with all specified columns (id, strategy\_id, entry\_date, ticker, entry\_price, profit\_target, stop\_loss, notes, confidence, status).  
  * Create the journal\_entry\_prices table with an index on journal\_entry\_id.  
  * Create the strategy\_documents table.  
* \[ \] Run the server (npm run dev) to ensure the migration applies correctly to your development database.

### **Task 1.2: Create File Storage and Update Deployment Script**

* \[ \] Create a new directory named uploads/ in the project root.  
* \[ \] Add /uploads/ to your .gitignore file to prevent documents from being checked into source control.  
* \[ \] **Crucially**, update the deploy.bat script to create a backup of the uploads/ directory during deployment.

### **Task 1.3: Develop New API Endpoints**

* \[ \] Create a new route file, routes/journal.js.  
* \[ \] In this new file, create the necessary API endpoints:  
  * CRUD endpoints for /api/strategies.  
  * CRUD endpoints for /api/journal-entries.  
  * Endpoints for document management:  
    * POST /api/strategies/:id/documents (handles file upload using express-fileupload).  
    * GET /api/documents/:id (serves files).  
    * DELETE /api/documents/:id (deletes files).  
* \[ \] Update server.js to use this new route file.

### **Task 1.4: Update Existing APIs**

* \[ \] Modify the POST and PUT endpoints in routes/transactions.js to accept and save the new optional strategy\_id and journal\_entry\_id fields.

## **Phase 2: Feature Implementation**

**Objective:** Build the user-facing components for the new features.

### **Task 2.1: Build the Strategy Management UI**

* \[ \] In the Settings modal (\_modals.html), add a new tab and panel for "Manage Strategies."  
* \[ \] Create the UI for adding, editing, and deleting strategies, including the new metadata fields.  
* \[ \] Add the UI for uploading and managing documents associated with each strategy.

### **Task 2.2: Build the Journal Dashboard**

* \[ \] Add a new "Journal" tab to the main navigation (\_tabs.js).  
* \[ \] Create the HTML structure for the Journal page in a new template file (\_journal.html).  
* \[ \] Implement the two-table layout: "Promoted Trades Performance" and "Your Personal ROI."  
* \[ \] Develop the logic to fetch and display data in these tables.  
* \[ \] Create the "View Chart" modal that displays the intraday price history with data gap visualization.

### **Task 2.3: Implement the Intelligent CSV Importer**

* \[ \] Overhaul the \_imports.html template to support the new multi-step workflow.  
* \[ \] Add a client-side CSV parsing library.  
* \[ \] Implement the "Brokerage Template" selection logic.  
* \[ \] Build the unified "Review and Reconcile" interface, including the logic for handling SELL transaction reconciliation.  
* \[ \] Create a new backend endpoint to handle the complex import, deletion, and move operations atomically.

### **Task 2.4: Implement the Reminder System**

* \[ \] Create a new initializeImportReminderService() function in app-main.js.  
* \[ \] Add the logic to write to localStorage upon successful CSV import.  
* \[ \] Implement the check logic that runs on an interval to trigger the tiered modal/toast notifications.