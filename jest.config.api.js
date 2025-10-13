// jest.config.api.js
module.exports = {
  displayName: 'API',
  testEnvironment: 'node',
  // FIX: Corrected the glob pattern to find all .api.test.js files within the /tests directory.
  testMatch: ['**/tests/**/*.api.test.js'], 
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
};