# Implementation Guide: V3.0 Roadmap

This document breaks down the V3.0 project plan into actionable development tasks, starting with foundational code improvements.

## **Phase 0: Foundational Refactoring & Cleanup**

**Objective:** Pay down technical debt and create a robust, maintainable foundation before building new features.

### **Task 0.1: Identify and Remove Unused Files**

* [x] Audit the project repository for any scripts, old documentation, or code files that are no longer being used.
* [x] Safely delete obsolete files, such as the `refactor-event-listeners.bat` script, which has already served its purpose.

### **Task 0.2: Create and Organize Project Documentation**

* [x] Create a new `/docs` directory in the project root.
* [x] Move all existing Markdown files (`README.md`, `gemini.md`, `Portfolio Manager Implementation Guide.md`, etc.) into the `/docs` directory.
* [x] Create a new `database_schema.md` file in the `/docs` directory that consolidates the final schema from all existing migration files.
* [x] Remove deprecated tables (`stock_prices`, `positions`) via a new migration.

### **Task 0.3: Improve Code Organization and Commenting**

* [x] Review all major JavaScript files and add JSDoc comments to functions, explaining their purpose, parameters, and return values.
* [x] Reorganize the code within each file by grouping related functions together.

### **Task 0.4: Refactor Large Frontend Modules**

* [x] **`app-main.js`**: Split the file into smaller, single-responsibility modules (e.g., `state.js`).
* [x] **`_charts.js`**: Extract the generic chart-building logic into a new, dedicated module (`chart-builder.js`).

### **Task 0.5: Decouple Frontend Renderers from Data Fetching**

* [x] Create new functions in `/public/api.js` for each distinct API call.
* [x] Modify the renderer functions in `/public/ui/renderers/` to accept data as arguments.
* [x] Update `app-main.js` to orchestrate the API calls and pass data to the renderers.

### **Task 0.6: Consolidate Backend Services & Implement Rate Limiting**

* [x] Create a new service file, e.g., `/services/priceFetcher.js`, to centralize all Finnhub API call logic.
* [ ] Enhance API rate limiting by replacing the current `setTimeout` implementation with a more robust library like `bottleneck` or `p-limit`.

### **Task 0.8: Enhance Testing Strategy**

* [x] Create separate Jest configurations for API and UI tests (e.g., `jest.config.api.js`, `jest.config.ui.js`).
* [x] Update the `scripts` in `package.json` to allow for running these test suites independently.
* [ ] Consider adding a simple end-to-end (E2E) test to validate a full user workflow.

### **Task 0.9: Update Configuration for V3 Standards**

* [ ] **Server & Environment:**
  * [ ] Update `server.js` to use port `3003` as the default production port.
  * [ ] Create a `.env.template` or similar example file to instruct users to set `PORT=3111` for development.
* [ ] **Windows Deployment (`deploy.bat`):**
  * [ ] Modify the script to target the `c:\portfolio_managerV3` directory for production files.
  * [ ] Update the backup logic within the script to use `c:\portfolio_manager_bu\v3\prod`.
* [ ] **Raspberry Pi / Linux Deployment:**
  * [ ] Update the `docs/RASPBERRY_PI_DEPLOYMENT.md` guide to reflect the new production port (`3003`).
  * [ ] Modify the `docs/setup_pi.sh` script:
    * Change the default port suggestion to `3003`.
    * Update the backup script and cron job to use a Linux-appropriate path that mirrors the new standard (e.g., `/home/pi/portfolio_manager_bu/v3/prod`).
* [ ] **Development Backup:**
  * [ ] Create a new npm script (e.g., `npm run backup:dev`) that backs up the development database to `c:\portfolio_manager_bu\v3\dev` on Windows or an equivalent path for Linux/macOS.

### **Task 0.10: Correct Ledger Table Layout**

* [ ] Add `<th>` elements for "My Limit Up" and "My Limit Down" to `public/templates/_ledger.html`.
* [ ] Ensure the renderer in `public/ui/renderers/_ledger.js` correctly populates these columns.

## **Phase 0.5: Application Hardening**

**Objective:** Improve the application's robustness and user experience based on the stable Phase 0 foundation.

### **Task 0.5.1: Enhance Frontend Error Handling**

* [ ] Audit all `fetch` calls in the frontend event handlers and API modules.
* [ ] Ensure that the `catch` block for each call reads the JSON body of a failed response.
* [ ] Update `showToast` calls to display the specific `error.message` from the server.

### **Task 0.5.2: Improve Data Validation**

* [ ] Add client-side validation checks to input forms to provide immediate feedback to the user.
* [ ] Prevent form submission if validation fails (e.g., a sell date is before a buy date).

## **Phase 1: Intelligent CSV Importer**

**Objective:** Replace the basic import function with a sophisticated, multi-step reconciliation workflow.

* [ ] Overhaul the `_imports.html` template to support the new multi-step workflow.
* [ ] Add a client-side CSV parsing library.
* [ ] Implement the "Brokerage Template" selection logic.
* [ ] Build the unified "Review and Reconcile" interface, including logic for handling SELL transaction reconciliation.
* [ ] Create a new backend endpoint to handle the complex import, deletion, and move operations atomically.

## **Phase 2: Strategy & Advice Journal**

**Objective:** Build a comprehensive tool for "paper trading," tracking advice from various sources, and analyzing performance.

* [ ] Implement the necessary database migrations for strategies, journal entries, and documents.
* [ ] Build the UI for strategy management in the Settings modal.
* [ ] Develop the new "Journal" page with its dashboard, tables, and charting modal.
* [ ] Enhance the backend cron jobs to include intraday price tracking for open journal entries.

## **Phase 3: Authentication**

**Objective:** Secure the application with a user login system.

* [ ] Implement a user authentication and session management system on the backend.
* [ ] Create a login page and integrate the authentication flow into the frontend.

## **Phase 4: Finalization & Documentation**

**Objective:** Ensure all project documentation is up-to-date with the new V3 features and architecture.

### **Task 4.1: Update All Project Documentation**

* [ ] Review and update `README.md` to include details about the Intelligent CSV Importer, Strategy & Advice Journal, and Authentication features.
* [ ] Update `database_schema.md` with any schema changes introduced during the implementation of the new features.
* [ ] Update `RASPBERRY_PI_DEPLOYMENT.md` and `setup_pi.sh` with any new environment variables, dependencies, or setup steps required for the V3 features.
* [ ] Review all in-code JSDoc comments to ensure they accurately reflect the final V3 codebase.
* [ ] Update `gemini.md` to incorporate the completed V3 features, preparing it for future development cycles.

## **Phase 6: Deployment & Infrastructure**

### **Task 6.1: Fix and Refactor Automated Deployment Script**

* [ ] Investigate and resolve the silent exit issue in `deploy.bat`.
* [ ] Refactor the script's error-handling logic using a more robust method.
* [ ] Verify that the `robocopy` command is reliable and correctly copies all necessary files.
