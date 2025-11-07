require('dotenv').config();

const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database.js');
const { authenticateToken } = require('./services/authService');
const { setupCronJobs } = require('./services/cronJobs');
const { setupCronJobs } = require('./services/cronJobs');

const app = express();
const port = 8080;

let db;

async function main() {
  try {
    db = await initializeDatabase();
    console.log('Database initialized successfully.');
    setupCronJobs(db, console.log);
    setupCronJobs(db, console.log);

    app.use(express.json()); // Middleware to parse JSON bodies

    // Conditionally apply authentication middleware
    const authRouter = require('./routes/auth.js')(db, console.log);
    app.use('/api/auth', authRouter);

    app.get('/api/config', (req, res) => {
      res.json({ enableAuth: process.env.ENABLE_AUTH === 'true' });
    });

    // Development-only endpoint for user switching
    app.get('/api/dev/users', async (req, res) => {
      if (process.env.ENABLE_AUTH === 'true') {
        return res
          .status(403)
          .json({ message: 'Access denied. Authentication is enabled.' });
      }
      try {
        const users = await db.all('SELECT id, username FROM users');
        res.json(users);
      } catch (error) {
        console.error('Error fetching dev users:', error);
        res.status(500).json({ message: 'Error fetching users.' });
      }
    });

    // Conditionally apply authentication middleware to all other /api routes
    if (process.env.ENABLE_AUTH === 'true') {
      app.use('/api', authenticateToken);
    }

    const accountsRouter = require('./routes/accounts.js')(db, console.log);
    app.use('/api/accounts', accountsRouter);

    const watchlistRouter = require('./routes/watchlist.js');
    app.use('/api', watchlistRouter);

    // API endpoints
    app.get('/api/themes', async (req, res) => {
      try {
        const themes = await db.all(
          'SELECT * FROM themes WHERE user_id = ?',
          req.user.id
        );
        res.json(themes);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/fonts', async (req, res) => {
      try {
        const fonts = await db.all(
          'SELECT * FROM fonts WHERE user_id = ?',
          req.user.id
        );
        res.json(fonts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/settings', async (req, res) => {
      try {
        const settings = await db.all(
          'SELECT * FROM settings WHERE user_id = ?',
          req.user.id
        );
        const settingsObj = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});
        res.json(settingsObj);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/settings', async (req, res) => {
      try {
        const { theme, font } = req.body;
        if (theme) {
          await db.run(
            'INSERT OR REPLACE INTO settings (key, value, user_id) VALUES (?, ?, ?)',
            'theme',
            theme,
            req.user.id
          );
        }
        if (font) {
          await db.run(
            'INSERT OR REPLACE INTO settings (key, value, user_id) VALUES (?, ?, ?)',
            'font',
            font,
            req.user.id
          );
        }
        res.json({ message: 'Settings saved successfully.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve static files from the 'public' directory
    app.use(express.static(path.join(__dirname, 'public')));

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

main();
