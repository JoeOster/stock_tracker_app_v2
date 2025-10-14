// routes/transactions.js
const express = require('express');
const router = express.Router();

// NOTE: This assumes 'importSessions' is passed from server.js
// We will need a small change in server.js to make this work.


module.exports = (db, log, captureEodPrices, importSessions) => { // Make sure importSessions is passed in
    // ...

    /**
     * POST /import
     * Handles the batch import of reconciled transactions from the CSV importer.
     */
router.post('/import', async (req, res) => {
        const { sessionId, resolutions } = req.body;

        if (!sessionId || !Array.isArray(resolutions)) {
            return res.status(400).json({ message: 'Invalid import payload.' });
        }

        const session = importSessions.get(sessionId);
        if (!session) {
            return res.status(400).json({ message: 'Import session expired or not found.' });
        }

        const { data: sessionData, accountHolderId } = session;
        const toCreate = [];
        const toDelete = [];

        resolutions.forEach(res => {
            const conflictItem = sessionData.find(item => item.csvRowIndex == res.csvIndex);
            if (conflictItem && res.resolution === 'REPLACE') {
                toDelete.push(conflictItem.matchedTx.id);
                toCreate.push(conflictItem);
            }
        });
        
        sessionData.forEach(item => {
            if (item.status === 'New') {
                toCreate.push(item);
            }
        });
        
        if (toCreate.length === 0 && toDelete.length === 0) {
            importSessions.delete(sessionId);
            return res.status(200).json({ message: 'No changes were committed.' });
        }

        try {
            await db.exec('BEGIN TRANSACTION');

            if (toDelete.length > 0) {
                const deleteStmt = await db.prepare('DELETE FROM transactions WHERE id = ?');
                for (const id of toDelete) {
                    await deleteStmt.run(id);
                }
                await deleteStmt.finalize();
            }

            if (toCreate.length > 0) {
                toCreate.sort((a, b) => new Date(a.date) - new Date(b.date));
                for (const tx of toCreate) {
                    // FIX: Explicitly parse quantity and price to satisfy type checker
                    const quantity = parseFloat(tx.quantity);
                    const price = parseFloat(tx.price);

                    if (tx.type === 'BUY') {
                        await db.run('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, original_quantity, quantity_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [tx.date, tx.ticker, tx.exchange, tx.type, quantity, price, accountHolderId, quantity, quantity]);
                    } else if (tx.type === 'SELL') {
                        let sellQuantity = quantity;
                        const openLots = await db.all("SELECT * FROM transactions WHERE ticker = ? AND account_holder_id = ? AND quantity_remaining > 0.00001 ORDER BY transaction_date ASC", [tx.ticker, accountHolderId]);

                        if (openLots.length === 0) throw new Error(`No open BUY lot for SELL of ${tx.ticker} on ${tx.date}.`);

                        for (const lot of openLots) {
                            if (sellQuantity <= 0) break;
                            const sellableQuantity = Math.min(sellQuantity, lot.quantity_remaining);
                            await db.run('INSERT INTO transactions (transaction_date, ticker, exchange, transaction_type, quantity, price, account_holder_id, parent_buy_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [tx.date, tx.ticker, tx.exchange, tx.type, sellableQuantity, price, accountHolderId, lot.id]);
                            await db.run('UPDATE transactions SET quantity_remaining = quantity_remaining - ? WHERE id = ?', [sellableQuantity, lot.id]);
                            sellQuantity -= sellableQuantity;
                        }
                    }
                }
            }

            await db.exec('COMMIT');
            importSessions.delete(sessionId);
            res.status(201).json({ message: 'Import completed successfully!' });
        } catch (error) {
            await db.exec('ROLLBACK');
            log(`[ERROR] Failed during batch import: ${error.message}`);
            res.status(500).json({ message: `Import failed: ${error.message}` });
        }
    });

    // ... (keep all your other routes: GET /, POST /, PUT /, DELETE /)

    return router;
};