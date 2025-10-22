# Strategic Roadmap

## Completed: Phases 0, 0.5, 1, 1.5, 2

* **Foundational Refactoring & Cleanup**
* **Application Hardening**
* **Intelligent CSV Importer & Hardening**
* **Strategy & Advice Journal / Dashboard Implementation**

### Future Phases

* **Phase X: UI Refinements & Fixes (Ongoing)**
  * Address various UI bugs and minor enhancements identified through usage (see Implementation Guide).
* **Phase 3: Authentication & Enhanced Account Management**
  * Implement user authentication and session management.
  * Refine Account Holder deletion logic.
* **Phase 4: Future Architectural Improvements**
  * Adopt Unit Testing (revisit skipped tests).
  * Implement Robust Backend Validation.
  * Centralize Server-Side Error Handling.
  * Centralize Application Configuration.
  * Enhance Historical Price Tracking.
* **Phase 5: Source-Centric Management**
  * Introduce a new top-level "Sources" tab.
  * Dynamically generate sub-tabs based on defined Advice Sources.
  * Display source-specific details: contact info, notes, linked documents, related watchlist items.
  * Potentially refactor/relocate paper trading (current Journal functionality) under the Watchlist tab.
  * Requires DB schema changes (advice\_sources, watchlist, documents), new API endpoints, and significant UI work.
* **(Potential) Phase 6: Finalization & Documentation Review**.
