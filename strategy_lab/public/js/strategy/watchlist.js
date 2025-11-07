import { authenticatedFetch } from '../../app-main.js';

export function initializeWatchlist() {
  const addTickerInput = document.getElementById('add-ticker-input');
  const addTickerButton = document.getElementById('add-ticker-button');
  const watchlistTableBody = document.querySelector('#watchlist-table tbody');
  const errorMessageElement = document.getElementById(
    'watchlist-error-message'
  );

  // Function to fetch and render the watchlist
  async function fetchAndRenderWatchlist() {
    try {
      const response = await authenticatedFetch('/api/watchlist');
      if (response.ok) {
        const watchlist = await response.json();
        watchlistTableBody.innerHTML = ''; // Clear existing entries
        if (watchlist.length === 0) {
          watchlistTableBody.innerHTML =
            '<tr><td colspan="7">No tickers in watchlist. Add one above!</td></tr>';
        } else {
          watchlist.forEach((item) => {
            const row = `
              <tr>
                <td>${item.ticker}</td>
                <td>${item.currentPrice || 'N/A'}</td>
                <td>${item.priceChangeStart || 'N/A'}</td>
                <td>${item.percentChangeStart || 'N/A'}</td>
                <td>${item.percentChangeDay || 'N/A'}</td>
                <td>${item.percentChangeDay || 'N/A'}</td>
                <td><button class="remove-ticker-button" data-ticker="${item.ticker}">Remove</button></td>
              </tr>
            `;
            watchlistTableBody.insertAdjacentHTML('beforeend', row);
          });
        }
      } else {
        errorMessageElement.textContent = 'Failed to load watchlist.';
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      errorMessageElement.textContent = 'Error fetching watchlist.';
    }
  }

  // Function to add a ticker to the watchlist
  async function addTicker() {
    const ticker = addTickerInput.value.trim().toUpperCase();

    if (!ticker) {
      errorMessageElement.textContent = 'Ticker symbol is required.';
      return;
    }

    try {
      const response = await authenticatedFetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker }),
      });

      if (response.ok) {
        addTickerInput.value = ''; // Clear input
        errorMessageElement.textContent = ''; // Clear error
        fetchAndRenderWatchlist(); // Refresh watchlist
      } else {
        const errorData = await response.json();
        errorMessageElement.textContent =
          errorData.message || 'Failed to add ticker.';
      }
    } catch (error) {
      console.error('Error adding ticker:', error);
      errorMessageElement.textContent = 'Error adding ticker.';
    }
  }

  // Event Listeners
  addTickerButton.addEventListener('click', addTicker);
  addTickerInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addTicker();
    }
  });

  watchlistTableBody.addEventListener('click', async (event) => {
    if (event.target.classList.contains('remove-ticker-button')) {
      const tickerToRemove = event.target.dataset.ticker;
      try {
        const response = await authenticatedFetch(
          `/api/watchlist/${tickerToRemove}`,
          {
            method: 'DELETE',
          }
        );
        if (response.ok) {
          fetchAndRenderWatchlist(); // Refresh watchlist
        } else {
          errorMessageElement.textContent = 'Failed to remove ticker.';
        }
      } catch (error) {
        console.error('Error removing ticker:', error);
        errorMessageElement.textContent = 'Error removing ticker.';
      }
    }
  });

  // Initial load
  fetchAndRenderWatchlist();
}
