# **Phase X: UI Refinements & Fixes (Ongoing / Next Steps)**

## Dashboard Enhancements

* **Task X.5:** Dashboard Card View - Conditional Buttons & Lot Management Modal:
  * [x] Refactor Card View (`createAggregatedCardHTML` in `_dashboard.js`) to aggregate lots by Ticker/Exchange.
  * [x] Implement conditional logic within `createAggregatedCardHTML`:
    * If a card represents a **single lot**, display all four action buttons (Sell, History, Limits, Edit) functioning directly on that lot's ID using `.sell-from-lot-btn`, `.sales-history-btn`, `.set-limit-btn`, `.edit-buy-btn` classes.
    * If a card represents **multiple lots**, display only the "Sell" button (using `.selective-sell-btn` class and `data-lots`) and a "Manage Lots" button (using a new `.view-lots-management-btn` class and also carrying `data-ticker`, `data-exchange`, `data-lots`).
  * [ ] Create a new modal template (`_modal_lot_management.html`) for the "Manage Lots" view triggered by `.view-lots-management-btn`. This modal should:
    * Display the Ticker and Exchange.
    * List the individual underlying lots passed via `data-lots`.
    * Include functional "Edit" and "Limits" buttons *next to each lot* in the list, referencing the specific lot ID.
    * Include a section for the *combined* sales history for all listed lots.
    * (Future) Include placeholders for charts or news.
  * [ ] Update `handleActionClick` in `_dashboard.js` to handle clicks on the new `.view-lots-management-btn`:
    * Parse the `data-ticker`, `data-exchange`, and `data-lots`.
    * Fetch combined sales history for the included lot IDs (requires new/modified API endpoint: `/api/transactions/sales/batch` perhaps?).
    * Populate and display the new "Lot Management" modal.
  * [x] Implement the Selective Sell modal (`_modal_selective_sell.html`) triggered by `.selective-sell-btn`.
  * [x] Adjust backend POST `/api/transactions` endpoint to handle the `lots` array for selective selling.
  * [x] Add "History" button to table view rows (`createTableRowHTML`) for consistency.
