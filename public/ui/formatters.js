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
  if (num === null || num === undefined || isNaN(num)) {
    return '';
  }
  // Use NumberFormat for potentially better handling of large/small numbers
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 5,
    minimumFractionDigits: 0, // Ensure whole numbers don't get forced decimals
    useGrouping: true, // Add commas for thousands
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
  if (num === null || num === undefined || isNaN(num)) {
    return '';
  }

  if (Math.abs(num) < 0.001) {
    return isCurrency ? '$0.00' : '0'; // Return "$0.00" for currency zero, "0" otherwise
  }

  const isNegative = num < 0;
  const absoluteValue = Math.abs(num);

  // This is a .js file, not .ts. Removed TypeScript type annotation.
  const options = {
    style: isCurrency ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: isCurrency ? 2 : 0,
    maximumFractionDigits: isCurrency ? 2 : 5, // Allow 5 for decimal, 2 for currency
    useGrouping: true,
  };

  // @ts-ignore
  let formattedNumber = new Intl.NumberFormat('en-US', options).format(
    absoluteValue
  );

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
  if (num === null || num === undefined || isNaN(num)) {
    return '';
  }

  const percent = num * 100;
  const sign = percent > 0 ? '+' : '';

  return `${sign}${percent.toFixed(2)}%`;
}

// --- ADDED: Missing formatDate function ---
/**
 * Formats a 'YYYY-MM-DD' date string to 'MM/DD/YYYY'.
 * @param {string | null | undefined} dateString - The date string in 'YYYY-MM-DD' format.
 * @returns {string} The formatted date string or '--' if invalid.
 */
export function formatDate(dateString) {
  if (!dateString) return '--';
  try {
    // Split the date to avoid timezone issues with new Date() parsing
    const [year, month, day] = dateString.split('-');
    // Create date in UTC to ensure it's not off by one day
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    );
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC', // Specify UTC to match the input
    });
  } catch {
    return dateString; // Fallback to the original string if formatting fails
  }
}
// --- END ADDED ---
