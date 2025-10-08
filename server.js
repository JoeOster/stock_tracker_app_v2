// server.js - v2.9.1 (Account Holder Aware Endpoints)
const express = require('express');
require('dotenv').config();
const fetch = require('node-fetch');
const cron = require('node-cron');
const setupDatabase = require('./database');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// This function now sets up the app but does not start the server listening
async function setupApp() {
    const db = await setupDatabase();

    if (process.env.NODE_ENV !== 'test') {
        cron.schedule('2 16 * * 1-5', () => {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            console.log('[CRON] Triggered ideal EOD process.');
            captureEodPrices(db, today);
        }, { timezone: "America/New_York" });
    }

    async function captureEodPrices(db, dateToProcess) {
        console.log(`[EOD Process] Running for date: ${dateToProcess}`);
        try {
            const soldTickers = await db.all(`SELECT DISTINCT ticker FROM transactions WHERE transaction_date = ? AND transaction_type = 'SELL'`, dateToProcess);
            if (soldTickers.length === 0) {
                console.log(`[EOD Process] No stocks sold on ${dateToProcess}.`);
                return;
            }
            for (const { ticker } of soldTickers) {
                const remaining = await db.get(`SELECT SUM(quantity_remaining) as total FROM transactions WHERE ticker = ?`, ticker);
                if (remaining && remaining.total < 0.00001) {
                    const existingPrice = await db.get('SELECT id FROM historical_prices WHERE ticker = ? AND date = ?', [ticker, dateToProcess]);
                    if (existingPrice) continue;
                    console.log(`[EOD Process] Position for ${ticker} closed. Fetching closing price...`);
                    const apiKey = process.env.FINNHUB_API_KEY;
                    const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
                    if (apiRes.ok) {
                        const data = await apiRes.json();
                        const closePrice = (data && data.c > 0) ? data.c : null;
                        if (closePrice) {
                            await db.run('INSERT INTO historical_prices (ticker, date, close_price) VALUES (?, ?, ?)', [ticker, dateToProcess, closePrice]);
                            console.log(`[EOD Process] Froze price for ${ticker} at ${closePrice} for ${dateToProcess}.`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[EOD Process] Error for ${dateToProcess}:`, error);
        }
    }
    
    // --- ALL API ROUTES GO HERE ---
    
    app.post('/api/prices/batch', async (req, res) => {
        const { tickers, date } = req.body;
        if (!tickers || !Array.isArray(tickers)) {
            return res.status(400).json({ message: 'Invalid request body, expected a "tickers" array.' });
        }
        const prices = {};
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) return res.status(500).json({ message: "API key not configured on server." });
        for (const ticker of tickers) {
            try {
                const cachedPrice = await db.get('SELECT close_price FROM historical_prices WHERE ticker = ? AND date = ?', [ticker, date]);
                if (cachedPrice) {
                    prices[ticker] = cachedPrice.close_price;
                    continue;
                }
                const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
                if (apiRes.ok) {
                    const data = await apiRes.json();
                    prices[ticker] = (data && data.c > 0) ? data.c : null;
                } else {
                    prices[ticker] = null;
                }
                await new Promise(resolve => setTimeout(resolve, 150));
            } catch (error) {
                console.error(`Error fetching price for ${ticker} in batch:`, error);
                prices[ticker] = null;
            }
        }
        res.json(prices);
    });

    app.post('/api/tasks/capture-eod/:date', async (req, res) => {
        const { date } = req.params;
        captureEodPrices(db, date);
        res.status(202).json({ message: `EOD process for ${date} acknowledged.` });
    });

    app.get('/api/exchanges', async (req, res) => {
        try {
            const exchanges = await db.all('SELECT * FROM exchanges ORDER BY name');
            res.json(exchanges);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching exchanges.' });
        }
    });

    app.post('/api/exchanges', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') { return res.status(400).json({ message: 'Exchange name cannot be empty.' }); }
        try {
            const result = await db.run('INSERT INTO exchanges (name) VALUES (?)', name);
            res.status(201).json({ id: result.lastID, name });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') { res.status(409).json({ message: 'Exchange name already exists.' }); } 
            else { res.status(500).json({ message: 'Error adding exchange.' }); }
        }
    });

    app.put('/api/exchanges/:id', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') { return res.status(400).json({ message: 'Exchange name cannot be empty.' }); }
        try {
            const oldExchange = await db.get('SELECT name FROM exchanges WHERE id = ?', req.params.id);
            if(oldExchange) {
                await db.run('BEGIN TRANSACTION');
                await db.run('UPDATE transactions SET exchange = ? WHERE exchange = ?', [name, oldExchange.name]);
                await db.run('UPDATE exchanges SET name = ? WHERE id = ?', [name, req.params.id]);
                await db.run('COMMIT');
            }
            res.json({ message: 'Exchange updated successfully.' });
        } catch (error) {
            await db.run('ROLLBACK');
            res.status(500).json({ message: 'Error updating exchange.' });
        }
    });

    app.delete('/api/exchanges/:id', async (req, res) => {
        try {
            const oldExchange = await db.get('SELECT name FROM exchanges WHERE id = ?', req.params.id);
            if(oldExchange) {
                 const inUse = await db.get('SELECT 1 FROM transactions WHERE exchange = ? LIMIT 1', oldExchange.name);
                 if (inUse) { return res.status(400).json({ message: 'Cannot delete an exchange that is currently in use by transactions.' }); }
            }
            await db.run('DELETE FROM exchanges WHERE id = ?', req.params.id);
            res.json({ message: 'Exchange deleted successfully.' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting exchange.' });
        }
    });

    // --- ACCOUNT HOLDER API ENDPOINTS ---
    app.get('/api/account_holders', async (req, res) => {
        try {
            const holders = await db.all('SELECT * FROM account_holders ORDER BY name');
            res.json(holders);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching account holders.' });
        }
    });

    app.post('/api/account_holders', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Account holder name cannot be empty.' });
        }
        try {
            const result = await db.run('INSERT INTO account_holders (name) VALUES (?)', name);
            res.status(201).json({ id: result.lastID, name });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(409).json({ message: 'Account holder name already exists.' });
            } else {
                res.status(500).json({ message: 'Error adding account holder.' });
            }
        }
    });

    app.put('/api/account_holders/:id', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Account holder name cannot be empty.' });
        }
        try {
            await db.run('UPDATE account_holders SET name = ? WHERE id = ?', [name, req.params.id]);
            res.json({ message: 'Account holder updated successfully.' });
        } catch (error) {
            res.status(500).json({ message: 'Error updating account holder.' });
        }
    });

    app.delete('/api/account_holders/:id', async (req, res) => {
        try {
            const id = req.params.id;
            if (id === '1' || parseInt(id, 10) === 1) {
                return res.status(400).json({ message: 'Cannot delete the default Primary account holder.' });
            }
            const inUse = await db.get('SELECT 1 FROM transactions WHERE account_holder_id = ? LIMIT 1', id);
            if (inUse) {
                return res.status(400).json({ message: 'Cannot delete an account holder that is in use by transactions.' });
            }
            await db.run('DELETE FROM account_holders WHERE id = ?', id);
            res.json({ message: 'Account holder deleted successfully.' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting account holder.' });
        }
    });
    
    app.get('/api/daily_performance/:date', async (req, res) => {
        const selectedDate = req.params.date;
        const holderId = req.query.holder;

        let holderFilter = '';
        const params = [selectedDate];
        if (holderId && holderId !== 'all') {
            holderFilter = 'AND account_holder_id = ?';
            params.push(holderId);
        }

        let prevDate = new Date(selectedDate + 'T12:00:00Z');
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        const previousDay = prevDate.toISOString().split('T')[0];

        const calculateTotalValue = async (date) => {
            const query = `
                SELECT ticker, price as cost_basis, COALESCE(quantity_remaining, 0) as quantity_remaining
                FROM transactions
                WHERE transaction_type = 'BUY' AND date(transaction_date) <= date(?) AND COALESCE(quantity_remaining, 0) > 0.00001
                ${holderFilter}
            `;
            const openLots = await db.all(query, params.map(p => p === selectedDate ? date : p));

            let totalValue = 0;
            for (const lot of openLots) {
                let price = null;
                const cachedPrice = await db.get('SELECT close_price FROM historical_prices WHERE ticker = ? AND date = ?', [lot.ticker, date]);
                if (cachedPrice) { price = cachedPrice.close_price; } 
                else {
                    try {
                        const apiKey = process.env.FINNHUB_API_KEY;
                        const apiRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${lot.ticker}&token=${apiKey}`);
                        if(apiRes.ok) {
                            const data = await apiRes.json();
                            if(data && data.c > 0) price = data.c;
                        }
                    } catch (e) { /* ignore */ }
                }
                totalValue += ((price || lot.cost_basis) * lot.quantity_remaining);
            }
            return totalValue;
        };
        try {
            const currentValue = await calculateTotalValue(selectedDate);
            const previousValue = await calculateTotalValue(previousDay);
            const dailyChange = currentValue - previousValue;
            res.json({ currentValue, previousValue, dailyChange });
        } catch (error) {
            console.error("Failed to calculate daily performance:", error);
            res.status(500).json({ message: "Error calculating daily performance" });
        }
    });

    app.get('/api/positions/:date', async (req, res) => {
        try {
            const selectedDate = req.params.date;
            const holderId = req.query.holder;

            let holderFilter = '';
            const params = [selectedDate];
            if (holderId && holderId !== 'all') {
                holderFilter = 'AND account_holder_id = ?';
                params.push(holderId);
            }

            const dailyTransactionsQuery = `
                SELECT daily_tx.*, parent_tx.price as parent_buy_price
                FROM transactions AS daily_tx
                LEFT JOIN transactions AS parent_tx ON daily_tx.parent_buy_id = parent_tx.id AND parent_tx.transaction_type = 'BUY'
                WHERE date(daily_tx.transaction_date) = date(?) ${holderFilter.replace('AND', 'AND daily_tx.')} ORDER BY daily_tx.id;
            `;
            const dailyTransactions = await db.all(dailyTransactionsQuery, params);
            dailyTransactions.forEach(tx => {
                if (tx.transaction_type === 'SELL' && tx.parent_buy_price) {
                    tx.realizedPL = (tx.price - tx.parent_buy_price) * tx.quantity;
                }
            });
            const endOfDayPositionsQuery = `
                SELECT id, ticker, exchange, transaction_date as purchase_date, price as cost_basis, 
                       COALESCE(original_quantity, quantity) as original_quantity, 
                       COALESCE(quantity_remaining, 0) as quantity_remaining,
                       limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration
                FROM transactions
                WHERE transaction_type = 'BUY' AND date(transaction_date) <= date(?) AND COALESCE(quantity_remaining, 0) > 0.00001
                ${holderFilter}
                ORDER BY ticker, purchase_date;
            `;
            const endOfDayPositions = await db.all(endOfDayPositionsQuery, params);
            res.json({ dailyTransactions, endOfDayPositions });
        } catch (error) {
            console.error("CRITICAL ERROR in /api/positions/:date:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    });

    app.get('/api/realized_pl/summary', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let holderFilter = '';
            const params = [];
            if (holderId && holderId !== 'all') {
                holderFilter = 'AND s.account_holder_id = ?';
                params.push(holderId);
            }
            const query = `
                SELECT s.exchange, SUM((s.price - b.price) * s.quantity) as total_pl
                FROM transactions s JOIN transactions b ON s.parent_buy_id = b.id
                WHERE s.transaction_type = 'SELL' ${holderFilter} GROUP BY s.exchange;
            `;
            const byExchangeRows = await db.all(query, params);
            const byExchange = byExchangeRows.map(row => ({exchange: row.exchange, total_pl: row.total_pl}));
            const total = byExchange.reduce((sum, row) => sum + row.total_pl, 0);
            res.json({ byExchange, total });
        } catch (error) {
            console.error("Failed to get realized P&L summary:", error);
            res.status(500).json({ message: "Error fetching realized P&L summary." });
        }
    });

    app.post('/api/realized_pl/summary', async (req, res) => {
        try {
            const { startDate, endDate, accountHolderId } = req.body;
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required.' });
            }
            let holderFilter = '';
            const params = [startDate, endDate];
            if (accountHolderId && accountHolderId !== 'all') {
                holderFilter = 'AND s.account_holder_id = ?';
                params.push(accountHolderId);
            }
            const query = `
                SELECT s.exchange, SUM((s.price - b.price) * s.quantity) as total_pl
                FROM transactions s JOIN transactions b ON s.parent_buy_id = b.id
                WHERE s.transaction_type = 'SELL'
                AND s.transaction_date >= ? 
                AND s.transaction_date <= ?
                ${holderFilter}
                GROUP BY s.exchange;
            `;
            const byExchangeRows = await db.all(query, params);
            const byExchange = byExchangeRows.map(row => ({ exchange: row.exchange, total_pl: row.total_pl }));
            const total = byExchange.reduce((sum, row) => sum + row.total_pl, 0);
            res.json({ byExchange, total });
        } catch (error) {
            console.error("Failed to get ranged realized P&L summary:", error);
            res.status(500).json({ message: "Error fetching ranged realized P&L summary." });
        }
    });

    app.post('/api/transactions', async (req, res) => {
        try {
            const { ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_up_expiration, limit_price_down, limit_down_expiration, parent_buy_id, account_holder_id } = req.body;
            if (!ticker || !exchange || !transaction_date || !['BUY', 'SELL'].includes(transaction_type) || quantity <= 0 || price <= 0 || !account_holder_id) {
                return res.status(400).json({ message: 'Invalid input. Ensure account holder is selected.' });
            }
            let original_quantity = null, quantity_remaining = null;
            if (transaction_type === 'BUY') {
                original_quantity = quantity;
                quantity_remaining = quantity;
            } else if (transaction_type === 'SELL' && parent_buy_id) {
                const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ?', parent_buy_id);
                if (!parentBuy) return res.status(404).json({ message: 'Parent buy transaction not found.' });
                if (new Date(transaction_date) < new Date(parentBuy.transaction_date)) return res.status(400).json({ message: 'Sell date cannot be before the buy date.' });
                if (parentBuy.quantity_remaining < quantity) return res.status(400).json({ message: 'Sell quantity exceeds remaining quantity.' });
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [quantity, parent_buy_id]);
            }
            const query = `INSERT INTO transactions (ticker, exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, parent_buy_id, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await db.run(query, [ticker.toUpperCase(), exchange, transaction_type, quantity, price, transaction_date, limit_price_up || null, limit_price_down || null, limit_up_expiration || null, limit_down_expiration || null, parent_buy_id || null, original_quantity, quantity_remaining, account_holder_id]);
            if (transaction_type === 'SELL') { captureEodPrices(db, transaction_date); }
            res.status(201).json({ message: 'Success' });
        } catch (error) {
            console.error('Failed to add transaction:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.get('/api/transactions', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let query = 'SELECT * FROM transactions';
            const params = [];
            if (holderId && holderId !== 'all') {
                query += ' WHERE account_holder_id = ?';
                params.push(holderId);
            }
            query += ' ORDER BY transaction_date DESC, id DESC';
            const transactions = await db.all(query, params);
            res.json(transactions);
        } catch(e) {
            res.status(500).json({message: "Error fetching transactions"});
        }
    });

    app.get('/api/transaction/:id', async (req, res) => {
        try {
            const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', req.params.id);
            if (transaction) {
                res.json(transaction);
            } else {
                res.status(404).json({ message: 'Transaction not found' });
            }
        } catch (error) {
            console.error('Error fetching single transaction:', error);
            res.status(500).json({ message: 'Error fetching transaction.' });
        }
    });

    app.put('/api/transactions/:id', async (req, res) => {
        try {
            const { exchange, transaction_type, quantity, price, transaction_date, limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, account_holder_id } = req.body;
            const ticker = req.body.ticker ? req.body.ticker.toUpperCase() : null;
            
            const originalTx = await db.get('SELECT * FROM transactions WHERE id = ?', req.params.id);
            if (!originalTx) {
                return res.status(404).json({ message: 'Transaction not found.' });
            }

            const finalUpdate = {
                id: req.params.id, ticker, exchange, transaction_type, quantity, price, transaction_date, account_holder_id,
                limit_price_up: (limit_price_up !== null && limit_price_up !== '' && !isNaN(parseFloat(limit_price_up))) ? parseFloat(limit_price_up) : null,
                limit_up_expiration: limit_up_expiration || null,
                limit_price_down: (limit_price_down !== null && limit_price_down !== '' && !isNaN(parseFloat(limit_price_down))) ? parseFloat(limit_price_down) : null,
                limit_down_expiration: limit_down_expiration || null,
                original_quantity: originalTx.original_quantity,
                quantity_remaining: originalTx.quantity_remaining
            };

            if (transaction_type === 'BUY') {
                const childSales = await db.all('SELECT * FROM transactions WHERE parent_buy_id = ?', req.params.id);
                for (const sale of childSales) {
                    if (new Date(sale.transaction_date) < new Date(transaction_date)) {
                        return res.status(400).json({ message: 'Buy date cannot be after any of its sell dates.' });
                    }
                }
                const quantitySold = originalTx.original_quantity - originalTx.quantity_remaining;
                const newRemaining = quantity - quantitySold;
                if (newRemaining < 0) {
                    return res.status(400).json({ message: 'Update would result in negative remaining quantity.' });
                }
                finalUpdate.original_quantity = quantity;
                finalUpdate.quantity_remaining = newRemaining;
            } else if (transaction_type === 'SELL' && originalTx.parent_buy_id) {
                const quantityChange = quantity - originalTx.quantity;
                const parentBuy = await db.get('SELECT * FROM transactions WHERE id = ?', originalTx.parent_buy_id);
                if (parentBuy.quantity_remaining - quantityChange < 0) {
                    return res.status(400).json({ message: 'Update would result in negative remaining quantity on parent.' });
                }
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [quantityChange, originalTx.parent_buy_id]);
            }
            
            const query = `UPDATE transactions 
                           SET ticker = ?, exchange = ?, transaction_type = ?, quantity = ?, price = ?, transaction_date = ?, 
                               limit_price_up = ?, limit_price_down = ?, limit_up_expiration = ?, limit_down_expiration = ?,
                               original_quantity = ?, quantity_remaining = ?, account_holder_id = ?
                           WHERE id = ?`;
            await db.run(query, [
                finalUpdate.ticker, finalUpdate.exchange, finalUpdate.transaction_type, finalUpdate.quantity, finalUpdate.price, finalUpdate.transaction_date,
                finalUpdate.limit_price_up, finalUpdate.limit_price_down, finalUpdate.limit_up_expiration, finalUpdate.limit_down_expiration,
                finalUpdate.original_quantity, finalUpdate.quantity_remaining, finalUpdate.account_holder_id,
                finalUpdate.id
            ]);
            res.json({ message: 'Transaction updated.' });
        } catch (error) {
            console.error('Failed to update transaction:', error);
            res.status(500).json({ message: 'Error updating transaction.' });
        }
    });

    app.delete('/api/transactions/:id', async (req, res) => {
        try {
            const txToDelete = await db.get('SELECT * FROM transactions WHERE id = ?', req.params.id);
            if (!txToDelete) return res.status(404).json({ message: 'Transaction not found' });
            if (txToDelete.transaction_type === 'SELL' && txToDelete.parent_buy_id) {
                await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining + ? WHERE id = ?', [txToDelete.quantity, txToDelete.parent_buy_id]);
            } else if (txToDelete.transaction_type === 'BUY') {
                const sells = await db.get('SELECT COUNT(*) as count FROM transactions WHERE parent_buy_id = ?', txToDelete.id);
                if (sells.count > 0) { return res.status(400).json({ message: 'Cannot delete a BUY transaction that has associated sales. Please delete the sales first.' }); }
            }
            await db.run('DELETE FROM transactions WHERE id = ?', req.params.id);
            res.json({ message: 'Transaction deleted.' });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            res.status(500).json({ message: 'Error deleting transaction.' });
        }
    });

    app.post('/api/transactions/batch', async (req, res) => {
        const { transactions, account_holder_id } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0 || !account_holder_id) {
            return res.status(400).json({ message: 'Invalid input. Expected an array of transactions and an account_holder_id.' });
        }
        let insert;
        try {
            insert = await db.prepare('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, original_quantity, quantity_remaining, account_holder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            for (const tx of transactions) {
                if (tx.transaction_type !== 'BUY') {
                    throw new Error(`CSV contains a non-BUY transaction for ${tx.ticker}, which is not allowed.`);
                }
                const ticker = tx.ticker ? tx.ticker.toUpperCase() : null;
                if (!ticker || !tx.exchange || !tx.transaction_date || tx.quantity <= 0 || tx.price <= 0) {
                    throw new Error('Invalid transaction data in batch.');
                }
                await insert.run(tx.transaction_date, ticker, tx.exchange, tx.transaction_type, tx.quantity, tx.price, tx.quantity, tx.quantity, account_holder_id);
            }
            res.status(201).json({ message: `${transactions.length} transactions imported successfully.` });
        } catch (error) {
            console.error('Failed to import batch transactions:', error);
            res.status(500).json({ message: error.message || 'Failed to import transactions.' });
        } finally {
            if (insert) await insert.finalize();
        }
    });

    app.get('/api/portfolio/overview', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let holderFilter = '';
            const params = [];
            if (holderId && holderId !== 'all') {
                holderFilter = `AND account_holder_id = ?`;
                params.push(holderId);
            }

            const overviewQuery = `
                SELECT p.ticker, SUM(p.quantity_remaining) as total_quantity,
                       SUM(p.quantity_remaining * p.cost_basis) / SUM(p.quantity_remaining) as weighted_avg_cost
                FROM (
                    SELECT id, ticker, price as cost_basis, quantity_remaining FROM transactions
                    WHERE transaction_type = 'BUY' AND COALESCE(quantity_remaining, 0) > 0.00001
                    ${holderFilter}
                ) p GROUP BY p.ticker ORDER BY p.ticker;
            `;
            const overview = await db.all(overviewQuery, params);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            for (const pos of overview) {
                const priceRecord = await db.get('SELECT close_price FROM historical_prices WHERE ticker = ? AND date <= ? ORDER BY date DESC LIMIT 1', [pos.ticker, yesterdayStr]);
                pos.previous_close = priceRecord ? priceRecord.close_price : null;
            }
            res.json(overview);
        } catch (error) {
            console.error("Failed to get portfolio overview:", error);
            res.status(500).json({ message: "Error fetching portfolio overview." });
        }
    });

    app.get('/api/snapshots', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let snapshots;
            if (holderId === 'all') {
                snapshots = await db.all(`
                    SELECT snapshot_date, 'All Accounts' as exchange, SUM(value) as value 
                    FROM account_snapshots 
                    GROUP BY snapshot_date 
                    ORDER BY snapshot_date ASC
                `);
            } else if (holderId) {
                snapshots = await db.all('SELECT * FROM account_snapshots WHERE account_holder_id = ? ORDER BY snapshot_date ASC', [holderId]);
            } else {
                snapshots = await db.all('SELECT * FROM account_snapshots ORDER BY snapshot_date ASC');
            }
            res.json(snapshots);
        } catch (error) {
            console.error("Failed to fetch snapshots:", error);
            res.status(500).json({ message: "Error fetching snapshots" });
        }
    });

    app.post('/api/snapshots', async (req, res) => {
        try {
            const { exchange, snapshot_date, value, account_holder_id } = req.body;
            if(!account_holder_id) {
                return res.status(400).json({message: "Account holder is required."});
            }
            await db.run(`INSERT OR REPLACE INTO account_snapshots (exchange, snapshot_date, value, account_holder_id) VALUES (?, ?, ?, ?)`, [exchange, snapshot_date, value, account_holder_id]);
            res.status(201).json({ message: 'Snapshot saved.' });
        } catch (error) {
            console.error('Error saving snapshot:', error);
            res.status(500).json({ message: 'Error saving snapshot.' });
        }
    });

    app.delete('/api/snapshots/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM account_snapshots WHERE id = ?', req.params.id);
            res.json({ message: 'Snapshot deleted successfully' });
        } catch (error) {
            console.error('Failed to delete snapshot:', error);
            res.status(500).json({ message: 'Error deleting snapshot' });
        }
    });

    return { app, db };
}

if (require.main === module) {
    setupApp().then(({ app }) => {
        app.listen(PORT, () => {
            console.log(`Server is running! Open your browser and go to http://localhost:${PORT}`);
        });
    });
}

module.exports = setupApp;

