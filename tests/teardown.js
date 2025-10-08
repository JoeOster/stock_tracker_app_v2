const fs = require('fs').promises;
const path = require('path');

// This script runs once after all tests are complete
module.exports = async () => {
  const dbPath = path.join(__dirname, '../test-tracker.db');

  // Delete the test database
  try {
    await fs.unlink(dbPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};
