# **ADR-001: Design of the Intelligent CSV Importer**

**Date:** 2025-10-11

**Status:** Proposed

## **Context**

The existing CSV import functionality in Portfolio Tracker V2 is minimal. It requires a rigid data format, does not support SELL transactions, and provides no mechanism for handling data errors or duplicates. User feedback and analysis of sample files from major brokerages (Fidelity, E-Trade, Robinhood) have shown that a more robust, flexible, and intelligent solution is required for a viable user experience.

## **Decision**

We will implement a new "Intelligent CSV Importer" as a multi-step, user-driven workflow. The core architectural principle is that the **imported CSV will be treated as the definitive source of truth**, and the importer will function as a **data reconciliation tool** against existing manually entered data.

The key features of this new architecture are:

1. **Brokerage Templates:** The user will select a brokerage template (e.g., "Fidelity," "Generic") to pre-configure the importer's parsing, mapping, and transformation logic. Users will be able to save their own custom templates.  
2. **Unified Reconciliation Interface:** Instead of a simple "upload and pray" model, the user will be presented with a single, comprehensive review screen. This interface will handle all reconciliation tasks in one place:  
   * **Filtering:** Non-trade activities (deposits, dividends) will be automatically marked to be ignored, with a user override.  
   * **Conflict Resolution:** The system will detect potential duplicates between the CSV and existing 'MANUAL' entries. This includes "Direct Matches" (potential typos) and "Cross-Exchange Matches" (trades logged in the wrong account). The user will be prompted to Replace, Keep, or Move & Replace these entries.  
   * **Orphaned Data:** The system will flag manual entries that exist in the database but not in the CSV for a given date range, prompting the user to keep or delete them.  
   * **SELL Lot Assignment:** All SELL transactions must be manually reconciled. The system will suggest a match using the FIFO method, but the user has the final control to assign a sale to one or more specific BUY lots.  
3. **Atomic Backend Operations:** All import operations (inserting new records, deleting/updating reconciled records) will be handled by a new, dedicated backend endpoint that wraps the entire process in a single database transaction to ensure data integrity.

## **Consequences**

* **Positive:**  
  * **High Data Integrity:** This design prevents the creation of duplicate or erroneous data by forcing reconciliation before import.  
  * **Excellent User Experience:** The workflow actively guides the user through cleaning and validating their data.  
  * **Flexibility:** The template system and manual overrides allow the importer to support virtually any CSV format.  
  * **Accuracy:** Manual SELL lot assignment ensures P\&L calculations are precise and reflect the user's specific tax-lot strategy.  
* **Negative:**  
  * **Increased Complexity:** This is a significantly more complex feature to implement than a simple parser, both on the frontend (UI state management) and backend (transactional logic).  
  * **User Interaction Required:** The import process is no longer a "one-click" action. It requires user input for SELL reconciliation and conflict resolution, which may be a trade-off for users who prefer speed over accuracy. However, given the project's goal as an analytical tool, accuracy is prioritized.