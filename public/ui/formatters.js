// /public/ui/formatters.js
// Version Updated
/**
 * @file Contains all UI helper functions for formatting data for display.
 * @module ui/formatters
 */

/**
 * Formats a number for display as a quantity, removing trailing zeros for whole numbers.
 * @param {number | string | null | undefined} number - The number to format.
 * @returns {string} The formatted quantity string.
 */
export function formatQuantity(number) {
    const num = typeof number === 'string' ? parseFloat(number) : number; // Handle string inputs
    if (num === null || num === undefined || isNaN(num)) { return ''; }
    // Use NumberFormat for potentially better handling of large/small numbers
    const formatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 5,
        minimumFractionDigits: 0, // Ensure whole numbers don't get forced decimals
        useGrouping: true // Add commas for thousands
    });
    return formatter.format(num);
}

/**
 * Formats a number into an accounting-style string (e.g., $1,234.56 or ($1,234.56) for negative).
 * @param {number | string | null | undefined} number - The number to format.
 * @param {boolean} [isCurrency=true] - Whether to include a currency symbol. If false, treats as a general number.
 * @returns {string} The formatted accounting string.
 */
export function formatAccounting(number, isCurrency = true) {
    const num = typeof number === 'string' ? parseFloat(number) : number; // Handle string inputs
    if (num === null || num === undefined || isNaN(num)) { return ''; }

    if (Math.abs(num) < 0.001) {
        return isCurrency ? '$0.00' : '0'; // Return "$0.00" for currency zero, "0" otherwise
    }

    const isNegative = num < 0;
    const absoluteValue = Math.abs(num);

    // This is a .js file, not .ts. Removed TypeScript type annotation.
    const options = {
        style: (isCurrency ? 'currency' : 'decimal'),
        currency: 'USD',
        minimumFractionDigits: isCurrency ? 2 : 0,
        maximumFractionDigits: isCurrency ? 2 : 5, // Allow 5 for decimal, 2 for currency
        useGrouping: true
    };

    // @ts-ignore
    let formattedNumber = new Intl.NumberFormat('en-US', options).format(absoluteValue);

    if (!isCurrency) {
         // If not currency, 'style: decimal' was used, no need to strip currency symbols
    } else {
        // If currency, ensure '$' is present
        if (!formattedNumber.startsWith('$')) {
            formattedNumber = '$' + formattedNumber;
        }
    }

    // Apply parentheses for negative numbers
    return isNegative ? `(${formattedNumber})` : formattedNumber;
}

/**
 * Formats a number into a percentage string with a sign.
 * e.g., 0.05 -> "+5.00%", -0.02 -> "-2.00%"
 * @param {number | string | null | undefined} number - The number to format (e.g., 0.05 for 5%).
 * @returns {string} The formatted percentage string.
 */
export function formatPercent(number) {
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (num === null || num === undefined || isNaN(num)) { return ''; }

    const percent = num * 100;
    const sign = percent > 0 ? '+' : '';
    
    return `${sign}${percent.toFixed(2)}%`;
}