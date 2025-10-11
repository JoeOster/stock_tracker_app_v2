# Gemini Context File for Portfolio Tracker V2

This document provides a comprehensive summary of the "Portfolio Tracker V2" project to assist AI prompts. It outlines the project's architecture, key files, recent changes, and development workflow.

## Project Summary

Portfolio Tracker V2 is a self-hosted web application for active retail traders to track investment performance and strategy across multiple brokerage accounts. It is built with a Node.js/Express backend, a vanilla JavaScript frontend, and uses SQLite for data storage. The current version is **2.20**, which includes significant refactoring and UI improvements.

## Core Architecture

The project follows a modular structure, separating backend, frontend, and database logic.

* **Backend (`/routes`, `/services`, `server.js`):** An Express.js server handles API requests. The logic is split into route files (e.g., `transactions.js`, `reporting.js`) and services (e.g., `cronJobs.js` for scheduled tasks).
* **Database (`database.js`, `/migrations`):** Uses SQLite3 with a built-in migration system that automatically applies `.sql` files from the `/migrations` directory on startup to keep the schema up-to-date.
* **Frontend (`/public`):**
  * **`index.html`**: A minimal skeleton file that serves as the entry point. It contains placeholders (`<main id="main-content">`, `<div id="modal-container">`) where content is dynamically injected.
  * **`app-main.js`**: The main frontend script. It manages application state, loads HTML templates, and initializes all other modules.
  * **`/templates`**: Contains HTML partials for each page view (e.g., `_dailyReport.html`) and all modals (`_modals.html`). These are loaded into `index.html` by `app-main.js` on startup.
  * **`/ui/renderers`**: A set of modules responsible for rendering data into the DOM (e.g., `_dailyReport.js` populates tables).
  * **`/event-handlers`**: A set of modules for handling user interactions, with each file corresponding to a specific UI component (e.g., `_navigation.js`, `_modals.js`). All are initialized via `_init.js`.

## Development & Deployment

* **Scripts (`package.json`):**
  * `npm run dev`: Starts the server in development mode using `nodemon`.
  * `npm run test`: Runs the Jest test suite for both backend and frontend components.
  * `npm run seed-dev`: Resets the development database with sample data using `seed-dev-db.js`.
* **Deployment (`deploy.bat`):** An automated script for Windows that stops the service, runs tests, backs up the database, copies files, and restarts the service.

## Recent Changes (v2.19 - v2.20)

* **Major Frontend Refactoring:**
  * The monolithic `index.html` was broken into smaller HTML template files stored in `public/templates/`. These are now loaded dynamically by `app-main.js`.
  * The oversized `event-listeners.js` was refactored into a modular `public/event-handlers/` directory, with one file per UI component.
* **UI/UX Improvements:**
  * The "Unrealized P/L" columns in the "Open Lots" table were merged into a single column.
  * Table headers were made sticky for better usability on long tables.
  * The "Viewing:" account selector now autosizes to its content.
  * A "Family Name" setting was added to customize the application title.
  * A "Delete" button was added to the "Edit Transaction" modal.
* **Code Quality:**
  * `jsconfig.json` was added and configured to enable advanced type-checking in VS Code.
  * JSDoc comments (`/** @type {...} */`) were added throughout the frontend code to resolve type warnings and improve code intelligence.
    * Unit tests were updated and expanded to cover the refactored frontend modules.

## Backlog

The following items are on the backlog for future development, as per the `README.md` file:

* Enhance the market status indicator for 24/7 or international exchanges.
* Build an intelligent CSV importer.
* Build a dedicated "Advice Journal" feature.
