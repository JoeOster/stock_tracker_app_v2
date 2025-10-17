// joeoster/stock_tracker_app_v2/stock_tracker_app_v2-PortfolioManagerTake3/user-settings/importer-templates.js
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
                const cleanedAction = (row['Action'] || '').replace(/\r?\n/g, ' ');
                // Standardize date parsing
                const date = new Date(row['Run Date']);
                const formattedDate = date.toISOString().split('T')[0];

                return {
                    date: formattedDate,
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
                amount: 'Amount',
            },
            filter: (row) => ['Buy', 'Sell'].includes(row['Trans Code']),
            transform: (row) => {
                const quantity = parseFloat(row['Quantity']);
                // FIX: Remove accounting symbols before parsing the amount.
                const cleanedAmount = (row['Amount'] || '').replace(/[$,()]/g, '');
                const amount = parseFloat(cleanedAmount);
                const price = (quantity && amount) ? Math.abs(amount / quantity) : 0;
                // Standardize date parsing
                const date = new Date(row['Activity Date']);
                const formattedDate = date.toISOString().split('T')[0];

                return {
                    date: formattedDate,
                    ticker: row['Instrument'],
                    type: row['Trans Code'].toUpperCase(),
                    quantity: quantity,
                    price: price,
                    exchange: 'Robinhood',
                }
            },
        },
        etrade: {
            name: 'E-Trade',
            dataStartRow: 4,
            columns: {
                date: 'TransactionDate',
                type: 'TransactionType',
                ticker: 'Symbol',
                quantity: 'Quantity',
                price: 'Price',
            },
            filter: (row) => ['Bought', 'Sold'].includes(row['TransactionType']),
            transform: (row) => {
                // FIX: Manually parse MM/DD/YY format to avoid ambiguity.
                const dateParts = row['TransactionDate'].split('/'); // e.g., ['10', '01', '25']
                const year = `20${dateParts[2]}`;
                const month = dateParts[0].padStart(2, '0');
                const day = dateParts[1].padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD

                return {
                    date: formattedDate,
                    ticker: row['Symbol'],
                    type: row['TransactionType'] === 'Bought' ? 'BUY' : 'SELL',
                    quantity: Math.abs(parseFloat(row['Quantity'])),
                    price: parseFloat(row['Price']),
                    exchange: 'E-Trade',
                }
            },
        },
    }
};