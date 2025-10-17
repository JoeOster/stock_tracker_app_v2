# **Portfolio Manager V3: Comprehensive Implementation Guide**

This document provides a complete roadmap for the V3 development of the Portfolio Manager, consolidating all ideas and plans into a single, actionable guide.

## **Phase 0: Foundational Refactoring & Cleanup (Completed)**

**Objective:** Pay down technical debt and create a robust, maintainable foundation before building new features.

* **Code & Documentation Organization:**
  * [x] Identified and removed all unused files from the project.
  * [x] Created a new `/docs` directory and consolidated all project documentation.
  * [x] Improved in-code documentation with JSDoc comments.
* **Application Refactoring:**
  * [x] **Task: Decouple Frontend Renderers:** The frontend rendering architecture has been successfully refactored. The central `renderers.js` hub file has been eliminated, and each renderer is now a standalone, independent module. This has resolved the cascading import/export errors and significantly improved the maintainability of the codebase.
  * [x] **Task: Rebuild "New Orders" Page:** The fragile "New Orders" page was successfully hollowed out and rebuilt from a clean slate on a stable, decoupled foundation.
* **Configuration & Deployment Updates:**
  * [x] Standardized all environment configurations and updated deployment and backup automation to match the new V3 project structure.

---

## **Phase 1: Intelligent CSV Importer (Completed)**

**Objective:** To build a multi-step reconciliation workflow that treats brokerage CSV files as the source of truth, handling real-world data complexities and providing a clear user interface for resolving conflicts.

* **Status:** **Completed**. The core functionality is implemented and working.
* **Work Completed:**
  * [x] The UI has been completely overhauled with a new multi-step workflow.
  * [x] Brokerage-specific templates for Fidelity, Robinhood, and E-Trade have been implemented and bugs resolved.
  * [x] The "Review and Reconcile" interface for handling conflicts is fully functional.
  * [x] A new, atomic backend endpoint for processing imports has been created.
  * [x] The entire workflow is validated with a suite of automated API tests.

---

## **Phase 2: Strategy & Advice Journal**

**Objective:** Build a comprehensive tool for "paper trading," tracking advice from various sources, and analyzing performance.

* **Task 2.1: Database Migrations**
  * [ ] Create the necessary database tables for `strategies`, `journal_entries`, and `documents`.
* **Task 2.2: Strategy Management UI**
  * [ ] Build the user interface within the "Settings" modal for adding, editing, and deleting strategies.
* **Task 2.3: Journal Page Development**
  * [ ] Design and build the new "Journal" page with its dashboard and tables.
* **Task 2.4: Backend Enhancements**
  * [ ] Create a new cron job to track intraday prices for all open journal entries.
  * [ ] Implement the logic to automatically generate alerts when profit or stop-loss targets are met.

---

## **Phase 3: Future Architectural Improvements**

**Objective:** To continuously improve the application's robustness, testability, and maintainability.

* **Task 3.1: Adopt a Unit Testing-First Approach**
  * **Objective:** To supplement the existing integration tests with granular unit tests for individual functions.
* **Task 3.2: Implement Robust Backend Validation**
  * **Objective:** To create a stronger defense against invalid data entering the database.
* **Task 3.3: Centralize Server-Side Error Handling**
  * **Objective:** To reduce code duplication and ensure all API errors are handled consistently.
* **Task 3.4: Centralize Application Configuration**
  * **Objective:** To make the application easier to configure by moving "magic numbers" and settings out of the code.
