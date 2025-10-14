// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-Portfolio-Manager-Phase-0/server.js
// server.js (Refactored)
const express = require('express');
const fileUpload = require('express-fileupload');
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
const importerRoutes = require('./routes/importer');

// --- Logger Setup ---
const logDirectory = path.join(__dirname, 'logs');
const logFile = path.join(logDirectory, 'log.log');

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

function log(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} - ${message}\n`);
}

async function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(fileUpload());
    app.use(express.static('public'));

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
        process.exit(1);
    }

    if (process.env.NODE_ENV !== 'test') {
        initializeAllCronJobs(db);
    }
    
    const importSessions = new Map(); 

    // --- Register All API Routes ---
    app.use('/api/transactions', transactionRoutes(db, log, captureEodPrices, importSessions));
    app.use('/api/accounts', accountRoutes(db, log));
    app.use('/api/reporting', reportingRoutes(db, log));
    app.use('/api/orders', orderRoutes(db, log));
    app.use('/api/utility', utilityRoutes(db, log, { captureEodPrices }));
    app.use('/api/importer', importerRoutes(db, log, importSessions));
    
    return { app, db };
}

if (require.main === module) {
    setupApp().then(({ app }) => {
        const PORT = process.env.PORT || 3003;
        app.listen(PORT, () => {
            console.log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
            log(`Server started on port ${PORT}`);
        });
    });
}

module.exports = { setupApp, runOrderWatcher };