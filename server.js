// /server.js
/**
 * @file Main server entry point for the Portfolio Tracker application.
 * @module server
 */

require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const { setupCronJobs, captureEodPrices } = require('./services/cronJobs.js');
const { initializeDatabase } = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3003;
const importSessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

/**
 * Main function to set up the application routes and services.
 */
async function setupApp() {
    const db = await initializeDatabase();
    setupCronJobs(db);

    // --- API Routes ---
    const apiRouter = express.Router();
    apiRouter.use('/transactions', require('./routes/transactions.js')(db, captureEodPrices, importSessions));
    apiRouter.use('/orders', require('./routes/orders.js')(db));
    apiRouter.use('/reporting', require('./routes/reporting.js')(db));
    apiRouter.use('/accounts', require('./routes/accounts.js')(db));
    apiRouter.use('/utility', require('./routes/utility.js')(db));
    apiRouter.use('/importer', require('./routes/importer.js')(db, importSessions));
    apiRouter.use('/watchlist', require('./routes/watchlist.js')(db));
    app.use('/api', apiRouter);

    return { app, db, importSessions };
}

/**
 * Starts the server.
 * @param {express.Application} appInstance - The Express application instance.
 */
function startServer(appInstance) {
    if (process.env.NODE_ENV !== 'test') {
        appInstance.listen(PORT, () => {
            console.log(`[${new Date().toISOString()}] Server is running! Open your browser and go to http://localhost:${PORT}`);
        });
    }
}

// --- Application Start ---
if (require.main === module) {
    setupApp().then(({ app: configuredApp }) => {
        // --- Frontend Catch-all for SPA ---
        configuredApp.get(/^(?!\/api).*/, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        
        startServer(configuredApp);
    }).catch(err => {
        console.error(`[FATAL] Failed to start application: ${err.message}`);
        process.exit(1);
    });
}

// Export for testing
module.exports = { setupApp };