// server.js - v2.1 - 2025-10-04

const express = require('express');
const fileUpload = require('express-fileupload');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const setupDatabase = require('./database');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(fileUpload());

let model;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
} else {
    console.warn("GEMINI_API_KEY not found in .env file. AI features will be disabled.");
}

function calculateRealizedPL(transactions) {
    const positions = {};
    const realizedByExchange = {};
    const plBySellTransactionId = new Map();
    let totalRealized = 0;
    const txs = JSON.parse(JSON.stringify(transactions));
    txs.sort((a, b) => {
        const dateA = new Date(a.transaction_date);
        const dateB = new Date(b.transaction_date);
        if (dateA.getTime() !== dateB.getTime()) { return dateA - dateB; }
        if (a.transaction_type === 'BUY' && b.transaction_type === 'SELL') { return -1; }
        if (a.transaction_type === 'SELL' && b.transaction_type === 'BUY') { return 1; }
        return a.id - b.id;
    });
    for (const tx of txs) {
        const key = `${tx.ticker}-${tx.exchange}`;
        if (!positions[key]) { positions[key] = { buys: [] }; }
        if (tx.transaction_type === 'BUY') {
            positions[key].buys.push({ id: tx.id, quantity: tx.quantity, price: tx.price });
        } else {
            let sellQty = tx.quantity;
            let realizedForThisSell = 0;
            while (sellQty > 0 && positions[key].buys.length > 0) {
                const oldestBuy = positions[key].buys[0];
                const matchQty = Math.min(sellQty, oldestBuy.quantity);
                realizedForThisSell += matchQty * (tx.price - oldestBuy.price);
                sellQty -= matchQty;
                oldestBuy.quantity -= matchQty;
                if (oldestBuy.quantity < 1e-5) { positions[key].buys.shift(); }
            }
            if (!realizedByExchange[tx.exchange]) realizedByExchange[tx.exchange] = 0;
            realizedByExchange[tx.exchange] += realizedForThisSell;
            totalRealized += realizedForThisSell;
            plBySellTransactionId.set(tx.id, realizedForThisSell);
        }
    }
    return { byExchange: realizedByExchange, total: totalRealized, plBySellTransactionId };
}

async function updatePositionsAndPrices(db) {
    console.log("Starting end-of-day position and price update...");
    try {
        // Step 1: Calculate all current open positions from the transactions table
        const openPositionsQuery = `
            WITH CostBasis AS (
                SELECT ticker, exchange, SUM(price * quantity) / SUM(quantity) as weighted_avg_cost
                FROM transactions
                WHERE transaction_type = 'BUY'
                GROUP BY ticker, exchange
            ), NetQuantity AS (
                SELECT ticker, exchange, SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE -quantity END) as net_quantity
                FROM transactions
                GROUP BY ticker, exchange
            )
            SELECT nq.ticker, nq.exchange, nq.net_quantity, cb.weighted_avg_cost
            FROM NetQuantity nq
            JOIN CostBasis cb ON nq.ticker = cb.ticker AND nq.exchange = cb.exchange
            WHERE nq.net_quantity > 0.00001;
        `;
        const openPositions = await db.all(openPositionsQuery);

        // Step 2: Clear the old positions table and insert the newly calculated ones
        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM positions');
        const insertPosition = await db.prepare('INSERT INTO positions (ticker, exchange, quantity, cost_basis) VALUES (?, ?, ?, ?)');
        for (const pos of openPositions) {
            await insertPosition.run(pos.ticker, pos.exchange, pos.net_quantity, pos.weighted_avg_cost);
        }
        await insertPosition.finalize();
        await db.run('COMMIT');
        console.log(`Updated ${openPositions.length} positions in the database.`);

        // Step 3: Get a unique list of tickers from our open positions
        const uniqueTickers = [...new Set(openPositions.map(p => p.ticker))];
        if (uniqueTickers.length === 0) {
            console.log("No open positions to update prices for.");
            return;
        }

        // Step 4: Fetch the latest price for each ticker from the API
        console.log(`Fetching prices for ${uniqueTickers.length} tickers...`);
        let pricesUpdated = 0;
        for (const ticker of uniqueTickers) {
            if (!process.env.ALPHA_VANTAGE_API_KEY) {
                console.warn("No Alpha Vantage API Key found in .env, skipping price fetch.");
                continue;
            }
            try {
                const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
                const data = await response.json();
                if (data['Global Quote'] && data['Global Quote']['05. price']) {
                    const price = parseFloat(data['Global Quote']['05. price']);
                    const now = new Date().toISOString();
                    
                    // Step 5: Save the fetched price and timestamp into the stock_prices table
                    await db.run('INSERT OR REPLACE INTO stock_prices (ticker, last_price, last_updated) VALUES (?, ?, ?)', [ticker, price, now]);
                    pricesUpdated++;
                } else {
                    console.warn(`Could not fetch price for ${ticker}. Response:`, data);
                }
            } catch (apiError) {
                console.error(`Error fetching price for ${ticker}:`, apiError);
            }
        }
        console.log(`Successfully updated prices for ${pricesUpdated} tickers.`);
        console.log("End-of-day update process finished.");

    } catch (error) {
        console.error("Critical error during updatePositionsAndPrices:", error);
        await db.run('ROLLBACK'); // Rollback any partial transaction
    }
}

async function startServer() {
    const db = await setupDatabase();

    // Get daily positions and transactions for a specific date
// Get daily positions and transactions for a specific date
    app.get('/api/positions/:date', async (req, res) => {
        try {
            const selectedDate = req.params.date;
            const dailyTransactions = await db.all(`SELECT * FROM transactions WHERE date(transaction_date) = date(?);`, selectedDate);
            const allTransactionsToDate = await db.all(`SELECT * FROM transactions WHERE date(transaction_date) <= date(?)`, selectedDate);
            
            const { plBySellTransactionId } = calculateRealizedPL(allTransactionsToDate);
            dailyTransactions.forEach(tx => {
                if (tx.transaction_type === 'SELL') {
                    tx.realizedPL = plBySellTransactionId.get(tx.id) || 0;
                }
            });
            
            // This query is now enhanced with a JOIN to our new price table
            const endOfDayPositionsQuery = `
                WITH CostBasis AS (
                    SELECT ticker, exchange, SUM(price * quantity) / SUM(quantity) as weighted_avg_cost
                    FROM transactions
                    WHERE transaction_type = 'BUY' AND date(transaction_date) <= date(?)
                    GROUP BY ticker, exchange
                ), NetQuantity AS (
                    SELECT ticker, exchange, SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE -quantity END) as net_quantity
                    FROM transactions
                    WHERE date(transaction_date) <= date(?)
                    GROUP BY ticker, exchange
                )
                SELECT 
                    nq.ticker, 
                    nq.exchange, 
                    nq.net_quantity, 
                    COALESCE(cb.weighted_avg_cost, 0) as weighted_avg_cost,
                    sp.last_price,
                    sp.last_updated
                FROM NetQuantity nq
                LEFT JOIN CostBasis cb ON nq.ticker = cb.ticker AND nq.exchange = cb.exchange
                LEFT JOIN stock_prices sp ON nq.ticker = sp.ticker
                WHERE nq.net_quantity > 0.00001;
            `;
            const endOfDayPositions = await db.all(endOfDayPositionsQuery, selectedDate, selectedDate);
            
            res.json({ dailyTransactions, endOfDayPositions });
        } catch (error) {
            console.error("Failed to get daily activity:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    });

    // Add a new transaction
    app.post('/api/transactions', async (req, res) => {
        try {
            const { exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_expiration } = req.body;
            const ticker = req.body.ticker ? req.body.ticker.toUpperCase() : null;
            
            if (!ticker || !exchange || !transaction_date || !['BUY', 'SELL'].includes(transaction_type) || quantity <= 0 || price <= 0) {
                return res.status(400).json({ message: 'Invalid input.' });
            }
            
            const query = 'INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_expiration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await db.run(query, [ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up || null, limit_price_down || null, limit_expiration || null]);
            
            res.status(201).json({ message: 'Success' });
        } catch (error) {
            console.error('Failed to add transaction:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    // Get all transactions
    app.get('/api/transactions', async (req, res) => {
        try {
            const transactions = await db.all('SELECT * FROM transactions ORDER BY transaction_date ASC, id ASC');
            res.json(transactions);
        } catch (error) {
            console.error('Failed to get transactions:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    });

    // Update a specific transaction
    app.put('/api/transactions/:id', async (req, res) => {
        try {
            const { exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_expiration } = req.body;
            const ticker = req.body.ticker ? req.body.ticker.toUpperCase() : null;
            const query = 'UPDATE transactions SET ticker = ?, exchange = ?, transaction_type = ?, quantity = ?, price = ?, transaction_date = ?, limit_price_up = ?, limit_price_down = ?, limit_expiration = ? WHERE id = ?';
            
            await db.run(query, [ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up || null, limit_price_down || null, limit_expiration || null, req.params.id]);
            
            res.json({ message: 'Transaction updated.' });
        } catch (error) {
            console.error('Failed to update transaction:', error);
            res.status(500).json({ message: 'Error updating transaction.' });
        }
    });

    // Delete a specific transaction
    app.delete('/api/transactions/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM transactions WHERE id = ?', req.params.id);
            res.json({ message: 'Transaction deleted.' });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            res.status(500).json({ message: 'Error deleting transaction.' });
        }
    });

    // Import a batch of transactions
    app.post('/api/transactions/batch', async (req, res) => {
        const transactions = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ message: 'Invalid input. Expected an array of transactions.' });
        }
        
        const insert = db.prepare('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price) VALUES (?, ?, ?, ?, ?, ?)');
        
        try {
            await db.run('BEGIN TRANSACTION');
            for (const tx of transactions) {
                const ticker = tx.ticker ? tx.ticker.toUpperCase() : null;
                if (!ticker || !tx.exchange || !tx.transaction_date || !['BUY', 'SELL'].includes(tx.transaction_type) || tx.quantity <= 0 || tx.price <= 0) {
                    throw new Error('Invalid transaction data in batch.');
                }
                await insert.run(tx.transaction_date, ticker, tx.exchange, tx.transaction_type, tx.quantity, tx.price);
            }
            await db.run('COMMIT');
            res.status(201).json({ message: `${transactions.length} transactions imported successfully.` });
        } catch (error) {
            await db.run('ROLLBACK');
            console.error('Failed to import batch transactions:', error);
            res.status(500).json({ message: 'Failed to import transactions. Please check file format.' });
        } finally {
            await insert.finalize();
        }
    });

    // Get the total realized P&L
    app.get('/api/realized_pl', async (req, res) => {
        try {
            const allTransactions = await db.all('SELECT * FROM transactions');
            const realized = calculateRealizedPL(allTransactions);
            res.json(realized);
        } catch (error) {
            console.error("Failed to calculate P&L:", error);
            res.status(500).json({ message: "Error calculating P&L" });
        }
    });

    // Get a consolidated portfolio overview
    app.get('/api/portfolio/overview', async (req, res) => {
        try {
            const query = `
                SELECT
                    p.ticker,
                    SUM(p.quantity) as total_quantity,
                    SUM(p.quantity * p.cost_basis) / SUM(p.quantity) as weighted_avg_cost,
                    sp.last_price
                FROM positions p
                LEFT JOIN stock_prices sp ON p.ticker = sp.ticker
                GROUP BY p.ticker
                ORDER BY p.ticker;
            `;
            const overview = await db.all(query);
            res.json(overview);
        } catch (error) {
            console.error("Failed to get portfolio overview:", error);
            res.status(500).json({ message: "Error fetching portfolio overview." });
        }
    });

    // Get all account value snapshots
    app.get('/api/snapshots', async (req, res) => {
        try {
            const snapshots = await db.all('SELECT * FROM account_snapshots ORDER BY snapshot_date ASC');
            res.json(snapshots);
        } catch (error) {
            console.error("Failed to fetch snapshots:", error);
            res.status(500).json({ message: "Error fetching snapshots" });
        }
    });

    // Add or update an account value snapshot
    app.post('/api/snapshots', async (req, res) => {
        try {
            const { exchange, snapshot_date, value } = req.body;
            await db.run(`INSERT OR REPLACE INTO account_snapshots (exchange, snapshot_date, value) VALUES (?, ?, ?)`, [exchange, snapshot_date, value]);
            res.status(201).json({ message: 'Snapshot saved.' });
        } catch (error) {
            console.error('Error saving snapshot:', error);
            res.status(500).json({ message: 'Error saving snapshot.' });
        }
    });

    // Delete a specific snapshot
    app.delete('/api/snapshots/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM account_snapshots WHERE id = ?', req.params.id);
            res.json({ message: 'Snapshot deleted successfully' });
        } catch (error) {
            console.error('Failed to delete snapshot:', error);
            res.status(500).json({ message: 'Error deleting snapshot' });
        }
    });
    
    // Process a screenshot with AI
    app.post('/api/process-screenshot', async (req, res) => {
        if (!model) {
            return res.status(500).json({ message: "AI model not initialized. Check GEMINI_API_KEY."});
        }
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }
        try {
            const screenshotFile = req.files.screenshot;
            const imageBuffer = screenshotFile.data;
            const prompt = `Analyze the image of a brokerage transaction list. Extract transactions and format as a JSON array with keys: 'transaction_date' (YYYY-MM-DD), 'ticker' (uppercase), 'exchange', 'transaction_type' (BUY or SELL), 'quantity' (number), 'price' (number). Respond with only the raw JSON array.`;
            
            const result = await model.generateContent([prompt, { inlineData: { data: imageBuffer.toString("base64"), mimeType: screenshotFile.mimetype, } }]);
            const responseText = result.response.text();
            const jsonMatch = responseText.match(/\[.*\]/s);
            
            if (!jsonMatch) { throw new Error("AI did not return valid JSON."); }
            
            const jsonData = JSON.parse(jsonMatch[0]);
            res.json(jsonData);
        } catch (error) {
            console.error("AI processing error:", error);
            res.status(500).json({ message: "Error processing image with AI." });
        }
    });

// Task endpoint to trigger the end-of-day update process
    app.post('/api/tasks/update-prices', async (req, res) => {
        // Run the update in the background; don't make the client wait
        updatePositionsAndPrices(db); 
        res.status(202).json({ message: "Price update process initiated." });
    });

    app.listen(PORT, () => {
        console.log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
    });
}

startServer();