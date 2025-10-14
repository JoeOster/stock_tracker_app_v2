// jest.config.ui.js
module.exports = {
  displayName: 'UI',
  testEnvironment: 'jsdom',
  // FIX: Update the pattern to find all .test.js files within the /public directory.
  testMatch: ['**/public/**/*.test.js'],
};