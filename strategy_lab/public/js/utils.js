export function initializeSubTabs(container) {
  console.log('Initializing sub-tabs for container:', container);
  const subTabsContainer = container.querySelector('.sub-tabs');
  const subTabContent = container.querySelector('.sub-tab-content');

  function showTab(tabId) {
    if (!subTabContent) return;
    subTabContent.querySelectorAll('.sub-tab-panel').forEach((panel) => {
      if (panel.id === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }

  if (subTabsContainer && subTabContent) {
    // Set the initial state when the component is initialized
    const activeTab = subTabsContainer.querySelector('.sub-tab.active');
    if (activeTab) {
      const tabId = activeTab.dataset.tab || activeTab.dataset.subTab;
      if (tabId) {
        showTab(tabId);
      }
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

          // After showing the panel, initialize any sub-tabs within it
          const newPanel = subTabContent.querySelector(`#${tabId}`);
          if (newPanel) {
            const nestedSubTabs = newPanel.querySelectorAll('.sub-tabs');
            nestedSubTabs.forEach((nestedContainer) => {
              // Pass the parent of the .sub-tabs container to the initializer
              if (nestedContainer.parentElement) {
                initializeSubTabs(nestedContainer.parentElement);
              }
            });
          }
        }
      }
    });
  }
}
