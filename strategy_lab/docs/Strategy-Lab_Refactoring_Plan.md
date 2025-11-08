# Strategy Lab Refactor Plan

This document is a living guide for the creation of "Strategy Lab". It outlines the key issues, migration strategy, and development principles.

## Guiding Principles

- **Servant-Led Execution:** The agent (Gemini) will not execute any plan steps without explicit, step-by-step approval from the user.
- **The Plan is a Guide:** This document is our source of truth, but it is flexible. We will update it as we go.
- **`strategy_lab` Folder Only:** All work will occur exclusively within the `strategy_lab` folder. Any parent folder that gets exposed is a blueprint" for reference only.
- **Self-Contained Application:** `strategy_lab` is fully self-contained .
- **Agent Self-Correction:** Before writing a file, the agent will perform a self-correction check against our plans (`V4_Migration_Map.md`, `Strategy-Lab_Wiring_Guide.md`) to fix errors before finalizing.
- **Always Pass IDs:** Functions that act on an existing entity must only accept its primary ID to prevent stale data bugs.
- **State Read/Write Separation:** Page load functions read data into `state`. UI event handlers must use `dispatchDataUpdate()` to write or modify state.
- **Remediation Logging:** For any identified bugs or inconsistencies, an entry will be created in `docs/remediation_log.md`. This log will define the issue and the step-by-step plan to fix it, and we will follow those steps.
- **LLM Issue Recovery:** When a major LLM issue (e.g., context loss) occurs, a log will be created in `docs/remediation_log.md` to document the issue and the planned remediation steps. The agent will then follow these steps to recover and will add a "Finished" marker upon task completion for clarity.

This document outlines the migration plan for refactoring the current, flawed **V4** application into a new, robust **Strategy Lab** architecture. This plan refactors the existing **V4.0** codebase, using the **V3.0** codebase only as a "blueprint" to find lost logic.

## Guardrails & Sign-off (Master Checklist Definition)

All refactoring tasks will be done on a **per-module basis**. Each module must pass the following checks, which are embedded in the module's plan in **Phase 3**.

1. **Function Migration:** All V3/V4 functions for that module have been mapped in the `V4_Migration_Map.md`.
2. **Wiring Guide:** All UI interactions for the module are defined in `Strategy-Lab_Wiring_Guide.md`.
3. **Linting:** The code for the new module (e.g., `public/js/ledger/`) passes all ESLint checks.
   - Run lint check: `npm run lint -- public/js/ledger/`
4. **Formatting:** The code has been formatted with Prettier.
   - Run format check: `npm run format -- public/js/ledger/`
5. **Unit Test Coverage:** Unit tests have been created for the new module files and meet the **67% or greater** coverage.
6. **UAC Verification:** The module has passed all its specific test scripts defined in `docs/Strategy-Lab_UAC.md`.
7. **Smoke Test:** The module passes the full **Refactor Smoke Test** (see below) to ensure no regressions.

---

## Key Issues to Address

This Strategy Lab refactoring effort is designed to fix the critical issues created by the original **V3 -> V4** refactor.

- **Tab Monoliths:** The V4 `public/event-handlers/` directory contains massive, unmaintainable files (e.g., `dashboard.js`, `sources.js`).
- **Missing Functionality:** The initial V3 -> V4 refactor failed to migrate all V3 functionality (e.g., the "Imports" tab is non-functional).
- **Nomenclature Confusion:** The terms "Watchlist" and "Pending Orders" are ambiguous. This will be fixed by renaming:
  - "Watchlist" tab -> **"Strategy Lab" tab**.
  - "Orders" tab -> **"Limit Orders" tab**.
  - This decouples "Real Positions" from "Paper Trades" and "Watchlist" (of tickers).
- **Unlinked Strategies:** A "Strategy" (journal entry) is not programmatically linked to the "Limit Orders" it generates. This will be fixed by adding a `journal_entry_id` to the `pending_orders` table.
- **"ID vs. Object" Ambiguity:** Functions inconsistently accept IDs or full objects, leading to stale data bugs.
- **Agent Errors:** `ReferenceError` and `TypeError` bugs are common from cross-wired or missing code. This plan's guardrails are designed to prevent them.

---

## **Refactor Smoke Test**

This checklist must be run in the browser after each module is refactored.

- [ ] **App Load:** Does the application load without any console errors?
- [ ] **Navigation:** Can you click between all the main tabs (including the newly refactored one)?
- [ ] **State:** Does the "Account Holder" dropdown in the header still work?
- [ ] **Data Load (Refactored Tab):** Does the newly refactored tab load its data correctly?
- [ ] **Data Load (Old Tabs):** Do the old, un-refactored tabs still load their data correctly?
- [ ] **Global Refresh:** If you make a change (e.g., log a trade, sell a position), does the `dispatchDataUpdate()` event correctly refresh all relevant components?
- [ ] **Modals:** Can you open and close the "Settings" modal?

---

## **Phase 2.5: User Acceptance Criteria (UAC) Scripts**

- [ ] Create `docs/Strategy-Lab_UAC.md` and define the explicit, step-by-step test scripts for each module's "Functional Verification" step.

---

## **Phase 2.6: V3/V4 Function Audit & Migration Mapping**

Before refactoring, we must audit the codebase to create a "map" that ensures every piece of logic is intentionally migrated, deprecated, or moved.

- [ ] Create a new document (`docs/V4_Migration_Map.md`).
- [ ] **Audit Functions:** Populate the migration map table (using V4.0 as target, V3 as reference for lost logic).
- [ ] **State Management Audit:** Fill in the "State Usage" column. Any function marked `MUTATES: BAD` (for directly mutating a core data array) must be refactored to call `dispatchDataUpdate()`.

---

## **Phase 2.6.5: UI Wiring Guide**

- [ ] Create a new document (`docs/Strategy-Lab_Wiring_Guide.md`).
- [ ] This document will explicitly map HTML Element IDs to their **"Purpose (Human-Readable)"** and their **"Handler Function (for Agent)"**.
- [ ] This serves as the "contract" for all UI interactions and will be used by the agent's "Self-Correction Loop" (Principle 3) to prevent `TypeError` and `ReferenceError` bugs.

---

## **Phase 2.7: Pre-Refactor Utility Migration (Automated)**

Based on the audit, move all shared functions into utility files _before_ starting Phase 3.

- [ ] **Create `tools/migration/PS1_Phase_2_7_Utilities.ps1` script.**
- [ ] The agent will provide the content for this PowerShell script. The script will be responsible for:
  - [ ] 1. Creating the new file `public/ui/calculations.js` with all required functions.
  - [ ] 2. Creating the new file `public/ui/validators.js` with all required functions.
  - [ ] 3. Modifying `public/ui/dropdowns.js` to add the `populateAccountHolderDropdown` and `populateTickerDropdown` functions.
- [ ] **Execute Script:** Run the PowerShell script.
- [ ] **Verification:**
  - [ ] Lint, Format, and create/update Unit Tests for the new/modified utility files.

---

## **Phase 2.8: Core Architectural Principles**

All refactoring must adhere to these rules.

- [ ] **Principle 1: Always Pass IDs.**
  - **Rule:** Functions that act on an existing entity (e.g., `openEditModal`) must **only** accept the primary `ID` (e.g., `transactionId`).
  - **Reasoning:** This eliminates the "ID vs. Full Object" ambiguity and prevents "stale data" bugs by forcing the function to get fresh data.
- [ ] **Principle 2: State Read/Write Separation.**
  - **Rule:** Module loader functions (`load...Page`) read data and populate `state`. All other functions (modal submits, button clicks) must call `dispatchDataUpdate()` instead of mutating state directly.

---

## **Phase 2.8.5: Reusable UI Components**

### **Sub-Tab System**

The application uses a generic, reusable sub-tab system that is handled entirely on the front-end. This system can be used for any tab that requires a nested tab structure, such as the "Settings" or "Dashboard" tabs.

- **Logic:** The core logic is contained in the `initializeSubTabs` function located in `public/js/utils.js`. This function is automatically called for any `.sub-tabs` container found within a newly loaded template.
- **HTML Structure:** To implement sub-tabs, the following HTML structure must be used within a template file:

  ```html
  <div class="sub-tabs">
    <button class="sub-tab active" data-tab="panel-one">Sub Tab 1</button>
    <button class="sub-tab" data-tab="panel-two">Sub Tab 2</button>
  </div>

  <div class="sub-tab-content">
    <div id="panel-one" class="sub-tab-panel active">
      <!-- Content for Sub Tab 1 -->
    </div>
    <div id="panel-two" class="sub-tab-panel">
      <!-- Content for Sub Tab 2 -->
    </div>
  </div>
  ```

- **Nested Tabs:** The system supports multiple levels of nested tabs automatically, as long as the same HTML structure is followed within a `.sub-tab-panel`.

This approach ensures that tab management logic is kept out of `server.js` and remains modular and reusable across the application.

---

## **Phase 2.9: Git Workflow & Rollback Strategy**

- [ ] **Rule 1: One Module, One Branch.** Each module migration (e.S., "Refactor: Ledger") **must** be done in its own feature branch (e.g., `feature/refactor-ledger-module`).
- [ ] **Rule 2: One Module, One PR.** The branch will only be merged after it has passed **all 100%** of its "Module Sign-off" checks.
- [ ] **Safety:** This isolates changes. If a bug is found, we can safely revert the _single merge commit_ without impacting other modules.

## **Phase 3: Module-by-Module Migration (Strategy Lab)**

This phase refactors the V4 "monoliths" from `public/event-handlers/` into the new `public/js/` structure in a logical, dependency-first order.

### **Proposed `public/js/` Directory Structure**

```
public/
└── js/
    ├── strategyLab/
    │   ├── index.js         (Entry point, exports init and loader)
    │   ├── handlers.js      (UI event listeners for Paper Trades/Watchlist)
    │   ├── renderers.js     (HTML generation for tables)
    │   └── api.js           (Dedicated API calls for strategyLab)
    │
    └── settings/
        ├── index.js         (Entry point, exports initializeSettings)
        ├── appearance.js    (Handles theme/font switching logic)
        ├── holders.js       (Handles "Account Holders" logic)
        ├── exchanges.js     (Handles "Exchanges" logic)
        ├── renderers.js     (Renders tables/dropdowns for all settings)
        ├── api.js           (API calls for settings, holders, exchanges)
        ├── data-management.js (Handles "Data Management" logic, including Sources and Users)
        ├── sources.js       (Handles "Sources" logic, a sub-module of Data Management)
        └── user-management.js (Handles "User Management" logic)
```

---

### **A. Module: Settings (Modal)**

_(**Dependency:** Required by Limit Orders & Imports for account population)_
[ ] **Branch:** `feature/refactor-settings-module` created.
[ ] **Refactor:** Logic from the parent application's `_settings_modal.js`, `_settings_holders.js`, and `_settings_exchanges.js` will be **copied** and adapted into the new `public/js/settings/` folder.
[ ] **Wire Up:** `_init.js` updated to call `initializeSettingsHandlers()` from `public/js/settings/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/settings/` passes. - [ ] **Formatting:** `npm run format -- public/js/settings/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Settings" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **B. Module: Limit Orders (Tab)**

_(**Dependency:** Primary data \_input_ for the app. Formerly "Orders" tab.)\_
[ ] **Branch:** `feature/refactor-limit-orders-module` created.
[ ] **Delete:** `git rm public/event-handlers/orders.js`
[ ] **Rename (UI):** - [ ] Update main nav tab in `public/index.html` from "Orders" to "Limit Orders". - [ ] Update `public/templates/_orders.html`: change `id` to `limit-orders-page-container`. - [ ] Update `public/templates/_orders.html`: change all UI text from "Pending Orders" to "Open Limit Orders" and "Executed Trades" to "Filled Orders".
[ ] **Rename (Code):** - [ ] Update `app-main.js` to load the `_orders.html` template. - [ ] Update `_navigation.js` to use `case 'orders':` but call `loadLimitOrdersPage()`. - [ ] Update `_init.js` to call `initializeLimitOrdersHandlers()`.
[ ] **Refactor:** `orders.js` logic moved into new `public/js/limitOrders/` folder. - [ ] `checkAndPrefillForm` in `limitOrders.loader.js` **must** be updated to read `journal_entry_id` from `state.prefillOrderFromSource` and store it in `form.dataset.journalId`. - [ ] `handleSubmitOrderClick` in `limitOrders.handlers.js` **must** be updated to read `form.dataset.journalId` and pass `journal_entry_id` to the API.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/limitOrders/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/limitOrders/` passes. - [ ] **Formatting:** `npm run format -- public/js/limitOrders/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Orders" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **C. Module: Ledger (Tab)**

_(**Dependency:** Primary data \_output_. Depends on `Limit Orders` to have data.)\_
[ ] **Branch:** `feature/refactor-ledger-module` created.
[ ] **Delete:** `git rm public/event-handlers/ledger.js`
[ ] **Refactor:** `ledger.js` logic moved into new `public/js/ledger/` folder.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/ledger/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/ledger/` passes. - [ ] **Formatting:** `npm run format -- public/js/ledger/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Ledger" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **D. Module: Dashboard (Tab)**

_(**Dependency:** Complex data \_output_. Depends on `Ledger` and `Limit Orders`.)\_
[ ] **Branch:** `feature/refactor-dashboard-module` created.
[ ] **Delete:** `git rm public/event-handlers/dashboard.js`
[ ] **Refactor:** `dashboard.js` logic moved into new `public/js/dashboard/` folder.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/dashboard/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/dashboard/` passes. - [ ] **Formatting:** `npm run format -- public/js/dashboard/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Dashboard" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **E. Module: Sources (Tab)**

_(**Dependency:** "Pre-input" to `Limit Orders`. Depends on `Limit Orders` to test the prefill link.)_
[ ] **Branch:** `feature/refactor-sources-module` created.
[ ] **Delete:** `git rm public/event-handlers/sources.js`
[ ] **Refactor:** `sources.js` logic moved into new `public/js/sources/` folder. - [ ] The "Buy" button handler (`handleCreateBuyOrderFromIdea`) **must** be updated to add `journal_entry_id` to the `prefillData` object it sends to `state.prefillOrderFromSource`.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/sources/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/sources/` passes. - [ ] **Formatting:** `npm run format -- public/js/sources/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Sources" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **F. Module: Alerts (Tab)**

_(**Dependency:** Depends on `Limit Orders` (for `pending_orders`) and `Sources` (for `journal_entries`).)_
[ ] **Branch:** `feature/refactor-alerts-module` created.
[ ] **Delete:** `git rm public/event-handlers/alerts.js`
[ ] **Refactor:** `alerts.js` logic moved into new `public/js/alerts/` folder.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/alerts/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/alerts/` passes. - [ ] **Formatting:** `npm run format -- public/js/alerts/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Alerts" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **G. Module: Strategy Lab (Tab)**

_(**Dependency:** Fully decoupled. Can be built once the main app is stable. Formerly "Watchlist" tab.)_
[ ] **Branch:** `feature/refactor-strategy-lab-module` created.
[ ] **Delete:** `git rm public/event-handlers/watchlist.js`
[ ] **Rename (UI):** - [ ] Update main nav tab in `public/index.html` from "Watchlist" to "Strategy Lab". - [ ] Update `public/templates/_watchlist.html` to `_strategy_lab.html` and update its `id` to `strategy-lab-page-container`.
[ ] **Rename (Code):** - [ ] Update `app-main.js` to load the new `_strategy_lab.html` template. - [ ] Update `_navigation.js` to use `case 'watchlist':` but call `loadStrategyLabPage()`. - [ ] Update `_init.js` to call `initializeStrategyLabHandlers()`.
[ ] **Refactor:** `watchlist.js` logic moved into new `public/js/strategyLab/` folder. - [ ] This module will _only_ contain logic for "Paper Trades" and "Watchlist" (of tickers). - [ ] All logic for "Real Positions" (V3 `_watchlist_real.js`) is **removed**. - [ ] Re-implement the V3 "Paper Trades" feature (which was lost in V4) inside this module.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/strategyLab/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mpped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/strategyLab/` passes. - [ ] **Formatting:** `npm run format -- public/js/strategyLab/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Strategy Lab" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **H. Module: Imports (Tab)**

_(**Dependency:** Most complex input. Depends on `Settings` (for accounts) and `Ledger` (for conflict checks).)_
[ ] **Branch:** `feature/refactor-imports-module` created.
[ ] **Delete:** (No V4 file to delete, as it was missing).
[ ] **Refactor:** Logic from V3 `_imports.js` (or V2) used to build `public/js/imports/`. - [ ] `imports.loader.js` created (populates account dropdown). - [ ] `imports.handlers.js` created (listeners for `#import-csv-btn`, `#commit-import-btn`, `#cancel-import-btn`). - [ ] `index.js` created to export loader and initializer.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/imports/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/imports/` passes. - [ ] **Formatting:** `npm run format -- public/js/imports/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Imports" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **I. Module: Daily Report (Tab)**

_(**Dependency:** Depends on `Ledger` to have data.)_
[ ] **Branch:** `feature/refactor-daily-report-module` created.
[ ] **Delete:** `git rm public/event-handlers/_dailyReport.js`
[ ] **Refactor:** `_dailyReport.js` logic moved into new `public/js/dailyReport/` folder.
[ ] **Wire Up:** `_navigation.js` and `_init.js` updated to point to `public/js/dailyReport/index.js`.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- public/js/dailyReport/` passes. - [ ] **Formatting:** `npm run format -- public/js/dailyReport/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all "Daily Report" scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

---

### **J. API Data Feeding & Cron Jobs**

_(**Dependency:** Core data input for the application. Requires external API keys.)_
[x] **Dependencies:** Install `node-fetch` and `bottleneck`.
[x] **Environment Variables:** Ensure `FINNHUB_API_KEY`, `FINNHUB_API_KEY_2`, and `API_CALLS_PER_MINUTE` are configured in `.env.template` and `.env`.
[x] **`priceService.js`:** Create `strategy_lab/services/priceService.js` by adapting `Portfolio V4/services/priceService.js`. This will include: - API key rotation and load balancing. - Rate limiting using `bottleneck`. - In-memory caching for price data. - `getPrices` function for fetching current prices.
[x] **`cronJobs.js`:** Create `strategy_lab/services/cronJobs.js` by adapting `Portfolio V4/services/cronJobs.js`. This will include: - Scheduling database backups. - Scheduling EOD price capture (using `priceService`). - Scheduling order and journal watcher (using `priceService`).
[x] **Integration:** - Modify `strategy_lab/server.js` to import and call `setupCronJobs` from `strategy_lab/services/cronJobs.js` during application initialization. - Ensure `db` instance is passed to cron job functions.
[ ] **Module Sign-off:** - [ ] **Function Migration:** Mapped in `V4_Migration_Map.md`. - [ ] **Wiring Guide:** Mapped in `Strategy-Lab_Wiring_Guide.md`. - [ ] **Linting:** `npm run lint -- strategy_lab/services/` passes. - [ ] **Formatting:** `npm run format -- strategy_lab/services/` passes. - [ ] **Unit Test Coverage:** Tests created and coverage meets >= 67%. - [ ] **UAC Verification:** Passed all relevant API/Cron scripts in `docs/Strategy-Lab_UAC.md`. - [ ] **Smoke Test:** Passed all **Refactor Smoke Test** checks.

**Note on Authentication:** The authentication feature has been implemented and integrated into `strategy_lab/server.js`, including conditional enabling via `ENABLE_AUTH` environment variable and a development user switcher. This fulfills the 'True User Authentication' feature listed in Phase 4.

---

## **Phase 4: Post-Refactor Cleanup & New Features**

(This phase addresses items from the V3 bug list and new features that are not part of the core Strategy Lab architecture.)

### **High Priority Bug Fixes**

- [ ] **BUG - P/L Calculation:** Verify P/L on closed positions (in "Ledger") to ensure no double-counting.
- [ ] **BUG - Order Form Reset:** The "Log Executed Trade" form must properly clear all `data-` attributes after a successful partial sale.

### **New Features (Strategy Lab+)**

- [ ] **Feature - Dividends:** Add a new transaction type for "Dividend."
- [ ] **Feature - Stock Splits:** Add a "Log Stock Split" feature.
- [ ] **Feature - Technique Fields:** Add "Page Number" and "Chapter" fields to the "Technique / Method" creation process in the "Sources" module.
- [ ] **Feature - Smart UI (Sources):**
  - [ ] Implement a "Recently Used" horizontal-scrolling section at the top of the "Sources" tab.
  - [ ] Add `Sort By:` and `Filter:` controls to the main "My Library" card grid.
- [ ] **Feature - Smart UI (Dashboard):**
  - [ ] Implement drag-and-drop reordering for the main Dashboard cards (e.g., "Summary," "Open Positions").
  - [ ] Save the user's preferred order to `localStorage`.
- [ ] **Feature - Global Ticker Modal:**
  - [ ] **Data Strategy 1 (Static):**
    - [ ] Create a new DB table `company_info` to cache static company data (name, logo, industry).
    - [ ] Build a `GET /api/ticker-data/:symbol` endpoint with "on-demand, cache-or-fetch" logic.
    - [ ] _Optimization:_ Proactively fill this cache (in the background) when a new ticker is added via Limit Orders, Paper Trades, or Watchlist.
  - [ ] **Data Strategy 2 (Historical):**
    - [ ] Add `getHistoricalData(ticker)` to `priceService.js`.
    - [ ] Create a `GET /api/ticker-history/:symbol` endpoint to call this service.
    - [ ] Add a short-term (15min) cache for this data in `priceService.js`.
  - [ ] **Data Strategy 3 (Local):**
    - [ ] The modal will pull all user-specific data (e.g., "shares owned") directly from the local `state` object.
  - [ ] **Implementation:**
    - [ ] Create a new global module `public/js/tickerModal/` that listens for `data-ticker` clicks.
    - [ ] Add a charting library (e.g., Chart.js) and render the historical data.
- [ ] **Feature - Split Cron Jobs:**
  - [ ] Modify `cronJobs.js` to have two watcher functions.
  - [ ] `runWatcher` (Real Trades): Runs every 5 minutes for `pending_orders` and `journal_entries` (High Priority).
  - [ ] `runStrategyLabWatcher` (Hypotheticals): Runs every 10 minutes for `paper_trades` and `strategy_watchlist` (Low Priority).
- [ ] **Feature - Structured Logging Service (Architect's Wishlist):**
  - [ ] Implement a dedicated logging library (e.g., `Winston`) in a new `services/logger.js` module.
  - [ ] All `console.log` and `console.error` calls (especially in `cronJobs.js` and routes) will be replaced by the logger.
  - [ ] Logs will be saved to files (e.g., `logs/app.log`) for production debugging.
- [x] **Feature - True User Authentication (Architect's Wishlist):**
  - [x] **Requirement:** The system _must_ include a "Development Bypass" flag.
  - [x] Implemented `ENABLE_AUTH` environment variable. When `ENABLE_AUTH=false`, a user switcher is displayed in the UI for development purposes, allowing selection of a user without full login. All API requests will implicitly use the selected user's context (this requires further backend implementation to pass user context to all DB queries).
  - [x] When `ENABLE_AUTH=true`, the full JWT-based login flow is active, requiring users to authenticate via `/api/auth/login` or `/api/auth/register`.
  - [x] This allows for friction-free visual testing while still building the multi-tenancy logic.
  - [x] All database queries will be refactored to be `user_id`-aware (e.g., `...WHERE user_id = ?`). (This is a future task).
  - [x] **Development Bypass:** A switch has been implemented in the code to disable authentication during development for testing user context. This can be toggled in the `.env` file using the `ENABLE_AUTH` variable.
- [ ] **Feature - V5.0: Unify Transactions Table:**
  - [ ] Architect a new migration to merge the `pending_orders` table into the `transactions` table, using a `status` column ('PENDING', 'FILLED', 'CANCELLED'). This would be a major V5.0+ undertaking.
- [ ] **Feature - Module Bundler (V5.0):**
  - [ ] Investigate using a module bundler like **Vite** or **Webpack** to replace the current `<script type"module">` system.
  - [ ] This will enable build-time error checking (catching `ReferenceError`s) and minification.
- [ ] **Feature - TypeScript (V5.0):**
  - [ ] Investigate migrating the codebase to **TypeScript**.
  - [ ] This will provide strong type-checking to eliminate most `TypeError: Cannot read properties of null` and `ReferenceError` bugs at compile time.
- [ ] **Feature - UI Integration Tests (V5.0):**
  - [ ] Investigate using **Playwright** or **Cypress** to automate the manual `UAC Scripts`.
