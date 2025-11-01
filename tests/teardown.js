// tests/teardown.js
const fs = require('fs').promises;
const path = require('path');
const { disconnect } = require('../services/priceService'); // Import the disconnect function

// This script runs once after all tests are complete
module.exports = async () => {
  const dbPath = path.join(__dirname, '../test.db');

  // Disconnect the price service to allow Jest to exit gracefully
  await disconnect();

  // Delete the test database
  try {
    await fs.unlink(dbPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};