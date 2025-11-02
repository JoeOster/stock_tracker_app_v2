// /routes/transaction-helpers.js
/**
 * @file Helper functions for transaction routes.
 * @module routes/transaction-helpers
 */

/**
 * @param {any} number
 */
// JSDOC IS FIXED: ESLint adds the block.
// INDENTATION IS FIXED: Prettier fixes this.
// '===' IS FIXED: ESLint fixes this.
const internalFormatQuantity = (number) => {
  const num = typeof number === "string" ? parseFloat(number) : number;
  if (num === null || num === undefined || isNaN(num)) {
    return "";
  }
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 5,
    minimumFractionDigits: 0,
    useGrouping: true,
  });
  return formatter.format(num);
};

module.exports = {
  internalFormatQuantity,
};
