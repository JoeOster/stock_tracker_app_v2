# Portfolio Manager V3 - Active Roadmap

**Last Updated:** 2025-11-01

This document outlines the remaining active tasks for the Portfolio Tracker application, organized into a logical development pathway.

---

## **Phase 1: Backend & Architectural Enhancements**

**Goal:** Improve data collection, stability, and maintainability before building new UI features.

* **Task 1.1: Enhance Historical Price Tracking**
    * [ ] Modify the `captureEodPrices` cron job in `services/cronJobs.js` to capture EOD prices for *all currently held* tickers (`transaction_type = 'BUY'` and `quantity_remaining > 0`), not just recently sold ones.
* **Task 1.2: Implement Robust Backend Validation & Refactoring**
    * [ ] Review all backend API routes (`routes/` directory) and add stricter validation for incoming request bodies and URL parameters (e.g., check for non-empty strings, valid numbers, correct data types).
    * [ ] **Refactor for Reusability:**
        * [ ] Merge duplicate endpoints in `routes/reporting.js` (e.g., `realized_pl/summary`) into a single endpoint that uses an optional date range.
        * [ ] Break down large, complex route handlers (like `GET /api/sources/:id/details`) into smaller, reusable helper functions (similar to the `transaction-*-logic.js` pattern).
* **Task 1.3: Centralize Backend Error Handling**
    * [ ] Create Express middleware to catch errors and send consistent JSON error responses from the API (e.g., `{ "message": "Error details" }`).
* **Task 1.4: Centralize Application Configuration**
    * [ ] Implement a more robust configuration system beyond just `.env` for non-secret settings (e.g., a `config.js` file).
* **Task 1.5: Revisit & Expand Testing**
    * [ ] Investigate and fix the skipped UI tests in `_settings.ui.test.js`.
    * [ ] Add further unit tests where practical (e.g., for `importer-helpers.js`).

---

## **Phase 2: Position Management & UX Refinements**

**Goal:** Build the new "Manage Position" page (as decided in UX.4) and address all remaining UI/UX tasks.

* **Task 2.1: Integrate Finnhub Data (Company & News)**
    * [ ] **One-Time Fetch:** When a ticker is first added (e.g., to watchlist or a position), create a backend job to fetch and store static data from Finnhub's `/stock/profile2` endpoint (Company Name, Logo, Industry, Website).
    * [ ] **Daily Fetch (EOD/BOD):** Create a new cron job to run End-of-Day or Before-Open-Day that:
        * Fetches `/company-news` for all currently held and watched tickers.
        * Fetches `/stock/metric` for basic financials (P/E, EPS, 52-week high/low, dividend yield).
        * Fetches `/recommendation` for analyst price targets.
* **Task 2.2: Implement "Manage Position" Page**
    * [ ] Create a new page template (e.g., `_position_details.html`) to serve as a dedicated view for a single position.
    * [ ] Update the "Manage" button on dashboard cards to navigate to this new view (e.g., `switchView('position', { ticker: 'AAPL' })`).
    * [ ] **UI Integration:** On this new page, render:
        * A header with ticker/exchange info and the company data from **Task 2.1**.
        * A list of individual open lots.
        * The combined sales history (using the completed batch sales API endpoint).
        * A section/tab for Company News (from **Task 2.1**).
        * A section/tab for Financials/Metrics (from **Task 2.1**).
    * [ ] Add event listeners for per-lot "Edit" / "Limits" buttons.
* **Task 2.3: Integrate Journal Links**
    * [ ] Fetch related journal entries on the backend.
    * [ ] Add links/data into the new "Manage Position" page.
* **Task 2.4: Implement Advanced Charting**
    * [ ] Implement Spark Charts on Dashboard Cards.
    * [ ] (Future) Refactor/re-introduce a Charts tab for Realized Gains analysis, etc.
* **Task 2.5: Loading States & Feedback**
    * [ ] Review loading feedback (tab switching, price refresh, CSV commit).
    * [ ] Add spinners or disable buttons during processing where needed.
* **Task 2.6: Importer Workflow Clarity**
    * [ ] Add more descriptive text/visual cues during reconciliation.
    * [ ] Enhance alert messages for skipped imports to include CSV row details.
    * [ ] Implement detection for uploading a seemingly identical CSV file.
* **Task 2.7: Add UI Settings**
    * [ ] Add settings for "Default View" (e.g., Dashboard, Sources) to `public/templates/_modal_settings.html`.
    * [ ] Add setting for "Number of Date Tabs" to `public/templates/_modal_settings.html`.
    * [ ] Update `app-main.js` and `_tabs.js` to use these new settings from `state.settings`.
* **Task 2.8: Review Data Collection**
    * [ ] After **Task 2.1** is implemented, review the newly collected data (News, Metrics, Profile).
    * [ ] Determine if all data points are useful and should be added to the "Manage Position" page UI, or if collection for some unused fields should be stopped.
* **Task 2.9: Enhance Dashboard Filtering**
    * [x] Add an "Exchange" dropdown to the Dashboard filter bar, next to the Ticker filter.
    * [x] Update the `processFilterAndSortLots` function in `_dashboard_data.js` to filter by both ticker and the selected exchange.

---

## **Phase 3: Authentication & Documentation**

**Goal:** Secure the application and finalize all documentation.

* **Task 3.1:** Implement backend user authentication (e.g., username/password hashing, session management).
* **Task 3.2:** Create frontend login page and integrate the login/logout flow.
* **Task 3.3:** Refine Account Holder Management (logic for deleting primary holder, default reassignment, etc.).
* **Task 3.4:** Maintain Documentation (keep all guides updated as these phases are completed).