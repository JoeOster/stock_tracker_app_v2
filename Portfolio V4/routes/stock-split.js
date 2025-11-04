const express = require('express');
const router = express.Router();
const { handleStockSplit } = require('./stock-split-logic.js');

module.exports = (db, log) => {
  router.post('/', async (req, res) => {
    try {
      const result = await handleStockSplit(req.body, res);
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      log(`[ERROR] Failed to process stock split: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to process stock split.' });
      }
    }
  });

  return router;
};
