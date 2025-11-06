export function initializeSubTabs(container) {
  const subTabsContainer = container.querySelector('.sub-tabs');
  const subTabContent = container.querySelector('.sub-tab-content');

  if (subTabsContainer && subTabContent) {
    subTabsContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('sub-tab')) {
        event.stopPropagation(); // Stop the event from bubbling up.

        const tabId = event.target.dataset.tab || event.target.dataset.subTab;

        if (tabId) {
            subTabsContainer.querySelectorAll('.sub-tab').forEach(tab => {
              tab.classList.remove('active');
            });

            event.target.classList.add('active');

            subTabContent.querySelectorAll('.sub-tab-panel').forEach(panel => {
              if (panel.id === tabId) {
                panel.classList.add('active');
              } else {
                panel.classList.remove('active');
              }
            });
        }
      }
    });
  }
}
