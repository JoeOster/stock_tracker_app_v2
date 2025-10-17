// jest.config.api.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.api.test.js'], 
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
};