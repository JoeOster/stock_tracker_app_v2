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
  * **Task: Decouple Frontend Renderers from Data Fetching**
    * **Status:** Partially Complete.
    * **Work Completed:** A centralized `public/api.js` module has been created, and it successfully handles most of the data-fetching logic for the application.
  * **Task: Consolidate Backend Services**
    * **Status:** Partially Complete.
    * **Work Completed:** A dedicated `services/priceService.js` has been created to centralize all external API calls for fetching stock prices.
* **Configuration & Deployment Updates:**
  * **Objective:** To standardize all environment configurations and update all deployment and backup automation to match the new V3 project structure.

---

## **Phase 1: Intelligent CSV Importer (Completed)**

**Objective:** To build a multi-step reconciliation workflow that treats brokerage CSV files as the source of truth, handling real-world data complexities and providing a clear user interface for resolving conflicts.

* **Status:** **Near Completion**. The core functionality is implemented and working.
* **Work Completed:**
  * [x] The UI has been completely overhauled with a new multi-step workflow.
  * [x] Brokerage-specific templates for Fidelity, Robinhood, and E-Trade have been implemented.
  * [x] The "Review and Reconcile" interface for handling conflicts is fully functional.
  * [x] A new, atomic backend endpoint for processing imports has been created.
  * [x] The entire workflow is validated with a suite of automated API tests.

---

## **Phase 2: Core Architectural Enhancements**

**Objective:** Upgrade the application's foundation to improve performance, data integrity, and scalability.

* **Task 2.1: Decouple Frontend Renderers**
  * **Objective:** To refactor the frontend rendering architecture by eliminating the central `renderers.js` hub file. This will make each renderer a standalone, independent module, resolving cascading import/export errors and improving maintainability.
* **Task 2.2: Database Schema Migration**
  * [ ] Create a new migration to introduce a `securities` and `exchanges` table.
  * [ ] Update the `transactions` table to use `security_id` and `exchange_id` as foreign keys.
* **Task 2.3: Backend Refactoring**
  * [ ] Update all backend API routes and services to work with the new database schema.
* **Task 2.4: Frontend Refactoring**
  * [ ] Once the backend is stable, update all frontend code to use the new API endpoints and data structures.

---

## **Phase 3: Strategy & Advice Journal**

**Objective:** Build a comprehensive tool for "paper trading," tracking advice from various sources, and analyzing performance.

* **Task 3.1: Database Migrations**
  * [ ] Create the necessary database tables for `strategies`, `journal_entries`, and `documents`.
* **Task 3.2: Strategy Management UI**
  * [ ] Build the user interface within the "Settings" modal for adding, editing, and deleting strategies.
* **Task 3.3: Journal Page Development**
  * [ ] Design and build the new "Journal" page with its dashboard and tables.
* **Task 3.4: Backend Enhancements**
  * [ ] Create a new cron job to track intraday prices for all open journal entries.
  * [ ] Implement the logic to automatically generate alerts when profit or stop-loss targets are met.

---

## **Phase 4: Future Architectural Improvements**

**Objective:** To continuously improve the application's robustness, testability, and maintainability.

* **Task 4.1: Adopt a Unit Testing-First Approach**
  * **Objective:** To supplement the existing integration tests with granular unit tests for individual functions.
  * **Strategy:** As new features are built or existing ones are refactored, write small, isolated unit tests for key business logic (e.g., form data creation, complex calculations) before integrating them into the main application.

* **Task 4.2: Implement Robust Backend Validation**
  * **Objective:** To create a stronger defense against invalid data entering the database.
  * **Strategy:** Enhance all `POST` and `PUT` API endpoints to include comprehensive validation for the request body, checking data types, formats, and required fields before processing the request.

* **Task 4.3: Centralize Server-Side Error Handling**
  * **Objective:** To reduce code duplication and ensure all API errors are handled consistently.
  * **Strategy:** Implement a single, centralized error-handling middleware in `server.js` that can catch errors from any route, log them, and send a standardized error response to the client.

* **Task 4.4: Centralize Application Configuration**
  * **Objective:** To make the application easier to configure by moving "magic numbers" and settings out of the code.
  * **Strategy:** Create a dedicated configuration file or expand the use of environment variables to manage settings like cron schedules, API rate limits, and other tunable parameters.
  