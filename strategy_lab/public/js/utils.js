export function initializeSubTabs(container, templateMap = {}) {
  console.log('Initializing sub-tabs for container:', container);
  const subTabsContainer = container.querySelector('.sub-tabs');

  async function loadSubTabContent(tabId, targetElementId) {
    const templatePath = templateMap[tabId];
    if (!templatePath) {
      console.warn(`No template found for sub-tab ID: ${tabId}`);
      return;
    }
    try {
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.text();
      const targetElement = container.querySelector(`#${targetElementId}`);
      if (targetElement) {
        targetElement.innerHTML = content;
      } else {
        console.error(
          `Target element #${targetElementId} not found for sub-tab ${tabId}`
        );
      }
    } catch (error) {
      console.error(`Failed to load sub-tab content for ${tabId}:`, error);
    }
  }

  function showTab(tabId) {
    container.querySelectorAll('.sub-tab-panel').forEach((panel) => {
      panel.style.display = 'none';
    });
    const targetPanel = container.querySelector(`#${tabId}`);
    if (targetPanel) {
      targetPanel.style.display = 'block';
    }
  }

  if (subTabsContainer) {
    // Set the initial state when the component is initialized
    const activeTab = subTabsContainer.querySelector('.sub-tab.active');
    let initialTabId = activeTab
      ? activeTab.dataset.tab || activeTab.dataset.subTab
      : null;

    if (!initialTabId) {
      // If no active tab is explicitly set, activate the first one
      const firstTab = subTabsContainer.querySelector('.sub-tab');
      if (firstTab) {
        firstTab.classList.add('active');
        initialTabId = firstTab.dataset.tab || firstTab.dataset.subTab;
      }
    }

    if (initialTabId) {
      showTab(initialTabId);
    }

    // Handle tab clicks
    subTabsContainer.addEventListener('click', (event) => {
      const tab = event.target.closest('.sub-tab');
      if (tab && subTabsContainer.contains(tab)) {
        event.stopPropagation();

        const tabId = tab.dataset.tab || tab.dataset.subTab;

        if (tabId) {
          // Deactivate all tabs in the current container
          subTabsContainer
            .querySelectorAll('.sub-tab')
            .forEach((t) => t.classList.remove('active'));
          // Activate the clicked tab
          tab.classList.add('active');
          // Show the corresponding panel
          showTab(tabId);
        }
      }
    });
  }
}
