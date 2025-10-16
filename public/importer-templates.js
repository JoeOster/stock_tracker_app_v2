/**
 * @fileoverview This file contains templates for parsing different broker CSV formats.
 * @module public/importer-templates
 */

const importerTemplates = {
    /**
     * @property {object} fidelity - Template for Fidelity brokerage CSVs.
     */
    fidelity: {
        /**
         * @function
         * @name map
         * @description Maps a row from a Fidelity CSV to a standard transaction object.
         * @param {object} row - A single row object from the parsed CSV.
         * @returns {object|null} A standardized transaction object or null if the row is invalid.
         */
        map: (row) => {
            // Check for essential columns to identify a valid transaction row.
            if (!row['Run Date'] || !row['Action'] || !row['Symbol']) {
                return null;
            }
            
            const actionParts = row['Action'].toUpperCase().split(' ');
            // FIX: Check for "BOUGHT" and "SOLD" instead of "BUY" and "SELL".
            const type = actionParts.includes('BOUGHT') ? 'BUY' : (actionParts.includes('SOLD') ? 'SELL' : null);

            // If the action is not a BUY or SELL, skip this row.
            if (!type) {
                return null;
            }

            return {
                holder: 1, // Defaulting to the primary account holder for imports
                transaction_date: new Date(row['Run Date']).toISOString().split('T')[0],
                ticker: row['Symbol'],
                type: type,
                quantity: parseFloat(row['Quantity']),
                price: parseFloat(row['Price ($)']),
                exchange: 'Fidelity', // Set the exchange based on the template
            };
        }
    },
    // Future templates for 'robinhood', 'etrade', etc. would be added here.
};

/**
 * @function getImporterTemplate
 * @description Retrieves the mapping template for a given importer type.
 * @param {string} type - The type of the importer (e.g., 'fidelity').
 * @returns {object|undefined} The template object or undefined if not found.
 */
function getImporterTemplate(type) {
    return importerTemplates[type];
}

// Export the function to make it available to the importer route.
module.exports = { getImporterTemplate };