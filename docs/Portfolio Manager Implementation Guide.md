# **Portfolio Manager V3: Comprehensive Implementation Guide**

**Last Updated:** 2025-10-22

This document outlines the current status and future roadmap for the Portfolio Tracker application.

---

## **Completed Phases**

* **Phase 0 - 2:** Foundational Refactoring, Hardening, Intelligent CSV Importer, Strategy & Advice Journal / Dashboard Implementation.

---

## **Phase X: UI Refinements & Fixes (Ongoing / Next Steps)**

### Dashboard Enhancements

* [ ] **Task X.4:** Dashboard Card View - Sales Pop-up: Add an icon/button to open a modal displaying SELL transactions linked to a specific BUY lot. (Requires backend changes).
* [ ] **Task X.5:** Dashboard Card View - Combined Ticker/Exchange Cards & Selective Selling:
    * Refactor Card View to show aggregated Ticker/Exchange summary cards.
    * Implement a new modal for selling specific quantities from selected underlying BUY lots.
    * Adjust backend SELL endpoint if necessary.
* [x] **Task X.6:** Dashboard Table - P/L Tooltip: Add `title` attribute to proximity icons (🔥❄️) explaining their meaning.
* [ ] **Task X.7:** Dashboard Table - Column Alignment: Center-align 'Qty' column; review 'Basis' and 'Current Price'.
* [ ] **Task X.8:** Dashboard Table - Action Button Centering: Fix vertical/horizontal alignment of action buttons within the cell.
* [x] **Task X.9:** Dashboard Table - Shorten Header: Change "Unrealized P/L ($ | %)" to "Unr. P/L ($ | %)".
* [x] **Task X.10:** Dashboard Table - Remove Extraneous Comments: Remove `{/* ... */}` tags from `<tfoot>`.
* [ ] **Task X.11:** Dashboard Table - Implement Header Sorting: Ensure clicking sortable headers works correctly.
* [ ] **Task X.16:** Refactor `_dashboard.js`: Break down `renderDashboardPage` and helpers into smaller functions.

### Settings & Configuration Enhancements

* [ ] **Task X.14:** Settings - Sort Exchanges: Modify dropdown population to sort exchanges alphabetically, keeping "Other" last.
* [ ] **Task X.15:** Settings - Refactor Contact App/Handle:
    * DB Migration: Drop `contact_app`, add `contact_app_type` (TEXT) & `contact_app_handle` (TEXT) to `advice_sources`.
    * Backend: Update `advice_sources.js` routes.
    * Frontend: Replace single input with dropdown (Type) and text input (Handle) in Settings modal.
* [ ] **Task X.3 (Deferred):** Add UI Settings (Batch Update for Default View & Number of Date Tabs).

### General UI/UX

* [x] **Task X.1:** Standardize Modal Button Layouts.
* [x] **Task X.2:** Consolidate and Refactor CSS.
    * [x] Centralize redundant styles for table action cells.
    * [x] Create a dedicated `_sub-tabs.css` and import it.
    * [x] Define common `.filter-bar` styles and apply consistently.
    * [x] Create a generic `.summary-container` style.
    * [x] Review modal button classes (`.modal-actions`, `.modal-actions-right`, `.cancel-btn`, `.delete-btn`).
* [ ] **Task X.12:** New Orders - Persist Fields: Do not reset 'Account Holder' and 'Exchange' selects after logging a transaction.
* [ ] **Task X.13:** General Navigation - Persist Account Holder: Preserve selected account holder when switching main tabs.

### Testing & Hardening

* [ ] **Task 0.5.3:** Verify and Fix Test Suite (Address remaining failures in UI tests).
    * **Known Issue:** `_settings.ui.test.js` suite related to Exchange Management is skipped due to mocking difficulties. Needs revisit.

---

## **Phase 3: Authentication**

**Objective:** Secure the application with a user login system.

* [ ] Implement user authentication and session management.
* [ ] Create a login page and integrate the flow.
* [ ] **Refine Account Holder Management** (Delete primary, default reassignment, two-step delete w/ data removal).

---

## **Phase 4: Future Architectural Improvements**

* [ ] **Task 4.1:** Adopt Unit Testing: Supplement integration tests with unit tests. **(Revisit disabled `_settings.ui.test.js`)**.
* [ ] **Task 4.2:** Implement Robust Backend Validation: Add stricter data validation on API inputs.
* [ ] **Task 4.3:** Centralize Server-Side Error Handling: Create middleware for consistent API error responses.
* [ ] **Task 4.4:** Centralize Application Configuration.
* [ ] **Task 4.5:** Enhance Historical Price Tracking: Modify cron job to capture EOD prices for *all currently held tickers*.

---

## **Phase 5: Source-Centric Management (NEW)**

**Objective:** Create a dedicated section to view and manage information aggregated by Advice Source.

* [ ] **Task 5.1:** Rename/Refocus Existing Tabs: Rename "Journal" to "Paper Trading" or merge into "Watchlist". Create new "Sources" tab.
* [ ] **Task 5.2:** Database Schema Changes:
    * Modify `advice_sources` (Align with Task X.15).
    * Modify `watchlist` (Add `advice_source_id`).
    * Modify `documents` (Add `advice_source_id`, make `journal_entry_id` nullable).
    * **(Optional)** Create `source_notes` table.
* [ ] **Task 5.3:** Backend API Development: New `/api/sources/*` endpoints. Modify existing endpoints as needed.
* [ ] **Task 5.4:** Frontend UI Development: New `_sources.html`, renderers (`_sources.js`), event handlers (`_sources.js`) for dynamic sub-tabs showing source details, notes, documents, watchlist.
* [ ] **Task 5.5:** Integrate Paper Trading (Decision): Decide if "Paper Trading" remains separate or integrates into "Watchlist" / "Sources". Adjust UI/logic.