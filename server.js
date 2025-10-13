// server.js (Refactored)
const express = require('express');
require('dotenv').config();
const setupDatabase = require('./database');
const { initializeAllCronJobs, captureEodPrices, runOrderWatcher } = require('./services/cronJobs');

// Import all the new route files
const transactionRoutes = require('./routes/transactions');
const accountRoutes = require('./routes/accounts');
const reportingRoutes = require('./routes/reporting');
const orderRoutes = require('./routes/orders');
const utilityRoutes = require('./routes/utility');

/**
 * Sets up the Express application, initializes the database, and registers all routes and cron jobs.
 * This function is the main entry point for both production and testing environments.
 * @returns {Promise<{app: import('express').Express, db: import('sqlite').Database}>} A promise that resolves with the configured Express app and database connection.
 */
async function setupApp() {
    // FIX: Create the express app inside the setup function to ensure test isolation.
    const app = express();
    app.use(express.json());
    app.use(express.static('public'));

    const db = await setupDatabase();

    // --- Initialize All Scheduled Tasks (but not in test) ---
    if (process.env.NODE_ENV !== 'test') {
        initializeAllCronJobs(db);
    }

    // --- Register All API Routes ---
    app.use('/api/transactions', transactionRoutes(db, captureEodPrices));
    app.use('/api/accounts', accountRoutes(db));
    app.use('/api/reporting', reportingRoutes(db));
    app.use('/api/orders', orderRoutes(db));
    app.use('/api/utility', utilityRoutes(db, { captureEodPrices }));
    
    return { app, db };
}

// This block runs only when the script is executed directly (e.g., `node server.js`).
// It is skipped when the module is imported, such as in test files.
if (require.main === module) {
    setupApp().then(({ app }) => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
        });
    });
}

// Export the setup function and other necessary components for testing purposes.
module.exports = { setupApp, runOrderWatcher };