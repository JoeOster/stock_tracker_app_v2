const express = require('express');
const router = express.Router();

module.exports = (db, log) => {
  router.get('/', async (req, res) => {
    try {
      const holders = await db.all(
        'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
        req.user.id
      );
      res.json(holders);
    } catch (error) {
      log(`[ERROR] Failed to fetch accounts: ${error.message}`);
      res.status(500).json({ message: 'Error fetching account holders.' });
    }
  });

  router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Account name cannot be empty.' });
    }
    try {
      const result = await db.run(
        'INSERT INTO accounts (name, user_id) VALUES (?, ?)',
        name,
        req.user.id
      );
      res.status(201).json({ id: result.lastID, name });
    } catch (error) {
      log(`[ERROR] Failed to add account: ${error.message}`);
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ message: 'Account name already exists.' });
      } else {
        res.status(500).json({ message: 'Error adding account holder.' });
      }
    }
  });

  return router;
};
