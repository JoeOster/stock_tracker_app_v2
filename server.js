// /server.js
/**
 * @file Main server entry point for the Portfolio Tracker application.
 * @module server
 */

// --- Environment Setup ---
require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const { setupCronJobs, captureEodPrices } = require('./services/cronJobs.js');
const { initializeDatabase } = require('./database.js');

// --- Global Variables & App Initialization ---
const app = express();
const PORT = process.env.PORT || 3003;
const importSessions = new Map();

// A simple logger
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

/**
 * Main function to set up and start the application.
 */
async function setupApp() {
    const db = await initializeDatabase();
    setupCronJobs(db);

    // --- API Routes ---
    const apiRouter = express.Router();
    apiRouter.use('/transactions', require('./routes/transactions.js')(db, log, captureEodPrices, importSessions));
    apiRouter.use('/orders', require('./routes/orders.js')(db, log));
    apiRouter.use('/reporting', require('./routes/reporting.js')(db, log));
    apiRouter.use('/accounts', require('./routes/accounts.js')(db, log));
    apiRouter.use('/utility', require('./routes/utility.js')(db, log));
    apiRouter.use('/importer', require('./routes/importer.js')(db, log, importSessions));
    apiRouter.use('/watchlist', require('./routes/watchlist.js')(db, log));

    app.use('/api', apiRouter);

    // --- Frontend Catch-all for SPA ---
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });


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
if (require.main === module) {
    setupApp().then(({ app }) => {
        startServer(app);
    }).catch(err => {
        log(`[FATAL] Failed to start application: ${err.message}`);
        process.exit(1);
    });
}

// Export for testing
module.exports = { setupApp, log };