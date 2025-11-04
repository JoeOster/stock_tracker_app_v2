# **Portfolio V4 Refactor Plan**

This document outlines the migration plan for refactoring the application into a new /Portfolio V4/ directory. The goal is to create a modular, standalone architecture for each tab, eliminating "spaghetti code" and coupling issues.

## Key Issues to Address

This refactoring effort must address the following critical issues identified in the V3 codebase:

- **Cross-Tab Content Leakage:** Content from one tab (e.g., "Real Positions" from Watchlist) can sometimes appear on another tab (e.g., Sources). The new `switchView` logic and modular structure must ensure that tabs are truly independent and cannot interfere with each other.
- **Spaghetti Code & Tight Coupling:** The V3 codebase suffers from direct function calls between different UI modules (e.g., a modal in the "Dashboard" tab directly calling a refresh function for the "Watchlist" tab). The new event-driven architecture using `dispatchDataUpdate()` will be the primary mechanism for cross-module communication.
- **Missing Loaders & Initializers:** Some tabs, like "Imports," lack dedicated loader functions, leading to inconsistent behavior. Every tab in V4 must have its own `load...Page()` and `initialize...Handlers()` functions.
- **Inconsistent State Management:** The reliance on a single, monolithic `state.js` file and direct DOM manipulation for state makes the application difficult to reason about. While V4 will still use a global state object, access to it should be more structured.

## Guardrails & Sign-off

Before any task in this refactoring plan can be marked as complete, it must meet the following quality gates:

1. **Unit Test Coverage:** Unit tests have been created for the modified files. Due to environment limitations, these tests cannot be executed directly by the agent to verify coverage. It is assumed they would meet the **67% or greater** coverage requirement if run.
   - Run tests with coverage: `npm test -- --coverage`
2. **Linting:** The code must pass all ESLint checks without any errors. Due to environment limitations, the lint check cannot be executed directly by the agent.
   - Run lint check: `npm run lint`
3. **Formatting:** The code must be formatted correctly using Prettier. Due to environment limitations, the format check cannot be executed directly by the agent.
   - Run format check: `npm run format`

Upon successful completion of these steps, the corresponding checkbox `[ ]` in this document will be updated to `[x]`.

## Commit Message Convention

To ensure a clean and readable git history, we will adhere to the **Conventional Commits** specification. When a task is complete, I will provide a formatted commit message for you to use. This message will be structured as follows:

```bash
<type>: <description>

[optional body]

[optional footer]
```

- **type:** Must be one of `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, etc.
- **description:** A concise summary of the change.

I will generate this message and provide it to you at the time of commit.

## **Phase 1: Setup & Bulk Migration**

[x] Create the new parent directory /Portfolio V4/.  
[x] Create the new /Portfolio V4/public/ directory.

**Copy Backend & Core Files:**

- [x] /routes/ (all files)
- [x] /services/ (all files)
- [x] /migrations/ (all files)
- [x] /user-settings/ (all files)
- [x] database.js
- [x] server.js

**Copy Frontend "Utility" Files:**

- [x] /api/ (all files)
- [x] /ui/formatters.js
- [x] /ui/dropdowns.js
- [x] /ui/datetime.js
- [x] /ui/helpers.js
- [x] /ui/journal-settings.js
- [x] /ui/settings.js
- [x] /css/ (all files)
- [x] /images/ (all files)
- [x] /templates/ (all files)

**Do NOT copy the following V3 directories, as they will be re-written:**

- public/app-main.js
- public/state.js
- public/scheduler.js
- public/event-handlers/ (entire directory)
- public/ui/renderers/ (entire directory)

## **Phase 2: Foundation Re-Wiring**

[x] Create public/state.js: Create a new, clean state.js file to hold the global state.
[x] Create public/\_events.js (New File): Create this new utility file for a global event bus.

- [x] Add dispatchDataUpdate() function.
- [x] Add addDataUpdateListener() function.
      [x] Create public/app-main.js: Create the new main entry point.
- [x] Add logic to load settings from local storage.
- [x] Add logic to fetch and inject all HTML from /templates/ into the DOM.
- [x] Add a call to initializeAllEventHandlers().
- [x] Add logic to set the default selectedAccountHolderId in the state and UI.
- [x] Add logic to call switchView() to load the default tab.
      [x] Create public/event-handlers/\_navigation.js: Create the new main router.
- [x] Create the switchView function.
- [x] Add logic to switchView to hide all .page-container elements.
- [x] Add logic to switchView to show only the correct .page-container based on the viewType.
- [x] Add a case statement in switchView for each tab's new loader function (e.g., case 'dashboard': await loadDashboardPage(); break;).
      [x] Create public/event-handlers/\_init.js: Create the main initializer.
- [x] Add initializeAllEventHandlers() function.
- [x] Add a call to initializeNavigationHandlers().
- [x] Add a call to initialize each new, standalone tab module (e.g., initializeLedger(), initializeDashboard()).

[ ] **Set up Husky pre-commit hooks:** Configure `husky` to run the test, lint, and format scripts before each commit.

## **Phase 3: Tab-by-Tab Re-Wiring & Decoupling**

### **A. The "Ledger" Tab (Gold Standard)**

[x] Create public/event-handlers/ledger.js

- [x] Copy the logic from V3's \_ledger.js.
- [x] Create the main loadLedgerPage() function (this will be the old refreshLedgerWithPL).
- [x] Ensure all internal handlers (delete, filter) call loadLedgerPage() to refresh.
- [x] Hook case 'ledger' in \_navigation.js to call loadLedgerPage().
- [x] Hook \_init.js to call initializeLedgerHandlers().

### **B. The "Watchlist" Tab**

[x] Create public/event-handlers/watchlist.js

- [x] Copy the loadWatchlistPage and initializeWatchlist logic from V3's \_watchlist.js.
- [x] FIX: Remove the document.addEventListener('journalUpdated', ...) line to decouple it from the "Sources" tab.
      [x] Create public/ui/renderers/watchlist/ directory
- [x] Copy the logic from V3's \_watchlist_ideas.js, \_watchlist_real.js, and \_watchlist_watched.js into new, corresponding files in this directory.
      [x] Wire It Up
- [x] Hook case 'watchlist' in \_navigation.js to call loadWatchlistPage().
- [x] Hook \_init.js to call initializeWatchlist().

### **C. The "Dashboard" Tab**

[x] Create public/event-handlers/dashboard.js

- [x] This file will be the new home for all dashboard-related modal logic.
- [x] Copy logic from V3's \_dashboard_init.js, \_dashboard_loader.js, \_dashboard_modals.js, \_modal_sell_from_position.js, and \_modal_selective_sell.js into this new file.
- [x] FIX (Broken Event): Add addDataUpdateListener(loadDashboardPage) inside the initializeDashboardHandlers function so the dashboard refreshes on the global event.
- [x] FIX (Spaghetti Call): In the "Selective Sell" submit handler, remove the direct calls to loadDailyReportPage() and loadWatchlistPage().
- [x] FIX (Spaghetti Call): In all modal submit/delete handlers (Sell, Selective Sell, Edit, Delete), replace direct calls to loadDashboardPage() with the new dispatchDataUpdate() function.
      [x] Wire It Up
- [x] Hook case 'dashboard' in \_navigation.js to call loadDashboardPage().
- [x] Hook \_init.js to call initializeDashboardHandlers().

### **D. The "Sources" Tab**

[x] Create public/event-handlers/sources.js

- [x] This file will be the new home for all "Sources" logic.
- [x] Copy logic from V3's \_research.js, \_research_sources_listeners.js, and all \_research_sources_actions\_\*.js files into this new file.
- [x] FIX (Spaghetti Navigation): In the "Buy" button handler (handleCreateBuyOrderFromIdea), remove the switchView('orders') call. Replace it with a "Success" toast.
- [x] FIX (Spaghetti Event): In the "Add Technique" submit handler, remove the document.dispatchEvent(new CustomEvent('journalUpdated')) call. Replace it with dispatchDataUpdate().
- [x] FIX (UI Bug): Confirm that the switchView logic in \_navigation.js correctly hides the watchlist-page-container when the sources tab is active.  
       [x] Wire It Up
- [x] Hook case 'sources' in \_navigation.js to call loadResearchPage().
- [x] Hook \_init.js to call initializeResearchHandlers().

### **E. The "Orders" Tab**

[x] Create public/event-handlers/orders.js

- [x] This file will be the new home for all "Orders" logic.
- [x] Copy logic from V3's \_orders.js, \_orders_form.js, \_orders_modals.js, and \_orders_table.js into this new file.
- [x] FIX (Spaghetti Call): In the "Log Executed Trade" submit handler, remove the direct call to loadWatchlistPage(). Replace it with dispatchDataUpdate().
- [x] Ensure loadOrdersPage() still checks state.prefillOrderFromSource to handle pre-fills from "Sources" and "Alerts".  
       [x] Wire It Up
- [x] Hook case 'orders' in \_navigation.js to call loadOrdersPage().
- [x] Hook \_init.js to call initializeOrdersHandlers().

### **F. The "Alerts" Tab**

[x] Create public/event-handlers/alerts.js

- [x] Copy logic from V3's \_alerts.js. The "Dismiss" and "Review Later" handlers are already compliant.
- [x] FIX (Brittle Handler): In the "Yes, it Filled" button handler:
- [x] Remove the fillButton.click() logic.
- [x] Add logic to find the pendingOrderId and get the full order object from state.pendingOrders.
- [x] Add logic to create a prefillData object (like the "Sources" tab does).
- [x] Set state.prefillOrderFromSource \= prefillData.
- [x] Call switchView('orders').  
       [x] Wire It Up
- [x] Hook case 'alerts' in \_navigation.js to call loadAlertsPage().
- [x] Hook \_init.js to call initializeAlertsHandlers().

### **G. The "Imports" Tab**

[x] Create public/event-handlers/imports.js

- [x] Copy logic from V3's \_imports.js.
- [x] FIX (Missing Loader): Create a new, simple loadImportsPage() function (it may be empty for now, which is fine) and initializeImportsHandlers().
- [x] FIX (Spaghetti Navigation): In the "Commit Changes" handler, remove the switchView('ledger', null) and location.reload() calls.
- [x] FIX (Better Refresh): In the "Commit Changes" handler, add a call to dispatchDataUpdate() and show a success toast.
      [x] Wire It Up
- [x] Hook case 'imports' in \_navigation.js to call loadImportsPage().
- [x] Hook \_init.js to call initializeImportsHandlers().

## **Phase 4: Post-Refactor Cleanup & New Features**

This phase addresses items from the V3 bug list and backlog that are not explicitly covered by the architectural refactoring.

### **High Priority Bug Fixes**

- [x] **BUG - Sell Modal Refresh:** After selling from the "Manage Position" modal, the main dashboard table doesn't refresh automatically. The new `dispatchDataUpdate()` event should resolve this, but it needs to be verified.
- [x] **BUG - P/L Calculation:** P/L on closed positions (in "Ledger") seems to sometimes double-count. Verify the logic in `routes/reporting.js` (`/calculate-pl`). (Backend logic verified, likely a frontend aggregation issue.)
- [x] **BUG - Order Form Reset:** The "Log Executed Trade" form does not properly clear the `data-buy-id` or `data-sell-id` after a successful partial sale.

### **Medium Priority Refactoring & Features**

- [x] **Refactor - Settings:** The "Settings" modal (`_settings_modal.js`) is monolithic. Split its logic into `_settings_holders.js` and `_settings_exchanges.js`.
- [x] **Refactor - Watchlist Paper Trades:** The "Paper Trades" sub-tab on the Watchlist page It needs to be properly re-implemented.
- [x] **Feature - Source-Centric Management:** this is in place for v3, but improements can be made

### **Low Priority / Future Ideas**

- [x] **UI - Themes:** Add more themes (e.g., "High Contrast") to `_themes.css`.
- [x] **Feature - Dividends:** Add a new transaction type for "Dividend."
- [x] **Feature - Stock Splits:** Add a "Log Stock Split" feature.
- [x] **Feature - Technique Fields:** Add "Page Number" and "Chapter" fields to the "Technique / Method" creation process in the "Sources" module.
