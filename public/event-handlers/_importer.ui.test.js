/**
 * @jest-environment jsdom
 */
import { forTesting } from './_importer.js';
const { validateRow, findConflict, setExistingTransactionsForTesting } = forTesting;

// FIX: Mock the dependencies of the importer module to isolate the test
jest.mock('../ui/helpers.js', () => ({
    showToast: jest.fn(),
}));

jest.mock('./_navigation.js', () => ({
    switchView: jest.fn(),
}));


describe('CSV Importer Logic', () => {

    describe('validateRow', () => {
        it('should return valid for a correct transaction row', () => {
            const row = { date: '2025-10-10', ticker: 'AAPL', quantity: 10, price: 150 };
            const { isValid, error } = validateRow(row);
            expect(isValid).toBe(true);
            expect(error).toBeNull();
        });

        it('should return invalid for a row with a missing date', () => {
            const row = { date: null, ticker: 'AAPL', quantity: 10, price: 150 };
            const { isValid, error } = validateRow(row);
            expect(isValid).toBe(false);
            expect(error).toBe('Invalid or missing date.');
        });
        
        it('should return invalid for a row with a missing ticker', () => {
            const row = { date: '2025-10-10', ticker: '', quantity: 10, price: 150 };
            const { isValid, error } = validateRow(row);
            expect(isValid).toBe(false);
            expect(error).toBe('Invalid or missing ticker symbol.');
        });

        it('should return invalid for a row with zero quantity', () => {
            const row = { date: '2025-10-10', ticker: 'AAPL', quantity: 0, price: 150 };
            const { isValid, error } = validateRow(row);
            expect(isValid).toBe(false);
            expect(error).toBe('Invalid or zero quantity.');
        });

        it('should return invalid for a row with zero price', () => {
            const row = { date: '2025-10-10', ticker: 'AAPL', quantity: 10, price: 0 };
            const { isValid, error } = validateRow(row);
            expect(isValid).toBe(false);
            expect(error).toBe('Invalid or zero price.');
        });
    });

    describe('findConflict', () => {
        beforeAll(() => {
            // Use the helper function to set the internal state of the importer module
            const mockExistingTransactions = [
                { id: 1, transaction_date: '2025-10-10', ticker: 'AAPL', transaction_type: 'BUY', quantity: 10, price: 150.00 },
                { id: 2, transaction_date: '2025-10-11', ticker: 'MSFT', transaction_type: 'BUY', quantity: 5, price: 300.00 },
            ];
            setExistingTransactionsForTesting(mockExistingTransactions);
        });

        it('should return "New" for a transaction that does not exist', () => {
            const newRow = { date: '2025-10-12', ticker: 'GOOG', action: 'BUY', quantity: 1, price: 2800 };
            const { status, match } = findConflict(newRow);
            expect(status).toBe('New');
            expect(match).toBeNull();
        });

        it('should return "Potential Duplicate" for an exact match', () => {
            const duplicateRow = { date: '2025-10-10', ticker: 'AAPL', action: 'BUY', quantity: 10, price: 150.00 };
            const { status, match } = findConflict(duplicateRow);
            expect(status).toBe('Potential Duplicate');
            expect(match.id).toBe(1);
        });
        
        it('should return "Potential Duplicate" for a match within the price tolerance', () => {
            const similarRow = { date: '2025-10-10', ticker: 'AAPL', action: 'BUY', quantity: 10, price: 150.01 };
            const { status, match } = findConflict(similarRow);
            expect(status).toBe('Potential Duplicate');
            expect(match.id).toBe(1);
        });
        
        it('should return "New" if the action is different', () => {
            const differentActionRow = { date: '2025-10-10', ticker: 'AAPL', action: 'SELL', quantity: 10, price: 150.00 };
            const { status, match } = findConflict(differentActionRow);
            expect(status).toBe('New');
            expect(match).toBeNull();
        });
    });
});