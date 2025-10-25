# Portfolio Manager V3 - Revised Development Plan

**Last Updated:** 2025-10-24

This document outlines the remaining tasks for the Portfolio Tracker application, organized into a logical development pathway.

---

## **UX Considerations (To Review)**

These are areas to consider for improving the user experience during or after the main phases.

* **Task UX.1: Loading States & Feedback:**
  * [ ] Review loading feedback during asynchronous operations (tab switching, manual price refresh, CSV commit).
  * [ ] Consider adding spinners or disabling buttons during processing to provide clearer feedback beyond toasts.
* **Task UX.2: Importer Workflow Clarity:**
  * [ ] Add more descriptive text/visual cues during the reconciliation step.
  * [ ] Ensure error messages during parsing/processing are specific (e.g., row number, error type).
  * [ ] **(New)** Enhance alert messages for skipped imports (e.g., invalid price, no open BUY lot) to include specific details from the CSV row (Ticker, Date, Qty, Price) to aid manual reconciliation.
  * [ ] **(New)** Implement detection/messaging for uploading a CSV that seems identical (or contains mostly identical rows) to a previously imported file for the same account holder. Consider if/how to track import history per file/date. Maybe add a "source\_import\_id" to transactions table?
* **Task UX.3: State Persistence (Filters/Sorts):**
  * [ ] Decide if filter/sort states on Ledger, Journal, Dashboard should persist when switching main tabs.
  * [ ] If yes, implement storing/retrieving these UI states (e.g., in global `state` or `localStorage`).
* **Task UX.4: Modal Management:**
  * [ ] Review modal closing behavior (background click, escape key).
  * [ ] Ensure context is clear when modals (like Edit) are opened from different views.
  * [ ] Consider if the "Manage Position Details" modal should become a dedicated view/panel instead of a modal due to its planned complexity.
* **Task UX.5: Settings Navigation:**
  * [ ] Review clarity of Settings modal tab/sub-tab hierarchy.

---

## **Phase 1: Complete Dashboard Core Functionality**

**Goal:** Finalize the main user interaction loop for managing positions directly from the dashboard.

* **Task 1.1 (Task X.5 - Part 1): Implement "Manage Position Details" Modal**
  * [ ] Create the new modal template (`_modal_manage_position.html`) including sections for:
    * Ticker/Exchange Header
    * List of individual lots with per-lot "Edit" and "Limits" buttons.
    * Placeholder for combined sales history.
    * (Future Placeholders: Chart, News, Journal Links).
  * [ ] Add necessary CSS for the new modal.
* **Task 1.2 (Task X.5 - Part 2): Implement Backend Batch Sales History**
  * [ ] Create a new backend API endpoint (e.g., `/api/transactions/sales/batch`) that accepts an array of `buyId`s and returns the combined, sorted sales history.
* **Task 1.3 (Task X.5 - Part 3): Update Frontend Handler for "Manage" Button**
  * [ ] Modify `handleActionClick` in `public/event-handlers/_dashboard.js`:
    * Handle clicks on `.manage-position-btn`.
    * Parse `data-ticker`, `data-exchange`, and `data-lot-ids`.
    * Call the new batch sales history API endpoint.
    * Create and call a new function (e.g., `populateManagementModal`) to render the fetched data and lot list (including per-lot buttons) into the new modal.
    * Add event listeners within the modal (or use delegation) for the per-lot "Edit" / "Limits" buttons, likely reusing the existing `populateEditModal` logic.
    * Display the modal.

---

## **Phase 2: Hardening & Testing Foundation**

**Goal:** Improve application stability, maintainability, and test coverage before adding major new features.

* **Task 2.1 (Task 4.2): Implement Robust Backend Validation**
  * [ ] Review all backend API routes (`routes/` directory) and add stricter validation for incoming request bodies and parameters.
* **Task 2.2 (Task 4.3): Centralize Backend Error Handling**
  * [ ] Create Express middleware to catch errors and send consistent JSON error responses from the API.
* **Task 2.3 (Task 0.5.3 / 4.1): Revisit & Expand Testing**
  * [ ] Investigate and fix the skipped UI tests in `_settings.ui.test.js`.
  * [ ] Add further unit tests where practical (e.g., more helper functions).

---

## **Phase 3: Source-Centric Management (Vision Feature)**

**Goal:** Build the new "Sources" feature as a central hub for advice tracking.

* **Task 3.1 (Task 5.1): Refocus Tabs:**
  * [ ] Rename/merge "Journal", potentially create new "Sources" tab in `_tabs.js`.
* **Task 3.2 (Task 5.2 & X.15 Part 1): Database Schema Changes**
  * [ ] Create DB migration script:
    * Refactor `advice_sources` contact fields (Drop `contact_app`, add `contact_app_type`, `contact_app_handle`).
    * Add `advice_source_id` to `watchlist`.
    * Add `advice_source_id` to `documents`, make `journal_entry_id` nullable.
    * (Optional) Create `source_notes` table.
* **Task 3.3 (Task 5.3 & X.15 Part 2): Backend API Development**
  * [ ] Update `routes/advice_sources.js` for new contact fields.
  * [ ] Create new `/api/sources/*` endpoints (fetch details, notes, linked items).
  * [ ] Modify `watchlist`, `documents`, `journal` routes as needed.
* **Task 3.4 (Task 5.4 & X.15 Part 3): Frontend UI Development**
  * [ ] Create `_sources.html` template.
  * [ ] Update Settings modal UI for new Advice Source contact fields.
  * [ ] Develop `_sources.js` (renderer and event handler) for the new tab, including logic for dynamic sub-tabs per source.
* **Task 3.5 (Task 5.5): Integrate Paper Trading:**
  * [ ] Decide final location/integration of paper trading functionality and adjust UI/logic.

---

## **Phase 4: Settings, Long-Term Architecture & Future Features**

**Goal:** Address remaining settings, improve underlying architecture, integrate future data sources, and keep documentation current.

* **Task 4.1 (Task X.3 Deferred): Add UI Settings**
  * [ ] Add settings for Default View & Number of Date Tabs.
* **Task 4.2 (Task 4.4): Centralize Application Configuration**
  * [ ] Implement a more robust configuration system beyond just `.env`.
* **Task 4.3 (Task 4.5): Enhance Historical Price Tracking**
  * [ ] Modify cron job to capture EOD prices for *all currently held* tickers, not just sold ones.
* **Task 4.4 (Future): Integrate Finnhub Data**
  * [ ] Add Finnhub Company Profile/News fetching to backend.
  * [ ] Integrate data into the Manage Position Details modal.
* **Task 4.5 (Future): Integrate Journal Links**
  * [ ] Fetch related journal entries on backend.
  * [ ] Add links/data into the Manage Position Details modal.
* **Task 4.6 (Future): Implement Advanced Charting**
  * [ ] Implement Spark Charts on Dashboard Cards.
  * [ ] Refactor Charts tab for Realized Gains analysis, etc..
* **Task 4.7 (Task X.17 - Ongoing): Maintain Documentation**
  * [ ] Keep Implementation Guide and other documentation updated throughout all phases.

---

## **Phase 5: Implement Authentication**

**Goal:** Secure the application and manage users.

* **Task 5.1:** Implement backend user authentication (e.g., username/password hashing, session management).
* **Task 5.2:** Create frontend login page and integrate the login/logout flow.
* **Task 5.3:** Refine Account Holder Management (logic for deleting primary holder, default reassignment, potential two-step delete process).
