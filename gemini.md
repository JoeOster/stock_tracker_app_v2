# **Gemini Context File for Portfolio Tracker V3**

**Last Updated:** 2025-10-16

This document provides a comprehensive summary of the "Portfolio Tracker V3" project and its strategic roadmap to assist AI prompts.

## **1. Project Summary**

Portfolio Tracker V3 is a self-hosted web application for active retail traders to track investment performance and strategy across multiple brokerage accounts. It is built with a Node.js/Express backend, a vanilla JavaScript frontend, and uses SQLite for data storage. The project has a modular architecture and a comprehensive automated testing and deployment process.

**GitHub Repository:** <https://github.com/JoeOster/stock_tracker_app_v2>
**Active Branch:** `Phase0.1.1---Refactor-renderers`

## **2. Architectural Principles & Standards**

### **Coding Standards**

1. **JSDoc Comments:** All JavaScript code must be documented using JSDoc-style comments to describe the purpose, parameters, and return values of functions.
2. **File Size:** To ensure maintainability and optimal processing, individual modules should be kept concise and focused. As a general guideline, files should not exceed **200 lines of code**.

### **File Schema**

* **`public/app-main.js`**: The primary application entry point. Responsible for initialization, template loading, and view switching.
* **`public/state.js`**: Manages global client-side state.
* **`public/api.js`**: Handles all `fetch` calls to the backend server.
* **`public/event-handlers/_init.js`**: The central initializer that calls all other event handler initializers.
* **`public/event-handlers/_*.js`**: Handles all user interaction logic for a single page.
* **`public/ui/renderers/_*.js`**: Renders data into the DOM for a single page. Does not fetch data or handle events.
* **`public/templates/_*.html`**: Contains the HTML structure for a single page or component.

### **Interaction Rules**

1. **Modules Own Their DOM:** A module should only ever interact with elements defined in its own corresponding template file.
2. **No Direct Function Calls Between Peer Modules:** Modules should communicate indirectly. For example, an event handler calls an API function, which returns data, and then the event handler passes that data to a renderer.
3. **Strict Separation of Concerns:** Each module type has one job as defined in the File Schema.

## **3. Strategic Roadmap**

### **Current Task: Decouple Frontend Renderers**

**Objective:** To refactor the frontend rendering architecture by eliminating the central `renderers.js` hub file. This will make each renderer a standalone, independent module, resolving cascading import/export errors and improving maintainability.

**Strategy & Naming Schema:**

1. **Standardize Function Names:** All main page rendering functions will be named using the `render[PageName]Page` convention (e.g., `renderLedgerPage`, `renderAlertsPage`).
2. **Modify `public/app-main.js`:** Update the main application file to import each renderer function directly from its source file (e.g., from `_alerts.js`, `_charts.js`, etc.), using the new standardized names.
3. **Delete the Hub:** Once all direct imports are in place, the `public/ui/renderers.js` hub file will be safely deleted.

### **Next Phase: Rebuild "New Orders" Page**

Once the renderer decoupling is complete, the "New Orders" page will be rebuilt from a clean slate to restore its functionality on a stable foundation.
