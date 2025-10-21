## 3. Strategic Roadmap

### Completed: Phase 0 & Phase 1

* **Foundational Refactoring & Cleanup**
* **Intelligent CSV Importer**

### In Progress: Phase 2 - Strategy & Advice Journal

**Objective:** Build a comprehensive tool for "paper trading," tracking advice from various sources, and analyzing performance.

* **Task 2.1: Database Migrations:** Completed (Tables `advice_sources`, `journal_entries`, `documents` created; `transactions` updated).
* **Task 2.2: Advice Source Management UI:** Completed (UI in Settings modal, backend routes, frontend logic).
* **Task 2.3: Journal Page Development (Basic UI):** Completed (HTML template, basic renderer, basic event handlers, API routes, page integration).
* **Task 2.4: Backend Enhancements:** **NEXT STEP** (Implement cron job for price tracking and alert generation for open journal entries).
    * Requires adding `journal_entry_id` column to `notifications` table via migration.
* **(Future UI Refinements for Task 2.3):** Implement Edit functionality, refine tables/summary, add sparklines.

### Future Phases:

* **Phase 3: Authentication & Enhanced Account Management**
    * Implement user authentication and session management.
    * **Refine Account Holder Deletion:**
        * Allow deletion of the "Primary" account if others exist.
        * Implement automatic default account reassignment upon deletion.
        * **(Deferred) Implement Two-Step Deletion w/ Data Removal:** Add a confirmation step via Alerts for deleting holders with associated data, leading to permanent data removal.
* **Phase 4: Future Architectural Improvements** (Unit testing, backend validation, config centralization).
* **(Potential) Phase 5: Finalization & Documentation Review**.