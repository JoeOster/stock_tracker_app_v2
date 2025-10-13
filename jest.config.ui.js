// jest.config.ui.js
module.exports = {
  displayName: 'UI',
  testEnvironment: 'jsdom',
  // FIX: Update the pattern to find all .ui.test.js files
  testMatch: ['**/public/**/*.ui.test.js'],
};