// /server.js
/**
 * @file Main server entry point for the Portfolio Tracker application.
 * @module server
 */

console.log("Server.js - Step 1: Starting script execution.");

// --- Environment Setup ---
console.log("Server.js - Step 2: Requiring dotenv.");
require('dotenv').config();
console.log("Server.js - Step 3: Requiring express.");
const express = require('express');
console.log("Server.js - Step 4: Requiring express-fileupload.");
const fileUpload = require('express-fileupload');
console.log("Server.js - Step 5: Requiring path.");
const path = require('path');
console.log("Server.js - Step 6: Requiring cronJobs service.");
const { setupCronJobs, captureEodPrices } = require('./services/cronJobs.js');
console.log("Server.js - Step 7: Requiring database service.");
const { initializeDatabase } = require('./database.js');

// --- Global Variables & App Initialization ---
console.log("Server.js - Step 8: Initializing Express app.");
const app = express();
const PORT = process.env.PORT || 3003;
const importSessions = new Map();

// A simple logger
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

/**
 * Main function to set up the application routes and services.
 */
async function setupApp() {
    console.log("Server.js - Step 9: setupApp() called.");
    const db = await initializeDatabase();
    console.log("Server.js - Step 10: Database initialized successfully.");
    setupCronJobs(db);
    console.log("Server.js - Step 11: Cron jobs setup complete.");

    // --- API Routes ---
    const apiRouter = express.Router();
    console.log("Server.js - Step 12: Loading transactions route.");
    apiRouter.use('/transactions', require('./routes/transactions.js')(db, log, captureEodPrices, importSessions));
    console.log("Server.js - Step 13: Loading orders route.");
    apiRouter.use('/orders', require('./routes/orders.js')(db, log));
    console.log("Server.js - Step 14: Loading reporting route.");
    apiRouter.use('/reporting', require('./routes/reporting.js')(db, log));
    console.log("Server.js - Step 15: Loading accounts route.");
    apiRouter.use('/accounts', require('./routes/accounts.js')(db, log));
    console.log("Server.js - Step 16: Loading utility route.");
    apiRouter.use('/utility', require('./routes/utility.js')(db, log));
    console.log("Server.js - Step 17: Loading importer route.");
    apiRouter.use('/importer', require('./routes/importer.js')(db, log, importSessions));
    console.log("Server.js - Step 18: Loading watchlist route.");
    apiRouter.use('/watchlist', require('./routes/watchlist.js')(db, log));

    app.use('/api', apiRouter);
    console.log("Server.js - Step 19: API routes configured.");

    return { app, db, log, importSessions };
}

/**
 * Starts the server.
 * @param {express.Application} appInstance - The Express application instance.
 */
function startServer(appInstance) {
    if (process.env.NODE_ENV !== 'test') {
        appInstance.listen(PORT, () => {
            log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
        });
    }
}

// --- Application Start ---
console.log("Server.js - Step 20: Beginning application startup process.");
if (require.main === module) {
    setupApp().then(({ app: configuredApp }) => {

        // --- Frontend Catch-all for SPA ---
        // This MUST be the last route handler.
        // DO NOT MESS WITH THIS: Using a simple '*' wildcard breaks the Express router.
        // This specific regex is required to correctly handle all non-API routes and
        // serve the index.html file, allowing the client-side router to take over.
        configuredApp.get(/^(?!\/api).*/, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
        startServer(configuredApp);

    }).catch(err => {
        log(`[FATAL] Failed to start application: ${err.message}`);
        process.exit(1);
    });
}

// Export for testing
module.exports = { setupApp, log };