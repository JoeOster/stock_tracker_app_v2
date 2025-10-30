// /routes/transaction-helpers.js
/**
 * @file Helper functions for transaction routes.
 * @module routes/transaction-helpers
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

module.exports = {
    internalFormatQuantity
};
