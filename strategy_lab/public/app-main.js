import { initializeSettings } from './js/settings/index.js';

import { initializeSubTabs } from './js/utils.js';

const tabs = [
  { name: 'Dashboard', template: 'templates/_dashboard.html', id: 'dashboard' },
  {
    name: 'Strategy Lab',
    template: 'templates/_strategylab.html',
    id: 'strategylab',
  },
  { name: 'Orders', template: 'templates/_orders.html', id: 'orders' },
  { name: 'Ledger', template: 'templates/_ledger.html', id: 'ledger' },
  // strategylab is the old watchlist tab
  // the daily history tab is dropped for this app for now
  {
    name: 'Settings',
    template: 'templates/_modal_settings.html',
    id: 'settings',
    className: 'tab-right',
  },
];

const tabsContainer = document.getElementById('tabs-container');
const mainContent = document.getElementById('main-content');

// Function to make authenticated API requests (simplified for disabled authentication)
export async function authenticatedFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  const response = await fetch(url, { ...options, headers });
  return response;
}

function createTabs() {
  tabs.forEach((tab) => {
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
  }
}

function switchTab(tabId) {
  // Handle settings tab as a modal
  if (tabId === 'settings') {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'block';
      // Initialize settings when modal is opened
      initializeSettings();
    }
    // Do not hide other page containers or deactivate other tabs when opening modal
    return;
  }

  // For regular tabs, hide all page containers and deactivate all tabs
  document.querySelectorAll('.page-container').forEach((container) => {
    container.style.display = 'none';
  });
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.remove('active');
  });

  const containerToShow = document.getElementById(`${tabId}-page-container`);
  if (containerToShow) {
    containerToShow.style.display = 'block';
  }

  const buttonToActivate = document.querySelector(
    `.tab[data-tab-id="${tabId}"]`
  );
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

// Add event listener for the settings modal close button
document.addEventListener('DOMContentLoaded', () => {
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    const closeButton = settingsModal.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
      });
    }
    // Close modal if user clicks outside of it
    window.addEventListener('click', (event) => {
      if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }
});

async function initializeAppContent() {
  createTabs();
  await loadTemplates();
  if (tabs.length > 0) {
    switchTab(tabs[0].id);
  }

  // Initialize all top-level sub-tab systems
  document
    .querySelectorAll('#main-content > .page-container')
    .forEach((container) => {
      if (container.querySelector('.sub-tabs')) {
        let subTabTemplateMap = {};

        // Define sub-tab templates based on the main tab
        // Add other sub-tab template maps here as needed

        initializeSubTabs(container, subTabTemplateMap);
      }
    });

  initializeSettings();
}

async function initializeApp() {
  initializeAppContent();
}

initializeApp();
