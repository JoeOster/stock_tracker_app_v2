// public/importer-templates.js

export const BROKERAGE_TEMPLATES = {
    'fidelity': {
        name: 'Fidelity',
        dataStartRow: 2,
        columns: {
            date: 0,
            action: 3,
            symbol: 4,
            quantity: 7,
            price: 8,
            amount: 12
        },
        isBuy: (row) => row[3].toLowerCase().includes('you bought'),
        isSell: (row) => row[3].toLowerCase().includes('you sold'),
        ignore: (row) => !row[3] || (!row[3].toLowerCase().includes('you bought') && !row[3].toLowerCase().includes('you sold'))
    },
    'etrade': {
        name: 'E-Trade',
        dataStartRow: 4,
        columns: {
            date: 0,
            action: 1,
            symbol: 3,
            quantity: 4,
            price: 6
        },
        isBuy: (row) => row[1].toLowerCase() === 'bought',
        isSell: (row) => row[1].toLowerCase() === 'sold',
        ignore: (row) => !row[1] || (row[1].toLowerCase() !== 'bought' && row[1].toLowerCase() !== 'sold')
    },
    'robinhood': {
        name: 'Robinhood',
        dataStartRow: 1,
        columns: {
            date: 0,
            action: 5,
            symbol: 3,
            quantity: 6,
            price: 7,
            amount: 8
        },
        isBuy: (row) => row[5].toLowerCase() === 'buy',
        isSell: (row) => row[5].toLowerCase() === 'sell',
        ignore: (row) => !row[5] || (row[5].toLowerCase() !== 'buy' && row[5].toLowerCase() !== 'sell')
    },
    'generic': {
        name: 'Generic',
        dataStartRow: 1,
        columns: {
            date: 0,
            symbol: 1,
            action: 2,
            quantity: 3,
            price: 4
        },
        isBuy: (row) => row[2].toUpperCase() === 'BUY',
        isSell: (row) => row[2].toUpperCase() === 'SELL',
        ignore: (row) => !row[2] || (row[2].toUpperCase() !== 'BUY' && row[2].toUpperCase() !== 'SELL')
    }
};