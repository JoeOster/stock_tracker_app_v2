const fs = require('fs').promises;
const path = require('path');
const { disconnect } = require('../services/priceService');

module.exports = async () => {
  const dbPath = path.join(__dirname, '../test.db');

  // Close the global database connection
  if (global.db) {
    await global.db.close();
  }

  await disconnect();

  try {
    await fs.unlink(dbPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};
