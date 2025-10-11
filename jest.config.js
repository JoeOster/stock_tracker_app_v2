module.exports = {
  // Set the default environment for all tests to Node.js (for our API tests)
  testEnvironment: 'node',
  
  // A global pattern to find all test files in the project
  testMatch: [
    '**/__tests__/**/*.js?(x)', 
    '**/?(*.)+(spec|test).js?(x)',
    '**/public/ui/**/*.test.js' // <-- Add this line
  ],
  // Tell Jest where to find the setup/teardown scripts for the backend tests
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
};

