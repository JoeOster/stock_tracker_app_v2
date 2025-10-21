# **Portfolio Manager V3: Comprehensive Implementation Guide**

**Last Updated:** 2025-10-20

## **Phase 0: Foundational Refactoring & Cleanup (Completed)**

* [x] Code & Documentation Organization
* [x] Application Refactoring
* [x] Configuration & Deployment Updates
* [x] Enhance Testing Strategy (Separate API/UI configs)

---

## **Phase 0.5: Application Hardening (In Progress)**

* [x] Task 0.5.1: Enhance Frontend Error Handling (API `handleResponse`, event handler `catch` blocks)
* [x] Task 0.5.2: Improve Data Validation (Client-side validation for Orders, Journal, Snapshots, Settings forms)
* [ ] Task 0.5.3: Verify and Fix Test Suite (Address remaining failures in UI tests)
  * **Known Issue (2025-10-20):** The UI test suite `public/event-handlers/_settings.ui.test.js` (specifically the "Exchange Management" `describe` block) is currently disabled (`describe.skip`). It fails due to difficulties mocking the `_settings.js` module while preserving the original `initializeSettingsHandlers` function, leading to issues verifying calls to mocked asynchronous functions within the event handler in the JSDOM environment. Standard Jest async/mocking patterns did not resolve this scope/hoisting issue. This test should be revisited later, possibly after refactoring.

---

## **Phase 1: Intelligent CSV Importer (Completed)**

* [x] Overhaul UI, templates, conflict resolution, backend endpoint, tests.

---

## **Phase 1.5: Importer Hardening (Completed)**

* [x] Task 1.5.1: Improve Handling of Import Edge Cases (Invalid Price, Missing BUYs, Insufficient Shares, Frontend Feedback)

---

## **Phase 2: Strategy & Advice Journal / Dashboard Implementation (Completed)**

* [x] Task 2.1: Database Migrations (Journal tables)
* [x] Task 2.2: Advice Source Management UI
* [x] Task 2.3: Journal Page Development (Basic UI & Functionality)
* [x] Task 2.4: Backend Enhancements (Migration `009`, Cron job `runWatcher` logic)
* [x] Task 2.5: Simplify Date Tabs
* [x] Task 2.6: Implement New "Dashboard" Tab (Card/Table Views, Sorting, Filtering, Actions)
* [ ] Task 2.7 (Deferred): Add Spark Charts to Card View
* [ ] Task 2.8 (Deferred): Refactor Historical Data Access & Daily Report View

---

## **Phase X: UI Refinements & Fixes (Ongoing)**

* [ ] Task X.1: Standardize Modal Button Layouts
* [ ] Task X.3 (Deferred): Add UI Settings (Batch Update for Default View & Number of Date Tabs)

---

## **Phase 3: Authentication**

**Objective:** Secure the application with a user login system.

* [ ] Implement user authentication and session management.
* [ ] Create a login page and integrate the flow.
* [ ] **Refine Account Holder Management** (Delete primary, default reassignment, two-step delete w/ data removal).

---

## **Phase 4: Future Architectural Improvements**

* [ ] **Task 4.1: Adopt Unit Testing:** Supplement integration tests with unit tests. **(Revisit disabled `_settings.ui.test.js`)**
* [ ] **Task 4.2: Implement Robust Backend Validation:** Add stricter data validation on API inputs.
* [ ] **Task 4.3: Centralize Server-Side Error Handling:** Create middleware for consistent API error responses.
* [ ] **Task 4.4: Centralize Application
