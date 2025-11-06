const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database.js');

const app = express();
const port = 8080;

let db;

async function main() {
  try {
    db = await initializeDatabase();
    console.log('Database initialized successfully.');

    app.use(express.json()); // Middleware to parse JSON bodies

    // API endpoints
    app.get('/api/themes', async (req, res) => {
      try {
        const themes = await db.all('SELECT * FROM themes');
        res.json(themes);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/fonts', async (req, res) => {
      try {
        const fonts = await db.all('SELECT * FROM fonts');
        res.json(fonts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/settings', async (req, res) => {
        try {
            const settings = await db.all('SELECT * FROM settings');
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
                await db.run('UPDATE settings SET value = ? WHERE key = ?', [theme, 'theme']);
            }
            if (font) {
                await db.run('UPDATE settings SET value = ? WHERE key = ?', [font, 'font']);
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