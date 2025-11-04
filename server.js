// /server.js
/**
 * @file Main server entry point for the Portfolio Tracker application.
 * @module server
 */

require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
// Destructure all needed functions from cronJobs
const { setupCronJobs, captureEodPrices } = require('./services/cronJobs.js');
const { initializeDatabase } = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3003; // Default production port

// Store import session data in memory (consider alternatives for production scaling if needed)
const importSessions = new Map();

app.use(express.json()); // Middleware to parse JSON bodies

// --- Serve index.html explicitly for the root route FIRST ---
app.get('/', (req, res, next) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading index.html:`, err);
      next(); // Let static or catch-all try
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(data);
    }
  });
});

// --- Static Files Middleware (AFTER explicit / route) ---
const staticPath = path.join(__dirname, 'public');
app.use(
  express.static(staticPath, {
    fallthrough: true, // Allow requests for non-existent static files to pass to next handlers
  })
);

app.use(express.static(path.join(__dirname, 'Portfolio V4', 'public')));

app.use(fileUpload()); // Middleware for handling file uploads

/**
 * Main asynchronous function to set up database connection, cron jobs, and API routes.
 * @async
 * @returns {Promise<{app: express.Application, db: import('sqlite').Database, importSessions: Map<string, any>}>}
 */
async function setupApp() {
  const db = await initializeDatabase();

  /**
   * Simple logger function.
   * @param {string} message - The message to log.
   * @returns {void}
   */
  const log = (message) =>
    console.log(`[${new Date().toISOString()}] ${message}`);

  // --- Pass the 'log' function to setupCronJobs ---
  setupCronJobs(db, log); // Pass both db and log

  // --- API Routes ---
  const apiRouter = express.Router();

  // Mount various API modules, passing database connection, logger, and other dependencies
  apiRouter.use(
    '/transactions',
    require('./routes/transactions.js')(db, log, captureEodPrices)
  );
  apiRouter.use('/orders', require('./routes/orders.js')(db, log));
  apiRouter.use('/reporting', require('./routes/reporting.js')(db, log));
  apiRouter.use('/accounts', require('./routes/accounts.js')(db, log));
  apiRouter.use('/utility', require('./routes/utility.js')(db, log));
  apiRouter.use(
    '/importer',
    require('./routes/importer.js')(db, log, importSessions)
  );
  apiRouter.use('/watchlist', require('./routes/watchlist.js')(db, log));
  apiRouter.use(
    '/advice-sources',
    require('./routes/advice_sources.js')(db, log)
  );
  apiRouter.use('/journal', require('./routes/journal.js')(db, log));
  apiRouter.use('/sources', require('./routes/sources.js')(db, log));
  // --- ADDED: Mount the new documents router ---
  apiRouter.use('/documents', require('./routes/documents.js')(db, log));
  // --- END ADDITION ---

  // Use the '/api' prefix for all API routes
  app.use('/api', apiRouter);

  // --- Frontend Catch-all Route (Simplified - for client-side routing fallback) ---
  // This now only handles non-API, non-root requests.
  app.get(/^(?!\/api|\/$).*/, (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
      // Directly try sending index.html
      if (err) {
        console.error(`Catch-all error sending file: ${err.message}`);
        if (!res.headersSent) {
          res.status(err.status || 404).send('Not Found'); // Send 404 if this fails
        }
      }
    });
  });

  return { app, db, importSessions };
}

/**
 * Starts the Express server listener.
 * @param {express.Application} appInstance - The configured Express application instance.
 * @returns {void}
 */
function startServer(appInstance) {
  // Avoid starting the server listener during automated tests
  if (process.env.NODE_ENV !== 'test') {
    appInstance.listen(PORT, () => {
      console.log(
        `[${new Date().toISOString()}] Server is running! Open your browser and go to http://localhost:${PORT}`
      );
    });
  }
}

// --- Application Start ---
// Check if the script is being run directly (not required by another module like tests)
if (require.main === module) {
  setupApp()
    .then(({ app: configuredApp }) => {
      startServer(configuredApp);
    })
    .catch((err) => {
      console.error(`[FATAL] Failed to start application: ${err.message}`);
      console.error(err.stack); // Log stack trace for detailed debugging
      process.exit(1); // Exit with error code
    });
}

// Export setupApp function for use in automated tests
module.exports = { setupApp };
