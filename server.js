// server.js (Refactored)
const express = require('express');
const fileUpload = require('express-fileupload'); // Added for importer
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const setupDatabase = require('./database');
const { initializeAllCronJobs, captureEodPrices, runOrderWatcher } = require('./services/cronJobs');

// Import all the new route files
const transactionRoutes = require('./routes/transactions');
const accountRoutes = require('./routes/accounts');
const reportingRoutes = require('./routes/reporting');
const orderRoutes = require('./routes/orders');
const utilityRoutes = require('./routes/utility');
const importerRoutes = require('./routes/importer'); // Added importer route

// --- Logger Setup ---
const logDirectory = path.join(__dirname, 'logs');
const logFile = path.join(logDirectory, 'log.log');

// Ensure log directory exists
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

/**
 * Appends a message to the log file with a timestamp.
 * @param {string} message The message to log.
 */
function log(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} - ${message}\n`);
}

/**
 * Sets up the Express application, initializes the database, and registers all routes and cron jobs.
 * This function is the main entry point for both production and testing environments.
 * @returns {Promise<{app: import('express').Express, db: import('sqlite').Database}>} A promise that resolves with the configured Express app and database connection.
 */
async function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(fileUpload()); // Added for importer
    app.use(express.static('public'));

    // --- Request Logging Middleware ---
    app.use('/api', (req, res, next) => {
        log(`[REQUEST] ${req.method} ${req.originalUrl}`);
        next();
    });

    let db;
    try {
        db = await setupDatabase();
    } catch (error) {
        console.error("CRITICAL: Failed to connect to the database.", error);
        log(`CRITICAL: Failed to connect to the database. ${error.message}`);
        process.exit(1); // Exit if DB connection fails
    }

    // --- Initialize All Scheduled Tasks (but not in test) ---
    if (process.env.NODE_ENV !== 'test') {
        initializeAllCronJobs(db);
    }
    
    // Define the session map here to be shared with routes
    const importSessions = new Map(); 

    // --- Register All API Routes ---
    app.use('/api/transactions', transactionRoutes(db, log, captureEodPrices, importSessions)); // Pass sessions
    app.use('/api/accounts', accountRoutes(db, log));
    app.use('/api/reporting', reportingRoutes(db, log));
    app.use('/api/orders', orderRoutes(db, log));
    app.use('/api/utility', utilityRoutes(db, log, { captureEodPrices }));
    app.use('/api/importer', importerRoutes(db, log, importSessions)); // Pass sessions
    
    return { app, db };
}

// This block runs only when the script is executed directly (e.g., `node server.js`).
// It is skipped when the module is imported, such as in test files.
if (require.main === module) {
    setupApp().then(({ app }) => {
        const PORT = process.env.PORT || 3003;
        app.listen(PORT, () => {
            console.log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
            log(`Server started on port ${PORT}`);
        });
    });
}

// Export the setup function and other necessary components for testing purposes.
module.exports = { setupApp, runOrderWatcher };