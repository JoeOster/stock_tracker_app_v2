# **Gemini Context File for Portfolio Tracker V3**

**Last Updated:** 2025-10-17

This document provides a comprehensive summary of the "Portfolio Tracker V3" project and its strategic roadmap to assist AI prompts.

## **1. Project Summary**

Portfolio Tracker V3 is a self-hosted web application for active retail traders to track investment performance and strategy across multiple brokerage accounts. It is built with a Node.js/Express backend, a vanilla JavaScript frontend, and uses SQLite for data storage. The project has a modular architecture and a comprehensive automated testing and deployment process.

**GitHub Repository:** <https://github.com/JoeOster/stock_tracker_app_v2>
**Active Branch:** `Phase2-Decoupling`

## **2. Architectural Principles & Standards**

### **Coding Standards**
1.  **JSDoc Comments:** All JavaScript code must be documented using JSDoc-style comments to describe the purpose, parameters, and return values of functions.
2.  **File Size:** To ensure maintainability, individual modules should be kept concise. As a general guideline, files should not exceed **200 lines of code**.
3.  **Comment Validity:** After significant refactoring or feature changes, all related in-code comments must be reviewed and updated to ensure they accurately reflect the current state of the code.

### **File Schema**
* **`public/app-main.js`**: The primary application entry point. Responsible for initialization, template loading, and view switching.
* **`public/state.js`**: Manages global client-side state.
* **`public/api.js`**: Handles all `fetch` calls to the backend server.
* **`public/event-handlers/_init.js`**: The central initializer that calls all other event handler initializers.
* **`public/event-handlers/_*.js`**: Handles all user interaction logic for a single page.
* **`public/ui/renderers/_*.js`**: Renders data into the DOM for a single page. Does not fetch data or handle events.
* **`public/templates/_*.html`**: Contains the HTML structure for a single page or component.

### **Interaction Rules**
1.  **Modules Own Their DOM:** A module should only ever interact with elements defined in its own corresponding template file.
2.  **No Direct Function Calls Between Peer Modules:** Modules should communicate indirectly.
3.  **Strict Separation of Concerns:** Each module type has one job as defined in the File Schema.

## **3. Strategic Roadmap**

### **Completed: Decouple Frontend Renderers & Rebuild "New Orders" Page**

The frontend rendering architecture has been successfully refactored by eliminating the central `renderers.js` hub file. Each renderer is now a standalone, independent module, which has resolved the cascading import/export errors and significantly improved maintainability. The fragile "New Orders" page was also successfully rebuilt on this new, stable foundation.

### **Next Major Phase: Strategy & Advice Journal**

**Objective:** Build a comprehensive tool for "paper trading," tracking advice from various sources, and analyzing performance.