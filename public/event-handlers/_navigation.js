// in public/event-handlers/_navigation.js
import { state, switchView } from '../app-main.js';
import { updateAllPrices } from '../api.js';

/**
 * Autosizes the account selector dropdown to fit the selected text.
 * @param {HTMLSelectElement} selectElement The dropdown element to resize.
 */
export function autosizeAccountSelector(selectElement) {
    if (!selectElement || selectElement.options.length === 0) return;

    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre'; // Prevent text wrapping
    tempSpan.style.fontSize = window.getComputedStyle(selectElement).fontSize;
    tempSpan.textContent = selectElement.options[selectElement.selectedIndex].text || 'All Accounts';
    document.body.appendChild(tempSpan);
    selectElement.style.width = `${tempSpan.offsetWidth + 30}px`;
    document.body.removeChild(tempSpan);
}


export function initializeNavigationHandlers() {
    const tabsContainer = document.getElementById('tabs-container');
    const globalHolderFilter = /** @type {HTMLSelectElement} */ (document.getElementById('global-account-holder-filter'));
    const customDatePicker = /** @type {HTMLInputElement} */ (document.getElementById('custom-date-picker'));
    const refreshBtn = document.getElementById('refresh-prices-btn');

    if (globalHolderFilter) {
        // FIX: Make the event listener async to await the switchView function
        globalHolderFilter.addEventListener('change', async (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            state.selectedAccountHolderId = target.value;
            await switchView(state.currentView.type, state.currentView.value);
            autosizeAccountSelector(target);
        });
    }

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

    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => 
            updateAllPrices(state.activityMap, state.priceCache)
        );
    }
}