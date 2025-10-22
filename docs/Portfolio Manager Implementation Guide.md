# **Portfolio Manager V3: Comprehensive Implementation Guide**

**Last Updated:** 2025-10-21

## **Phase 0: Foundational Refactoring & Cleanup (Completed)**

* [x] Code & Documentation Organization
* [x] Application Refactoring
* [x] Configuration & Deployment Updates
* [x] Enhance Testing Strategy (Separate API/UI configs)

---

## **Phase 0.5: Application Hardening (Completed)**

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
* [x] Task 2.3: Journal Page Development (Basic UI & Functionality - now serves as 'Paper Trading' log)
* [x] Task 2.4: Backend Enhancements (Migration `009`, Cron job `runWatcher` logic)
* [x] Task 2.5: Simplify Date Tabs
* [x] Task 2.6: Implement New "Dashboard" Tab (Card/Table Views, Sorting, Filtering, Actions)
* [ ] Task 2.7 (Deferred): Add Spark Charts to Card View
* [ ] Task 2.8 (Deferred): Refactor Historical Data Access & Daily Report View

---

## **Phase X: UI Refinements & Fixes (Ongoing / Next Steps)**

* [ ] Task X.1: Standardize Modal Button Layouts
* [ ] Task X.2: Consolidate and Refactor CSS
  * Centralize redundant styles for table action cells.
  * Create a dedicated `_sub-tabs.css` and import it, removing duplicate styles from modals, journal, and dashboard CSS.
  * Define common `.filter-bar` styles and apply consistently.
  * Create a generic `.summary-container` style for info panels with multiple items.
  * Review all modals to ensure consistent use of `.modal-actions`, `.modal-actions-right`, and `.cancel-btn` classes.
* [ ] Task X.3 (Deferred): Add UI Settings (Batch Update for Default View & Number of Date Tabs)
* [ ] Task X.4: Dashboard Card View - Sales Pop-up: Add an icon/button to the Dashboard card view that, when clicked (potentially only visible if sales exist for the lot), opens a modal displaying details of all SELL transactions associated with that specific BUY lot. Requires backend API changes to provide linked sales data with position fetching.
* [ ] Task X.5: Dashboard Card View - Combined Ticker/Exchange Cards & Selective Selling:
  * **Refactor Card View:** Modify the Dashboard Card View (`renderDashboardPage`, `createCardHTML`) to display a single, aggregated summary card for each unique Ticker/Exchange combination, calculating total quantity, weighted average cost basis, total current value, and total unrealized P/L from all underlying open buy lots.
  * **Implement Selective Sell Modal:** Modify the "Sell" button functionality on the combined card. Clicking it should open a new modal (`_modals.html`, `_modals.js`, `_dashboard.js`) that lists all individual open buy lots for that Ticker/Exchange. The user should be able to select one or more lots and specify the quantity to sell from each, along with the sale price and date.
  * **Backend Adjustment (Potential):** The backend SELL transaction endpoint (`POST /api/transactions`) might need adjustment if a single UI action needs to generate multiple SELL transaction records (one for each parent buy lot involved in the sale). Currently, it expects a single `parent_buy_id`. Alternatively, the frontend could make multiple separate API calls.
* [ ] Task X.6: Dashboard Table - P/L Tooltip: Add a descriptive `title` attribute to the proximity icons (🔥❄️) in the "Unrealized P/L ($ | %)" column to explain their meaning (e.g., "Nearing Take Profit Limit"). Requires careful modification of `createTableRowHTML` in `_dashboard.js`.
* [ ] Task X.7: Dashboard Table - Column Alignment: Center-align the 'Qty' column header and cells. Review if 'Basis' and 'Current Price' should also be centered or remain right-aligned. Requires careful CSS updates in `_dashboard.css`, potentially overriding general `.numeric` styles specifically for this table.
* [ ] Task X.8: Dashboard Table - Action Button Centering: Fix the alignment of action buttons within the `.actions-cell`. Ensure they are vertically and horizontally centered and do not overflow the cell boundaries. Requires careful CSS updates in `_dashboard.css`, likely using flexbox.
* [ ] **Task X.9:** Dashboard Table - Shorten Header: Change the header "Unrealized P/L ($ | %)" to "Unr. P/L ($ | %)" in `_dashboard.html`.
* [ ] **Task X.10:** Dashboard Table - Remove Extraneous Comments: Remove leftover HTML comment tags (`{/* ... */}`) from the `<tfoot>` section in `_dashboard.html`.
* [ ] **Task X.11:** Dashboard Table - Implement Header Sorting: Ensure clicking on column headers with `data-sort` attributes in the `#open-positions-table` correctly sorts the table rows. Add or fix the necessary event listener in `_dashboard.js` (potentially leveraging the `sortTableByColumn` helper).
* [ ] **Task X.12:** New Orders - Persist Fields: Modify the 'Log Transaction' form submission handler in `_orders.js` to *not* reset the 'Account Holder' and 'Exchange' select elements after a successful submission.
* [ ] **Task X.13:** General Navigation - Persist Account Holder: Modify the `switchView` function in `_navigation.js` to preserve the `state.selectedAccountHolderId` when switching between main tabs. The global dropdown should still be the primary way to change the selected holder.
* [ ] **Task X.14:** Settings - Sort Exchanges: Modify `populateAllExchangeDropdowns` in `_settings_exchanges.js` to sort the list alphabetically but ensure "Other" always appears last.
* [ ] **Task X.15:** Settings - Refactor Contact App/Handle:
  * **DB Migration:** Create a migration to drop the `contact_app` column from `advice_sources` and add two new columns: `contact_app_type` (TEXT) and `contact_app_handle` (TEXT).
  * **Backend:** Update the `advice_sources.js` routes (POST, PUT) to handle these new fields.
  * **Frontend:** Update the Settings modal (`_modals.html`), advice source renderer (`journal-settings.js`), and event handlers (`_journal_settings.js`) to replace the single text input with a dropdown for `contact_app_type` (populated with defaults: Messages(IOS), WhatsApp, Telegram, Signal, email, Messenger) and a text input for `contact_app_handle`.

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
* [ ] **Task 4.4: Centralize Application Configuration**
* [ ] **Task 4.5: Enhance Historical Price Tracking:** Modify the backend cron job (`captureEodPrices` in `services/cronJobs.js`) to capture and store daily end-of-day closing prices in the `historical_prices` table for *all currently held tickers*, not just those that were fully sold on a given day. This will build a more reliable and comprehensive price history for charting and analysis.

---

## **Phase 5: Source-Centric Management (NEW)**

**Objective:** Create a dedicated section to view and manage information aggregated by Advice Source.

* **Task 5.1: Rename/Refocus Existing Tabs:**
  * Rename the current "Journal" main tab to "Paper Trading" (or similar) or consider merging its functionality into the "Watchlist" tab. Update `_tabs.js`.
  * Create a new main tab entry for "Sources" in `_tabs.js`.
* **Task 5.2: Database Schema Changes:**
  * Modify `advice_sources`: Split `contact_app` into `contact_app_type` and `contact_app_handle` (aligns with Task X.15).
  * Modify `watchlist`: Add `advice_source_id` (INTEGER, FOREIGN KEY referencing `advice_sources.id` ON DELETE SET NULL).
  * Modify `documents`: Add `advice_source_id` (INTEGER, FOREIGN KEY referencing `advice_sources.id` ON DELETE CASCADE). Allow `journal_entry_id` to be NULLABLE. Add constraint `CHECK (journal_entry_id IS NOT NULL OR advice_source_id IS NOT NULL)`.
  * **(Optional)** Create `source_notes` table (id, advice\_source\_id, note\_content, created\_at, updated\_at).
* **Task 5.3: Backend API Development:**
  * Create new API endpoints under a `/api/sources` route (e.g., `/api/sources/:id/details`, `/api/sources/:id/notes`, `/api/sources/:id/documents`, `/api/sources/:id/watchlist`).
  * Modify existing endpoints (`/api/watchlist`, `/api/documents`) if needed to handle `advice_source_id`.
* **Task 5.4: Frontend UI Development:**
  * Create new HTML template (`_sources.html`) for the "Sources" page container.
  * Implement dynamic sub-tab generation based on fetched `advice_sources`.
  * Create renderers (`_sources.js`) for displaying source details, notes, documents, and the source-specific watchlist within the active sub-tab panel.
  * Implement event handlers (`_sources.js`) for adding/editing source notes, managing documents linked to the source, adding/removing items from the source-specific watchlist, and potentially triggering communication apps.
* **Task 5.5: Integrate Paper Trading (Decision):** Decide if the current "Journal" functionality (logging paper trades) remains a separate tab ("Paper Trading") or gets integrated as a feature within the "Watchlist" or individual "Source" views. Adjust UI and logic accordingly.
