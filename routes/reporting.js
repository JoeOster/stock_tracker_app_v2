// routes/reporting.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// This module will be passed the database connection (db) from server.js
module.exports = (db) => {

    router.get('/daily_performance/:date', async (req, res) => {
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

    router.get('/positions/:date', async (req, res) => {
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
                       limit_price_up, limit_price_down, limit_up_expiration, limit_down_expiration, account_holder_id
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

    router.get('/realized_pl/summary', async (req, res) => {
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

    router.post('/realized_pl/summary', async (req, res) => {
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

    router.get('/portfolio/overview', async (req, res) => {
        try {
            const holderId = req.query.holder;
            let holderFilter = '';
            const params = [];
            if (holderId && holderId !== 'all') {
                holderFilter = `AND account_holder_id = ?`;
                params.push(holderId);
            }

            const overviewQuery = `
                SELECT 
                    ticker,
                    SUM(quantity_remaining) as total_quantity,
                    SUM(price * quantity_remaining) / SUM(quantity_remaining) as weighted_avg_cost
                FROM transactions
                WHERE transaction_type = 'BUY' AND COALESCE(quantity_remaining, 0) > 0.00001
                ${holderFilter}
                GROUP BY ticker 
                ORDER BY ticker;
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

    return router;
};