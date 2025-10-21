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
    // Format, then remove trailing zeros for whole numbers if needed (though minimumFractionDigits=0 should handle this)
    let formatted = formatter.format(num);
    // If original number was integer, ensure no decimals remain if formatter added them unnecessarily
    // This check might be redundant with Intl.NumberFormat's minimumFractionDigits
    // if (num % 1 === 0 && formatted.includes('.')) {
    //     formatted = formatted.split('.')[0];
    // }
    return formatted;

    /* // Original implementation
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    const options = { maximumFractionDigits: 5 , useGrouping: true};
    if (number % 1 === 0) { options.maximumFractionDigits = 0; }
    return number.toLocaleString('en-US', options);
    */
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

    // --- FIX: Change zero handling ---
    // if (Math.abs(num) < 0.001 && isCurrency) { return isCurrency ? '$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-' : '-'; } // Old version
    if (Math.abs(num) < 0.001) {
        return isCurrency ? '$0.00' : '0'; // Return "$0.00" for currency zero, "0" otherwise
    }
    // --- End Fix ---

    const isNegative = num < 0;
    const absoluteValue = Math.abs(num);

    // Use Intl.NumberFormat for robust currency/number formatting
    const options = {
        style: isCurrency ? 'currency' : 'decimal',
        currency: 'USD', // Specify currency for '$' symbol and formatting
        minimumFractionDigits: isCurrency ? 2 : 0, // Ensure 2 decimals for currency, 0 min for numbers
        maximumFractionDigits: isCurrency ? 2 : 5, // Allow more decimals for non-currency numbers
        useGrouping: true
    };

    // Format the absolute value
    let formattedNumber = new Intl.NumberFormat('en-US', options).format(absoluteValue);

    // Remove currency style's potential default parentheses for negative (we add our own)
    // and handle the $ sign explicitly if not using currency style
    if (!isCurrency) {
         // If not currency, 'style: decimal' was used, no need to strip currency symbols
    } else {
        // If currency, ensure '$' is present if style: 'currency' didn't add it (unlikely but safe)
        if (!formattedNumber.startsWith('$')) {
            formattedNumber = '$' + formattedNumber;
        }
    }


    // Apply parentheses for negative numbers
    return isNegative ? `(${formattedNumber})` : formattedNumber;

    /* // Original number.toLocaleString based logic:
    let options = { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true };
    if (!isCurrency) { options.maximumFractionDigits = 5; } // Allow more for non-currency
    let formattedNumber = absoluteValue.toLocaleString('en-US', options);
    if (isCurrency) { formattedNumber = '$' + formattedNumber; }
    return isNegative ? `(${formattedNumber})` : formattedNumber;
    */
}