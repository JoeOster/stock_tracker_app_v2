// /routes/importer-helpers.js
/**
 * @file Helper functions for the CSV importer route.
 * @module routes/importer-helpers
 */

/**
 * Simple quantity formatter for error messages.
 * @param {number | string | null | undefined} number - The number to format.
 * @returns {string} The formatted quantity string.
 */
function internalFormatQuantity(number) {
     const num = typeof number === 'string' ? parseFloat(number) : number;
     if (num === null || num === undefined || isNaN(num)) { return ''; }
     const formatter = new Intl.NumberFormat('en-US', {
         maximumFractionDigits: 5,
         minimumFractionDigits: 0,
         useGrouping: true
     });
     return formatter.format(num);
}

/**
 * Combines transactions for the same stock, on the same day, at the same price.
 * @param {Array<object>} transactions - The array of transactions to process.
 * @returns {Array<object>} A new array with the combined transactions.
 */
function combineFractionalShares(transactions) {
    const combined = new Map();

    transactions.forEach(tx => {
        // Ensure price exists and handle potential null/undefined before creating key
        const priceKey = (tx.price !== null && tx.price !== undefined) ? tx.price.toFixed(5) : 'null_price'; // Use fixed decimal places for key
        const key = `${tx.date}-${tx.ticker}-${tx.type}-${priceKey}`;

        if (combined.has(key)) {
            const existing = combined.get(key);
            existing.quantity += tx.quantity;
        } else {
            // Create a new object to avoid mutating the original
            combined.set(key, { ...tx });
        }
    });

    return Array.from(combined.values());
}

/**
 * Finds a potential conflict between a parsed CSV row and existing transactions.
 * @param {object} parsedRow - The processed data from a single CSV row.
 *CH @param {Array<object>} existingTransactions - Array of transactions already in the database.
 * @returns {{status: 'Potential Duplicate' | 'New', match: object | null}}
 */
function findConflict(parsedRow, existingTransactions) {
    // Price tolerance might need adjustment depending on brokerage rounding
    const PRICE_TOLERANCE_PERCENT = 1; // 1% tolerance for price matching
    const QTY_TOLERANCE_ABSOLUTE = 0.0001; // Small absolute tolerance for quantity floats

    for (const tx of existingTransactions) {
        // Ensure both dates are valid before comparing
        const parsedDate = new Date(parsedRow.date + 'T12:00:00Z'); // Add time to avoid timezone issues
        const txDate = new Date(tx.transaction_date + 'T12:00:00Z');
        if (isNaN(parsedDate.getTime()) || isNaN(txDate.getTime())) continue; // Skip if either date is invalid

        const dateMatch = parsedDate.toDateString() === txDate.toDateString();
        const tickerMatch = parsedRow.ticker === tx.ticker;
        const typeMatch = parsedRow.type === tx.transaction_type; // Compare types too
        const quantityMatch = Math.abs(parsedRow.quantity - tx.quantity) < QTY_TOLERANCE_ABSOLUTE;

        // Price match: Check if both prices are valid numbers before comparing
        let priceMatch = false;
        if (typeof parsedRow.price === 'number' && typeof tx.price === 'number' && tx.price !== 0) {
            priceMatch = (Math.abs(parsedRow.price - tx.price) / tx.price) * 100 < PRICE_TOLERANCE_PERCENT;
        } else if (parsedRow.price === tx.price) { // Handle cases where both might be null or zero
            priceMatch = true;
        }


        if (dateMatch && tickerMatch && typeMatch && quantityMatch && priceMatch) {
            return { status: 'Potential Duplicate', match: tx };
        }
    }
    return { status: 'New', match: null };
}

module.exports = {
    internalFormatQuantity,
    combineFractionalShares,
    findConflict
};
