import { initializeSubTabs } from './js/utils.js';
import { initializeSettings } from './js/settings/index.js';

const tabs = [
  { name: 'Dashboard', template: 'templates/_dashboard.html', id: 'dashboard' },
  { name: 'Ledger', template: 'templates/_ledger.html', id: 'ledger' },
  { name: 'Limit Orders', template: 'templates/_orders.html', id: 'orders' },
  { name: 'Sources', template: 'templates/_research.html', id: 'research' },
  { name: 'Alerts', template: 'templates/_alerts.html', id: 'alerts' },
  { name: 'Imports', template: 'templates/_imports.html', id: 'imports' },
  { name: 'Strategy Lab', template: 'templates/_dailyReport.html', id: 'daily-report' },
  { name: 'Settings', template: 'templates/_modal_settings.html', id: 'settings', className: 'tab-right' },
];

const tabsContainer = document.getElementById('tabs-container');
const mainContent = document.getElementById('main-content');

function createTabs() {
  tabs.forEach(tab => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab';
    if (tab.className) {
      tabButton.classList.add(tab.className);
    }
    tabButton.textContent = tab.name;
    tabButton.dataset.tabId = tab.id;
    tabsContainer.appendChild(tabButton);
  });
}

async function loadTemplates() {
  for (const tab of tabs) {
    const response = await fetch(tab.template);
    const content = await response.text();
    const container = document.createElement('div');
    container.id = `${tab.id}-page-container`;
    container.className = 'page-container';
    container.style.display = 'none';
    container.innerHTML = content;
    mainContent.appendChild(container);

    // Initialize sub-tabs within the loaded template
    const subTabContainers = container.querySelectorAll('.sub-tabs');
    subTabContainers.forEach(subTabContainer => {
        const parent = subTabContainer.parentElement;
        if(parent) {
            initializeSubTabs(parent);
        }
    });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.page-container').forEach(container => {
    container.style.display = 'none';
  });
  document.querySelectorAll('.tab').forEach(button => {
    button.classList.remove('active');
  });

  const containerToShow = document.getElementById(`${tabId}-page-container`);
  if (containerToShow) {
    containerToShow.style.display = 'block';
  }

  const buttonToActivate = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (buttonToActivate) {
    buttonToActivate.classList.add('active');
  }
}

tabsContainer.addEventListener('click', (event) => {
  if (event.target.classList.contains('tab')) {
    const tabId = event.target.dataset.tabId;
    switchTab(tabId);
  }
});

async function initializeApp() {
  createTabs();
  await loadTemplates();
  if (tabs.length > 0) {
    switchTab(tabs[0].id);
  }

  initializeSettings();
}

initializeApp();
