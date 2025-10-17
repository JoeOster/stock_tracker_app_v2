// /public/ui/formatters.js
/**
 * @file Contains all UI helper functions for formatting data for display.
 * @module ui/formatters
 */

/**
 * Formats a number for display as a quantity, removing trailing zeros for whole numbers.
 * @param {number | null | undefined} number - The number to format.
 * @returns {string} The formatted quantity string.
 */
export function formatQuantity(number) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    const options = { maximumFractionDigits: 5 };
    if (number % 1 === 0) { options.maximumFractionDigits = 0; }
    return number.toLocaleString('en-US', options);
}

/**
 * Formats a number into an accounting-style string (e.g., $1,234.56 or ($1,234.56) for negative).
 * @param {number | null | undefined} number - The number to format.
 * @param {boolean} [isCurrency=true] - Whether to include a currency symbol.
 * @returns {string} The formatted accounting string.
 */
export function formatAccounting(number, isCurrency = true) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    if (Math.abs(number) < 0.001 && isCurrency) { return isCurrency ? '$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-' : '-'; }
    if (Math.abs(number) < 0.001 && !isCurrency) { return '-'; }
    const isNegative = number < 0;
    const absoluteValue = Math.abs(number);
    let options = { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true };
    if (!isCurrency) { options.maximumFractionDigits = 5; }
    let formattedNumber = absoluteValue.toLocaleString('en-US', options);
    if (isCurrency) { formattedNumber = '$' + formattedNumber; }
    return isNegative ? `(${formattedNumber})` : formattedNumber;
}