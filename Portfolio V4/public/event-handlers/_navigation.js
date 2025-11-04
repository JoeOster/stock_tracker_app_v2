import { loadLedgerPage } from './ledger.js';
import { loadWatchlistPage } from './watchlist.js';
import { loadDashboardPage } from './dashboard.js';
import { loadResearchPage } from './sources.js';
import { loadOrdersPage } from './orders.js';
import { loadAlertsPage } from './alerts.js';

export async function switchView(viewType) {
  console.log(`[Navigation] Switching to ${viewType}`);

  // Hide all page containers
  document.querySelectorAll('.page-container').forEach((container) => {
    container.style.display = 'none';
  });

  // Show the requested page container
  const targetContainer = document.getElementById(`${viewType}-page-container`);
  if (targetContainer) {
    targetContainer.style.display = 'block';
  } else {
    console.error(
      `[Navigation] Container for view type "${viewType}" not found.`
    );
    return;
  }

  // Load content for the new view
  switch (viewType) {
    case 'dashboard':
      await loadDashboardPage();
      break;
    case 'sources':
      await loadResearchPage();
      break;
    case 'watchlist':
      await loadWatchlistPage();
      break;
    case 'ledger':
      await loadLedgerPage();
      break;
    case 'orders':
      await loadOrdersPage();
      break;
    case 'alerts':
      await loadAlertsPage();
      break;
    case 'imports':
      // console.log('[Navigation] Imports tab selected.');
      break;
    default:
      console.warn(`[Navigation] No loader for view type "${viewType}"`);
  }
}
