// This file is in CommonJS format to be compatible with the Node.js server.

// --- Fidelity Functions ---
const filterFidelity = (row) => {
    const action = row['Action'] || '';
    return (action.toLowerCase().includes('you bought') || action.toLowerCase().includes('you sold'))
           && row['Symbol']
           && !['BITCOIN', 'ETHEREUM', 'LITECOIN'].includes(row['Description']);
};

const transformFidelity = (row) => ({
    date: new Date(row['Run Date']).toLocaleDateString('en-CA'),
    ticker: row['Symbol'],
    type: row['Action'].toLowerCase().includes('you bought') ? 'BUY' : 'SELL',
    quantity: Math.abs(parseFloat(row['Quantity'])),
    price: parseFloat(row['Price ($)']),
    exchange: 'Fidelity',
});

// --- Robinhood Functions ---
const filterRobinhood = (row) => {
    return ['Buy', 'Sell'].includes(row['Trans Code']) && row['Activity Date'];
};

const transformRobinhood = (row) => ({
    date: new Date(row['Activity Date'].split(' ')[0]).toLocaleDateString('en-CA'),
    ticker: row['Instrument'],
    type: row['Trans Code'].toUpperCase(),
    quantity: parseFloat(row['Quantity']),
    price: parseFloat(row['Price']),
    exchange: 'Robinhood',
});

// --- E-Trade Functions ---
const filterEtrade = (row) => {
    const type = (row['TransactionType'] || '').toLowerCase();
    return type === 'bought' || type === 'sold' || type === 'buy' || type === 'sell';
};

const transformEtrade = (row) => ({
    date: new Date('20' + row['TransactionDate']).toLocaleDateString('en-CA'),
    ticker: row['Symbol'],
    type: (row['TransactionType'] || '').toLowerCase().startsWith('b') ? 'BUY' : 'SELL',
    quantity: Math.abs(parseFloat(row['Quantity'])),
    price: parseFloat(row['Price']),
    exchange: 'E-Trade',
});


// --- Main Export ---
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
            filter: filterFidelity,
            transform: transformFidelity,
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
            filter: filterRobinhood,
            transform: transformRobinhood,
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
            filter: filterEtrade,
            transform: transformEtrade,
        },
    }
};