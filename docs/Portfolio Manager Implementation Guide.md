# **Portfolio Manager V3: Comprehensive Implementation Guide**

This document provides a complete roadmap for the V3 development of the Portfolio Manager, consolidating all ideas and plans into a single, actionable guide.

## **Phase 0: Foundational Refactoring & Cleanup (Completed)**

**Objective:** Pay down technical debt and create a robust, maintainable foundation before building new features.

* **Code & Documentation Organization:**
  * [x] Identified and removed all unused files from the project.
  * [x] Created a new `/docs` directory and consolidated all project documentation.
  * [x] Improved in-code documentation with JSDoc comments.
* **Application Refactoring:**
  * **Task: Split Large Frontend Modules**
    * **Objective:** To break down monolithic files into smaller, single-responsibility modules, improving maintainability and reducing complexity. This should be done incrementally, using VS Code's built-in tools to automate import/export updates and prevent regressions.
    * **Primary Targets:**
      * `public/app-main.js`: The application's central hub, responsible for state, initialization, data fetching, and rendering orchestration.
      * `public/ui/renderers/_charts.js`: Contains logic for creating multiple chart types.
    * **Refactoring Strategy for `app-main.js`:**
            1. **Extract State Management:** Create a new `public/state.js` file. Move all top-level state variables and the functions that manage them into this new module.
            2. **Extract Initialization Logic:** Create a new `public/init.js` file. Move the `DOMContentLoaded` event listener and the main `initializeApp` function into this module. Update `index.html` to use `init.js` as the new entry point.
            3. **Incrementally Move Remaining Functions:** For each remaining group of related functions (e.g., data fetching logic), use VS Code's **"Refactor... > Move to a new file"** feature. This will automatically handle the creation of the new file and update all necessary `import` and `export` statements across the project.
            4. **Test at Each Step:** After moving each block of code, test the application thoroughly to ensure no functionality has broken.
  * **Task: Decouple Frontend Renderers from Data Fetching**
    * **Status:** Partially Complete.
    * **Work Completed:** A centralized `public/api.js` module has been created, and it successfully handles most of the data-fetching logic for the application.
    * **Next Steps:** Audit all event handler files (`/public/event-handlers/`) and UI renderer files (`/public/ui/renderers/`) to ensure that *no direct `fetch` calls* remain. All data fetching should be delegated to the `api.js` module.
  * **Task: Consolidate Backend Services**
    * **Status:** Partially Complete.
    * **Work Completed:** A dedicated `services/priceService.js` has been created to centralize all external API calls for fetching stock prices.
    * **Next Steps:** Review all backend route files (`/routes/`) to ensure they are exclusively using the `priceService.js` for price data. Any remaining direct calls to the Finnhub API should be refactored to use the service.
* **Configuration & Deployment Updates:**
  * **Objective:** To standardize all environment configurations and update all deployment and backup automation to match the new V3 project structure.
  * **Server & Environment:**
    * **Status:** **Completed**.
    * **Work Completed:**
      * The `server.js` file is correctly configured to use the port from the `.env` file for development.
      * The `.env.template` file properly instructs users on how to set the development port.
  * **Windows Deployment (`deploy.bat`):**
    * **Status:** **Partially Complete**.
    * **Next Steps:**
      * Modify the `deploy.bat` script to target the `c:\portfolio_managerV3` directory for production files.
      * Update the backup logic within the script to use a new V3-specific backup path (e.g., `c:\portfolio_manager_bu\v3\prod`).
  * **Raspberry Pi / Linux Deployment:**
    * **Status:** **Not Started**.
    * **Next Steps:**
      * Update the `docs/RASPBERRY_PI_DEPLOYMENT.md` guide to reflect the new V3 configurations.
      * Modify the `docs/setup_pi.sh` script to use a new, V3-specific backup path and cron job.
  * **Development Backup:**
    * **Status:** **Not Started**.
    * **Next Steps:** Create a new npm script (e.g., `npm run backup:dev`) that specifically backs up the development database to a V3-specific development backup path (e.g., `c:\portfolio_manager_bu\v3\dev`).

---

## **Phase 1: Intelligent CSV Importer (Completed)**

**Objective:** To build a multi-step reconciliation workflow that treats brokerage CSV files as the source of truth, handling real-world data complexities and providing a clear user interface for resolving conflicts.

* **Status:** **Near Completion**. The core functionality is implemented and working. The remaining tasks are focused on final validation and improving the user experience.
* **Work Completed:**
  * [x] The UI has been completely overhauled with a new multi-step workflow.
  * [x] A client-side CSV parsing library has been integrated.
  * [x] Brokerage-specific templates for Fidelity, Robinhood, and E-Trade have been implemented.
  * [x] The "Review and Reconcile" interface for handling conflicts is fully functional.
  * [x] A new, atomic backend endpoint for processing imports has been created.
  * [x] Logic to automatically combine fractional share transactions is in place.
  * [x] The entire workflow is validated with a suite of automated API tests.
* **Remaining Tasks:**
  * **Task 1.1: Final Manual Validation**
    * **Objective:** To perform a final, end-to-end manual test of the entire import process for each supported brokerage.
    * **To Do:**
      * [ ] Use real-world CSV files (if possible) to test the Fidelity, Robinhood, and E-Trade importers one last time.
      * [ ] Document any unexpected behavior or edge cases that are discovered.
  * **Task 1.2: Improve Frontend Error Handling**
    * **Objective:** To provide more specific and helpful error messages to the user.
    * **To Do:**
      * [ ] Audit all `fetch` calls in the importer's event handler to ensure that the `catch` block reads the JSON body of a failed response.
      * [ ] Update the `showToast` calls to display the specific `error.message` from the server, rather than a generic "Import Failed" message.

---

## **Phase 2: Core Architectural Enhancements**

**Objective:** Upgrade the application's foundation to improve performance, data integrity, and scalability.

* **Task 2.1: Database Schema Migration**
  * [ ] Create a new migration to introduce a `securities` and `exchanges` table.
  * [ ] Update the `transactions` table to use `security_id` and `exchange_id` as foreign keys, replacing the direct use of `ticker` and `exchange` strings.
* **Task 2.2: Backend Refactoring**
  * [ ] Update all backend API routes and services to work with the new database schema. This should be done *before* any frontend changes.
  * [ ] Create a new `portfolio.js` route to handle portfolio-specific data.
* **Task 2.3: Frontend Refactoring**
  * [ ] Once the backend is stable, update all frontend code to use the new API endpoints and data structures.

---

## **Phase 3: Strategy & Advice Journal**

**Objective:** Build a comprehensive tool for "paper trading," tracking advice from various sources, and analyzing performance.

* **Task 3.1: Database Migrations**
  * [ ] Create the necessary database tables for `strategies`, `journal_entries`, and `documents`.
* **Task 3.2: Strategy Management UI**
  * [ ] Build the user interface within the "Settings" modal for adding, editing, and deleting strategies.
  * [ ] Implement the functionality to upload and associate research documents with a strategy.
* **Task 3.3: Journal Page Development**
  * [ ] Design and build the new "Journal" page.
  * [ ] Create the dashboard for performance overview, including comparison charts.
  * [ ] Implement the tables for managing open and closed journal entries.
* **Task 3.4: Backend Enhancements**
  * [ ] Create a new cron job to track intraday prices for all open journal entries.
  * [ ] Implement the logic to automatically generate alerts when profit or stop-loss targets are met.

---

## **Phase 4: Application Hardening & User Experience**

**Objective:** Improve the application's robustness, security, and overall user experience.

* **Task 4.1: User Authentication**
  * [ ] Implement a secure user authentication and session management system on the backend.
  * [ ] Create a login page and integrate the authentication flow into the frontend.
* **Task 4.2: Notification Center & Event Log**
  * [ ] Design and build a dedicated view to display a persistent history of all system notifications and toast messages.
* **Task 4.3: Enhanced API Rate Limiting**
  * [ ] Replace the current `setTimeout`-based rate limiting with a more robust library like `bottleneck` or `p-limit`.
* **Task 4.4: Improved Error Handling & Validation**
  * [ ] Audit all frontend `fetch` calls to ensure they properly handle and display server error messages.
  * [ ] Add real-time, client-side validation to all input forms.
* **Task 4.5: Standardize Renderer Modules and Add Filter Bars**
  * **Objective:** Resolve inconsistencies in the frontend renderer modules and enhance table usability with universal filter bars.
  * **Problem:** There is an import/export mismatch between `renderers.js` and `_orders.js`. The main renderer hub expects a function that isn't being exported, causing the application to fail on load. This is a form of technical debt from previous refactoring efforts.
  * **To Do:**
    * [ ] Audit all renderer modules in `/public/ui/renderers/`. Ensure that the function exported from each individual `_...js` file matches the function being imported and re-exported in the main `renderers.js` file.
    * [ ] Standardize the naming convention (e.g., `render[PageName]`) for all main view renderers to prevent future mismatches.
    * [ ] Implement a consistent "filter bar" component that can be added above all major data tables (Transaction Ledger, Open Lots, Pending Orders). This will provide a uniform user experience for filtering data by ticker.

---

## **Phase 5: Finalization & Documentation**

**Objective:** Ensure the project is stable, well-tested, and thoroughly documented.

* **Task 5.1: Testing Strategy Enhancements**
  * [ ] Add a suite of end-to-end (E2E) tests to validate key user workflows.
  * [ ] Implement a system to automatically record test results and code coverage to the database for historical tracking.
* **Task 5.2: Deployment Script Refinements**
  * [ ] Investigate and fix any remaining issues with the `deploy.bat` script, particularly its error handling.
* **Task 5.3: Final Documentation Update**
  * [ ] Review and update all project documentation (`README.md`, `database_schema.md`, etc.) to reflect all the new V3 features.
  