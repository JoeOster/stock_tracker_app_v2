// routes/accounts.js
const express = require('express');
const router = express.Router();

// This module will be passed the database connection (db) from server.js
module.exports = (db) => {

    // --- ACCOUNT HOLDER ENDPOINTS ---
    // Base path: /api/accounts/holders

    router.get('/holders', async (req, res) => {
        try {
            const holders = await db.all('SELECT * FROM account_holders ORDER BY name');
            res.json(holders);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching account holders.' });
        }
    });

    router.post('/holders', async (req, res) => {
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

    router.put('/holders/:id', async (req, res) => {
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

    router.delete('/holders/:id', async (req, res) => {
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


    // --- EXCHANGE ENDPOINTS ---
    // Base path: /api/accounts/exchanges

    router.get('/exchanges', async (req, res) => {
        try {
            const exchanges = await db.all('SELECT * FROM exchanges ORDER BY name');
            res.json(exchanges);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching exchanges.' });
        }
    });

    router.post('/exchanges', async (req, res) => {
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

    router.put('/exchanges/:id', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') { return res.status(400).json({ message: 'Exchange name cannot be empty.' }); }
        try {
            const oldExchange = await db.get('SELECT name FROM exchanges WHERE id = ?', req.params.id);
            if(oldExchange) {
                await db.run('UPDATE transactions SET exchange = ? WHERE exchange = ?', [name, oldExchange.name]);
                await db.run('UPDATE exchanges SET name = ? WHERE id = ?', [name, req.params.id]);
            }
            res.json({ message: 'Exchange updated successfully.' });
        } catch (error) {
            res.status(500).json({ message: 'Error updating exchange.' });
        }
    });

    router.delete('/exchanges/:id', async (req, res) => {
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

    return router;
};