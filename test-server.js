// test-server.js
const express = require('express');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const setupDatabase = require('./database');

// Import all route files
const transactionRoutes = require('./routes/transactions');
const accountRoutes = require('./routes/accounts');
const reportingRoutes = require('./routes/reporting');
const orderRoutes = require('./routes/orders');
const utilityRoutes = require('./routes/utility');
const importerRoutes = require('./routes/importer');

async function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(fileUpload());
    app.use(express.static('public'));

    // Force the environment to 'test'
    process.env.NODE_ENV = 'test';

    let db;
    try {
        db = await setupDatabase();
    } catch (error) {
        console.error("CRITICAL: Failed to connect to the test database.", error);
        process.exit(1);
    }
    
    const importSessions = new Map(); 

    // Register All API Routes
    app.use('/api/transactions', transactionRoutes(db, console.log, null, importSessions));
    app.use('/api/accounts', accountRoutes(db, console.log));
    app.use('/api/reporting', reportingRoutes(db, console.log));
    app.use('/api/orders', orderRoutes(db, console.log));
    app.use('/api/utility', utilityRoutes(db, console.log, {}));
    app.use('/api/importer', importerRoutes(db, console.log, importSessions));
    
    return { app, db };
}

if (require.main === module) {
    setupApp().then(({ app }) => {
        const PORT = 3112; // Use a dedicated port for testing
        app.listen(PORT, () => {
            console.log(`
=================================================
  ✅ Test Server is running!
  - Open your browser to http://localhost:${PORT}
  - The server is using the 'test.db' database.
=================================================
            `);
        });
    });
}

module.exports = { setupApp };
