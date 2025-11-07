import { initializeSettings } from './js/settings/index.js';
import { initializeStrategyLab } from './js/strategy/index.js';
import { initializeSubTabs } from './js/utils.js';

const tabs = [
  { name: 'Dashboard', template: 'templates/_dashboard.html', id: 'dashboard' },
  {
    name: 'Strategy Lab',
    template: 'templates/_strategylab.html',
    id: 'strategy',
  },
  // strategylab is the old watchlist tab
  // the daily history tab is dropped for this app for now
  { name: 'Ledger', template: 'templates/_ledger.html', id: 'ledger' },
  { name: 'Orders', template: 'templates/_orders.html', id: 'orders' },
  { name: 'Sources', template: 'templates/_research.html', id: 'sourced' },
  { name: 'Alerts', template: 'templates/_alerts.html', id: 'alerts' },
  { name: 'Imports', template: 'templates/_imports.html', id: 'imports' },
  {
    name: 'Settings',
    template: 'templates/_modal_settings.html',
    id: 'settings',
    className: 'tab-right',
  },
];

const tabsContainer = document.getElementById('tabs-container');
const mainContent = document.getElementById('main-content');
const loginModal = document.getElementById('login-modal');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const authMessage = document.getElementById('auth-message');
const userSwitcherContainer = document.getElementById(
  'user-switcher-container'
);
const userSwitcher = document.getElementById('user-switcher');

let isAuthenticated = false; // eslint-disable-line no-unused-vars
let currentUserId = null; // To store the ID of the currently selected user

// Function to make authenticated API requests
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!window.authEnabled && currentUserId) {
    // If authentication is disabled, send the currentUserId for development purposes
    headers['X-User-Id'] = currentUserId;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    // Token expired or invalid, force re-login
    localStorage.removeItem('accessToken');
    isAuthenticated = false;
    loginModal.classList.add('visible');
    throw new Error('Authentication required.');
  }

  return response;
}

async function checkAuth() {
  const configResponse = await fetch('/api/config');
  const config = await configResponse.json();
  window.authEnabled = config.enableAuth;

  if (!window.authEnabled) {
    // If auth is disabled, show user switcher and initialize app
    userSwitcherContainer.style.display = 'block';
    await populateUserSwitcher();
    isAuthenticated = true;
    return true;
  }

  const token = localStorage.getItem('accessToken');
  if (token) {
    // In a real app, you'd verify the token with the backend
    // For now, we'll assume if a token exists, the user is authenticated
    isAuthenticated = true;
    return true;
  } else {
    loginModal.classList.add('visible');
    return false;
  }
}

async function populateUserSwitcher() {
  try {
    const response = await authenticatedFetch('/api/dev/users');
    if (response.ok) {
      const users = await response.json();
      userSwitcher.innerHTML = ''; // Clear existing options
      users.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.username;
        userSwitcher.appendChild(option);
      });
      // Select a previously selected user from localStorage, or the first user by default
      const storedUserId = localStorage.getItem('currentDevUserId');
      if (storedUserId && users.some((user) => user.id == storedUserId)) {
        currentUserId = storedUserId;
        userSwitcher.value = storedUserId;
      } else if (users.length > 0) {
        currentUserId = users[0].id;
        userSwitcher.value = users[0].id;
        localStorage.setItem('currentDevUserId', users[0].id);
      }
    } else {
      console.error('Failed to fetch dev users:', await response.text());
    }
  } catch (error) {
    console.error('Error populating user switcher:', error);
  }
}

userSwitcher.addEventListener('change', (event) => {
  currentUserId = event.target.value;
  localStorage.setItem('currentDevUserId', currentUserId); // Persist selected user
  console.log('Switched to user ID:', currentUserId);
  // Re-initialize the app content to load data for the new user
  initializeAppContent();
});

async function loginUser() {
  const username = authUsernameInput.value;
  const password = authPasswordInput.value;

  try {
    const response = await authenticatedFetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('accessToken', data.accessToken);
      isAuthenticated = true;
      loginModal.classList.remove('visible');
      authMessage.textContent = '';
      initializeAppContent(); // Initialize the app content after successful login
    } else {
      authMessage.textContent = data.message || 'Login failed.';
    }
  } catch (error) {
    authMessage.textContent = 'Error during login.';
    console.error('Login error:', error);
  }
}

async function registerUser() {
  const username = authUsernameInput.value;
  const password = authPasswordInput.value;

  try {
    const response = await authenticatedFetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      authMessage.textContent = 'Registration successful! Please log in.';
      authUsernameInput.value = '';
      authPasswordInput.value = '';
    } else {
      authMessage.textContent = data.message || 'Registration failed.';
    }
  } catch (error) {
    authMessage.textContent = 'Error during registration.';
    console.error('Registration error:', error);
  }
}

loginButton.addEventListener('click', loginUser);
registerButton.addEventListener('click', registerUser);

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
        const tabId = container.id.replace('-page-container', '');
        let subTabTemplateMap = {};

        // Define sub-tab templates based on the main tab
        if (tabId === 'strategy') {
          subTabTemplateMap = {
            watchlist: 'templates/_watchlist.html',
            'paper-trades': 'templates/_papertrades.html',
          };
        }
        // Add other sub-tab template maps here as needed

        initializeSubTabs(container, subTabTemplateMap);
      }
    });

  initializeSettings();
  initializeStrategyLab();
}

async function initializeApp() {
  if (await checkAuth()) {
    initializeAppContent();
  }
}

initializeApp();
