const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../services/authService');

// Get user's watchlist
router.get('/watchlist', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const watchlist = await db.getWatchlist(userId);
    res.json(watchlist);
  } catch (err) {
    console.error('Error fetching watchlist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a ticker to watchlist
router.post('/watchlist', authenticateToken, async (req, res) => {
  const { ticker } = req.body;
  const userId = req.user.id;

  if (!ticker) {
    return res.status(400).json({ message: 'Ticker symbol is required.' });
  }

  try {
    await db.addWatchlistItem(userId, ticker);
    res.status(201).json({ message: 'Ticker added to watchlist.' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Ticker already in watchlist.' });
    }
    console.error('Error adding ticker to watchlist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove a ticker from watchlist
router.delete('/watchlist/:ticker', authenticateToken, async (req, res) => {
  const { ticker } = req.params;
  const userId = req.user.id;

  try {
    await db.removeWatchlistItem(userId, ticker);
    res.json({ message: 'Ticker removed from watchlist.' });
  } catch (err) {
    console.error('Error removing ticker from watchlist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
