const fs = require('fs').promises;
const path = require('path');
const setupDatabase = require('../database');

// This script runs once before all tests
module.exports = async () => {
const dbPath = path.join(__dirname, '../test.db');
  
  // Set the environment to 'test'
  process.env.NODE_ENV = 'test';

  // Clean up any old test database
  try {
    await fs.unlink(dbPath);
  } catch (error) {
    // It's okay if the file doesn't exist
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Set up a fresh database for the test run.
  // The database.js file will see NODE_ENV=test and use the test DB path.
  const db = await setupDatabase();
  await db.close();
};
