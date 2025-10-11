// public/event-handlers/_navigation.js
import { state, switchView } from '../app-main.js';
import { updateAllPrices } from '../api.js';

export function initializeNavigationHandlers() {
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));
    const refreshBtn = document.getElementById('refresh-prices-btn');

    // --- Global Filter Listener ---
    if (globalHolderFilter) {
        globalHolderFilter.addEventListener('change', (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            state.selectedAccountHolderId = target.value;
            switchView(state.currentView.type, state.currentView.value);
            
            // Auto-size the dropdown
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.fontSize = window.getComputedStyle(target).fontSize;
            tempSpan.textContent = target.options[target.selectedIndex].text;
            document.body.appendChild(tempSpan);
            target.style.width = `${tempSpan.offsetWidth + 30}px`;
            document.body.removeChild(tempSpan);
        });
    }

    // --- Main View/Tab Navigation ---
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (target.classList.contains('master-tab')) {
                const viewType = target.dataset.viewType;
                const viewValue = target.dataset.viewValue;
                if (viewType) {
                    switchView(viewType, viewValue || null);
                }
            }
        });
    }

    // --- Custom Date Picker ---
    if (customDatePicker) {
        customDatePicker.addEventListener('change', (e) => {
            const selectedDate = (/** @type {HTMLInputElement} */ (e.target)).value;
            if (selectedDate) {
                let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
                const newDate = { date: selectedDate, added: Date.now() };
                persistentDates = persistentDates.filter(d => d.date !== selectedDate);
                persistentDates.push(newDate);
                localStorage.setItem('persistentDates', JSON.stringify(persistentDates));
                switchView('date', selectedDate);
            }
        });
    }

    // --- Manual Price Refresh Button ---
    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => 
            updateAllPrices(state.activityMap, state.priceCache)
        );
    }
}