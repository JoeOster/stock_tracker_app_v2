module.exports = {
  // Default environment for all tests is Node.js (for our API tests)
  testEnvironment: 'node',
  
  // Use a different environment for files matching a specific path
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      globalSetup: './tests/setup.js',
      globalTeardown: './tests/teardown.js',
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/public/**/*.test.js'],
    },
  ],
};

