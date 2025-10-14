// public/importer-templates.js
// This file is in CommonJS format to be compatible with the Node.js server.
module.exports = {
    brokerageTemplates: {
        fidelity: {
            name: 'Fidelity',
            dataStartRow: 1,
            columns: {
                date: 'Run Date',
                action: 'Action',
                ticker: 'Symbol',
                quantity: 'Quantity',
                price: 'Price ($)',
            },
            filter: (row) => {
                const action = row['Action'] || '';
                // Add a check for a valid date to filter out footer rows
                return row['Run Date'] &&
                       (action.toLowerCase().includes('you bought') || action.toLowerCase().includes('you sold')) &&
                       row['Symbol'] &&
                       !['BITCOIN', 'ETHEREUM', 'LITECOIN'].includes(row['Description']);
            },
            transform: (row) => {
                // FIX: Clean up the Action string to remove newlines before processing.
                const cleanedAction = (row['Action'] || '').replace(/\r?\n/g, ' ');
                return {
                    date: new Date(row['Run Date']).toLocaleDateString('en-CA'),
                    ticker: row['Symbol'],
                    type: cleanedAction.toLowerCase().includes('you bought') ? 'BUY' : 'SELL',
                    quantity: Math.abs(parseFloat(row['Quantity'])),
                    price: parseFloat(row['Price ($)']),
                    exchange: 'Fidelity',
                }
            },
        },
        robinhood: {
            name: 'Robinhood',
            dataStartRow: 1,
            columns: {
                date: 'Activity Date',
                ticker: 'Instrument',
                type: 'Trans Code',
                quantity: 'Quantity',
                price: 'Price',
            },
            // Make the filter more specific to only include Buy and Sell transactions
            filter: (row) => ['Buy', 'Sell'].includes(row['Trans Code']),
            transform: (row) => ({
                date: new Date(row['Activity Date']).toLocaleDateString('en-CA'),
                ticker: row['Instrument'],
                type: row['Trans Code'].toUpperCase(),
                quantity: parseFloat(row['Quantity']),
                price: parseFloat(row['Price']),
                exchange: 'Robinhood',
            }),
        },
        etrade: {
            name: 'E-Trade',
            // Adjust the starting row to account for extra header lines
            dataStartRow: 4,
            columns: {
                date: 'TransactionDate',
                type: 'TransactionType',
                ticker: 'Symbol',
                quantity: 'Quantity',
                price: 'Price',
            },
            filter: (row) => ['Bought', 'Sold'].includes(row['TransactionType']),
            transform: (row) => ({
                // Correctly handle the 'MM/DD/YY' date format
                date: new Date('20' + row['TransactionDate']).toLocaleDateString('en-CA'),
                ticker: row['Symbol'],
                type: row['TransactionType'] === 'Bought' ? 'BUY' : 'SELL',
                quantity: Math.abs(parseFloat(row['Quantity'])),
                price: parseFloat(row['Price']),
                exchange: 'E-Trade',
            }),
        },
    }
};