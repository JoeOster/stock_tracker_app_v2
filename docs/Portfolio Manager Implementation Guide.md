# Implementation Guide: V3.0 Roadmap

This document breaks down the V3.0 project plan into actionable development tasks, starting with foundational code improvements.

## **Phase 0: Foundational Refactoring & Cleanup**

**Objective:** Pay down technical debt and create a robust, maintainable foundation before building new features.

### **Task 0.1: Identify and Remove Unused Files**

* [ ] Audit the project repository for any scripts, old documentation, or code files that are no longer being used.
* [ ] Safely delete obsolete files, such as the `refactor-event-listeners.bat` script, which has already served its purpose.

### **Task 0.2: Create and Organize Project Documentation**

* [ ] Create a new `/docs` directory in the project root.
* [ ] Move all existing Markdown files (`README.md`, `gemini.md`, `Portfolio Manager Implementation Guide.md`, etc.) into the `/docs` directory.
* [ ] Create a new `database_schema.md` file in the `/docs` directory that consolidates the final schema from all existing migration files.

### **Task 0.3: Improve Code Organization and Commenting**

* [ ] Review all major JavaScript files and add JSDoc comments to functions, explaining their purpose, parameters, and return values.
* [ ] Reorganize the code within each file by grouping related functions together.

### **Task 0.4: Refactor Large Frontend Modules**

* [ ] **`app-main.js`**: Split the file into smaller, single-responsibility modules (e.g., `state.js`, `settings.js`, `data-service.js`).
* [ ] **`_charts.js`**: Extract the generic chart-building logic into a new, dedicated module.

### **Task 0.5: Decouple Frontend Renderers from Data Fetching**

* [ ] Create new functions in `/public/api.js` for each distinct API call.
* [ ] Modify the renderer functions in `/public/ui/renderers/` to accept data as arguments.
* [ ] Update `app-main.js` to orchestrate the API calls and pass data to the renderers.

### **Task 0.6: Consolidate Backend Services & Implement Rate Limiting**

* [ ] Create a new service file, e.g., `/services/priceFetcher.js`, to centralize all Finnhub API call logic.
* [ ] Implement a queue or rate-limiting library to manage outgoing API requests robustly.
* [ ] Refactor the reporting routes and cron jobs to use this new, rate-limited service.

### **Task 0.7: Fix and Refactor Automated Deployment Script**

* [ ] Investigate and resolve the silent exit issue in `deploy.bat`.
* [ ] Refactor the script's error-handling logic using a more robust method.
* [ ] Verify that the `robocopy` command is reliable and correctly copies all necessary files.

### **Task 0.8: Enhance Testing Strategy**

* [ ] Create separate Jest configurations for API and UI tests (e.g., `jest.config.api.js`, `jest.config.ui.js`).
* [ ] Update the `scripts` in `package.json` to allow for running these test suites independently (e.g., `test:api`, `test:ui`).
* [ ] Consider adding a simple end-to-end (E2E) test to validate a full user workflow.

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
