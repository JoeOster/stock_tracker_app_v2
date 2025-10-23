// routes/importer.test.js

// Import the conditionally exported helper functions
const { combineFractionalShares, findConflict } = require('../routes/importer.js');

describe('Importer Helper Functions', () => {

    describe('combineFractionalShares', () => {
        test('should combine rows with same date, ticker, type, and price', () => {
            const transactions = [
                { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 0.5, price: 150.00 },
                { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 0.25, price: 150.00 },
                { date: '2025-10-20', ticker: 'MSFT', type: 'BUY', quantity: 1, price: 300.00 },
            ];
            const expected = [
                { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 0.75, price: 150.00 },
                { date: '2025-10-20', ticker: 'MSFT', type: 'BUY', quantity: 1, price: 300.00 },
            ];
            expect(combineFractionalShares(transactions)).toEqual(expected);
        });

        test('should not combine rows with different prices', () => {
            const transactions = [
                { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 0.5, price: 150.00 },
                { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 0.25, price: 150.01 },
            ];
            expect(combineFractionalShares(transactions)).toEqual(transactions); // Should remain separate
        });

        test('should handle empty input', () => {
            expect(combineFractionalShares([])).toEqual([]);
        });
    });

    describe('findConflict', () => {
        const existingTransactions = [
            { id: 1, transaction_date: '2025-10-20', ticker: 'AAPL', transaction_type: 'BUY', quantity: 10, price: 150.05 },
            { id: 2, transaction_date: '2025-10-21', ticker: 'MSFT', transaction_type: 'SELL', quantity: 5, price: 305.00 },
        ];

        test('should identify a potential duplicate with close price/qty', () => {
            const parsedRow = { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 10, price: 150.00 };
            const result = findConflict(parsedRow, existingTransactions);
            expect(result.status).toBe('Potential Duplicate');
            expect(result.match?.id).toBe(1);
        });

        test('should identify as new if date differs', () => {
            const parsedRow = { date: '2025-10-21', ticker: 'AAPL', type: 'BUY', quantity: 10, price: 150.00 };
            expect(findConflict(parsedRow, existingTransactions).status).toBe('New');
        });

        test('should identify as new if ticker differs', () => {
            const parsedRow = { date: '2025-10-20', ticker: 'GOOG', type: 'BUY', quantity: 10, price: 150.00 };
            expect(findConflict(parsedRow, existingTransactions).status).toBe('New');
        });

        test('should identify as new if type differs', () => {
            const parsedRow = { date: '2025-10-20', ticker: 'AAPL', type: 'SELL', quantity: 10, price: 150.00 };
            expect(findConflict(parsedRow, existingTransactions).status).toBe('New');
        });

        test('should identify as new if quantity differs significantly', () => {
            const parsedRow = { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 11, price: 150.00 };
            expect(findConflict(parsedRow, existingTransactions).status).toBe('New');
        });

        test('should identify as new if price differs significantly', () => {
            const parsedRow = { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 10, price: 160.00 }; // >1% difference
            expect(findConflict(parsedRow, existingTransactions).status).toBe('New');
        });

         test('should identify as new if no existing transactions', () => {
            const parsedRow = { date: '2025-10-20', ticker: 'AAPL', type: 'BUY', quantity: 10, price: 150.00 };
            expect(findConflict(parsedRow, []).status).toBe('New');
        });
    });

});