const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (db, log) => {
  router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds
      const result = await db.run(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        username,
        hashedPassword
      );
      res.status(201).json({
        message: 'User registered successfully.',
        userId: result.lastID,
      });
    } catch (error) {
      log(`[ERROR] User registration failed: ${error.message}`);
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ message: 'Username already exists.' });
      } else {
        res.status(500).json({ message: 'Error registering user.' });
      }
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required.' });
    }

    try {
      const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        username
      );
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      const accessToken = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.json({ message: 'Login successful.', accessToken: accessToken });
    } catch (error) {
      log(`[ERROR] User login failed: ${error.message}`);
      res.status(500).json({ message: 'Error logging in.' });
    }
  });

  return router;
};
