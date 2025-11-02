const fs = require('fs').promises;
const path = require('path');
const { initializeDatabase } = require('../database');

module.exports = async () => {
  const dbPath = path.join(__dirname, '../test.db');
  process.env.NODE_ENV = 'test';

  try {
    await fs.unlink(dbPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Store the db connection in a global variable
  global.db = await initializeDatabase();
};
