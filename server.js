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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

async function setupApp() {
    const db = await setupDatabase();

    // --- Initialize All Scheduled Tasks ---
    initializeAllCronJobs(db);

    // --- Register All API Routes ---
    // The second argument passes dependencies (like the db connection) to the route modules.
    app.use('/api/transactions', transactionRoutes(db, captureEodPrices));
    app.use('/api/accounts', accountRoutes(db));
    app.use('/api/reporting', reportingRoutes(db));
    app.use('/api/orders', orderRoutes(db));
    app.use('/api/utility', utilityRoutes(db, { captureEodPrices }));
    
    return { app, db };
}

// This part starts the server when run directly (e.g., 'npm start' or 'npm run dev')
if (require.main === module) {
    setupApp().then(({ app }) => {
        app.listen(PORT, () => {
            console.log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
        });
    });
}

// This part exports the setup function for testing purposes
module.exports = { setupApp, runOrderWatcher };