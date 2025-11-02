// jest.config.ui.js
module.exports = {
  displayName: 'UI',
  testEnvironment: 'jsdom',
  // Ensure this pattern correctly finds all .test.js files within /public
  testMatch: ['**/public/**/*.test.js'],
  // You might need setup files if tests rely on global mocks or setup
  // setupFilesAfterEnv: ['./tests/setupJestDom.js'], // Example if needed
};
