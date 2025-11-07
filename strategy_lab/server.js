require('dotenv').config();

const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database.js');
const { authenticateToken } = require('./services/authService');
const { setupCronJobs } = require('./services/cronJobs');
const app = express();
const port = 8080;

let db;

const bcrypt = require('bcrypt');

async function main() {
  try {
    db = await initializeDatabase();
    console.log('Database initialized successfully.');

    // Seed a default user if authentication is disabled and no users exist
    if (process.env.ENABLE_AUTH !== 'true') {
      const users = await db.all('SELECT id FROM users');
      if (users.length === 0) {
        const hashedPassword = await bcrypt.hash('devpassword', 10); // Dummy password for devuser
        console.log('Seeding user with hashedPassword:', hashedPassword);
        const result = await db.run(
          'INSERT INTO users (username, password_hash) VALUES (?, ?)',
          'devuser',
          hashedPassword
        );
        console.log('Result of user seed:', result);
        console.log(
          'Seeded default devuser because authentication is disabled and no users were found.'
        );

        // Associate the seeded settings with the seeded user
        const settings = await db.get(
          'SELECT id FROM settings WHERE user_id IS NULL'
        );
        if (settings) {
          await db.run(
            'UPDATE settings SET user_id = ? WHERE id = ?',
            1,
            settings.id
          );
          console.log('Associated seeded settings with user 1.');
        }
      }
    }

    setupCronJobs(db, console.log);

    app.use(express.json()); // Middleware to parse JSON bodies

    // Development-only middleware to set req.user for unauthenticated requests
    app.use((req, res, next) => {
      if (process.env.ENABLE_AUTH !== 'true' && req.headers['x-user-id']) {
        req.user = { id: parseInt(req.headers['x-user-id'], 10) };
      }
      next();
    });

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

    // API endpoints
    app.get('/api/themes', async (req, res) => {
      try {
        let themes = [];
        if (req.user && req.user.id) {
          themes = await db.all(
            'SELECT * FROM themes WHERE user_id = ?',
            req.user.id
          );
        }
        res.json(themes);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/fonts', async (req, res) => {
      try {
        let fonts = [];
        if (req.user && req.user.id) {
          fonts = await db.all(
            'SELECT * FROM fonts WHERE user_id = ?',
            req.user.id
          );
        }
        res.json(fonts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/settings', async (req, res) => {
      try {
        let settings = {};
        if (req.user && req.user.id) {
          settings = await db.get(
            'SELECT * FROM settings WHERE user_id = ?',
            req.user.id
          );
        }
        res.json(settings || {});
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/settings', async (req, res) => {
      try {
        if (!req.user || !req.user.id) {
          return res
            .status(400)
            .json({ message: 'User not identified. Cannot save settings.' });
        }
        const { theme, font } = req.body;
        const updateClauses = [];
        const updateValues = [];
        if (theme) {
          updateClauses.push('theme = ?');
          updateValues.push(theme);
        }
        if (font) {
          updateClauses.push('font = ?');
          updateValues.push(font);
        }

        if (updateClauses.length > 0) {
          updateValues.push(req.user.id);
          const sql = `UPDATE settings SET ${updateClauses.join(', ')} WHERE user_id = ?`;
          await db.run(sql, ...updateValues);
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
