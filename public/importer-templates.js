// public/event-handlers/importer-templates.js
export const brokerageTemplates = {
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
            return (action.toLowerCase().includes('you bought') || action.toLowerCase().includes('you sold')) 
                   && row['Symbol'] 
                   && !['BITCOIN', 'ETHEREUM', 'LITECOIN'].includes(row['Description']);
        },
        transform: (row) => ({
            date: new Date(row['Run Date']).toLocaleDateString('en-CA'),
            ticker: row['Symbol'],
            type: row['Action'].toLowerCase().includes('you bought') ? 'BUY' : 'SELL',
            quantity: Math.abs(parseFloat(row['Quantity'])),
            price: parseFloat(row['Price ($)']),
            exchange: 'Fidelity',
        }),
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
            date: new Date('20' + row['TransactionDate']).toLocaleDateString('en-CA'),
            ticker: row['Symbol'],
            type: row['TransactionType'] === 'Bought' ? 'BUY' : 'SELL',
            quantity: Math.abs(parseFloat(row['Quantity'])),
            price: parseFloat(row['Price']),
            exchange: 'E-Trade',
        }),
    },
};